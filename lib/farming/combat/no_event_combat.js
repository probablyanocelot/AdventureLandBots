const { getNearestMonsterOfType, engageMonster, isBusyMoving } =
  await require("./targeting.js");

const now = () => Date.now();

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeFrequency = (value) => {
  const n = normalizeNumber(value, 1);
  return Math.max(0.1, n);
};

const getDefinitionStats = (mtype) => {
  try {
    const def = mtype && G?.monsters?.[mtype];
    if (!def) return null;
    return {
      source: "definition",
      hp: normalizeNumber(def.hp, 0),
      attack: normalizeNumber(def.attack, 0),
      armor: normalizeNumber(def.armor || def.resistance, 0),
      frequency: normalizeFrequency(def.frequency || def.attack_speed || 1),
    };
  } catch {
    return null;
  }
};

const getLiveStats = (monster) => {
  try {
    if (!monster) return null;
    return {
      source: "live",
      hp: normalizeNumber(monster.max_hp || monster.hp, 0),
      attack: normalizeNumber(monster.attack, 0),
      armor: normalizeNumber(monster.armor || monster.resistance, 0),
      frequency: normalizeFrequency(
        monster.frequency || monster.attack_speed || 1,
      ),
      level: normalizeNumber(monster.level, null),
    };
  } catch {
    return null;
  }
};

const estimateCombatOutcome = ({ monster, mtype } = {}) => {
  const picked = getLiveStats(monster) || getDefinitionStats(mtype);
  if (!picked) return null;

  const charAttack = Math.max(1, normalizeNumber(character.attack, 1));
  const charArmor = Math.max(0, normalizeNumber(character.armor, 0));
  const charHpPool = Math.max(
    1,
    normalizeNumber(character.max_hp || character.hp, 1),
  );
  const charFreq = normalizeFrequency(character.frequency || 1);

  const targetHp = Math.max(1, picked.hp || 1);
  const targetAttack = Math.max(0, picked.attack || 0);
  const targetArmor = Math.max(0, picked.armor || 0);
  const targetFreq = normalizeFrequency(picked.frequency || 1);

  const damageToMonster = Math.max(1, charAttack - targetArmor);
  const hitsToKill = Math.ceil(targetHp / damageToMonster);
  const timeToKillMs = Math.ceil((hitsToKill / charFreq) * 1000);

  const damageToCharacter =
    targetAttack > 0 ? Math.max(1, targetAttack - charArmor) : 0;
  const hitsToDie = damageToCharacter
    ? Math.ceil(charHpPool / damageToCharacter)
    : Infinity;
  const timeToDieMs =
    hitsToDie === Infinity
      ? Infinity
      : Math.ceil((hitsToDie / targetFreq) * 1000);

  return {
    ...picked,
    damageToMonster,
    damageToCharacter,
    hitsToKill,
    hitsToDie,
    timeToKillMs,
    timeToDieMs,
  };
};

const isDangerousOutcome = (outcome, cfg) => {
  if (!outcome) return false;
  if (!Number.isFinite(outcome.timeToKillMs)) return true;
  if (outcome.hitsToDie !== Infinity && outcome.hitsToDie <= 1) return true;

  const nf = cfg?.noEventFarming || {};
  const minHitBuffer = normalizeNumber(nf.minHuntHitsToDie, 2);
  const marginMs =
    outcome.timeToDieMs === Infinity
      ? Infinity
      : outcome.timeToDieMs - outcome.timeToKillMs;

  if (
    outcome.hitsToDie !== Infinity &&
    outcome.hitsToDie <= minHitBuffer &&
    marginMs < 0
  )
    return true;

  return marginMs < -1200;
};

const broadcastHuntDanger = ({ cfg, target, estimate }) => {
  const nowMs = now();
  if (cfg._lastHuntHelpRequest && nowMs - cfg._lastHuntHelpRequest < 5000)
    return;
  cfg._lastHuntHelpRequest = nowMs;

  try {
    const party = parent?.party;
    if (!party) return;
    for (const name of Object.keys(party)) {
      if (name === character.name) continue;
      try {
        send_cm(name, {
          cmd: "farm:hunt_danger",
          target,
          estimate,
          from: character.name,
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
};

const runCrab = ({ cfg, mover } = {}) => {
  if (isBusyMoving()) return;
  const nowMs = now();
  if (cfg._lastTinyMove && nowMs - cfg._lastTinyMove < 5000) return;

  try {
    const target = getNearestMonsterOfType("crab");
    if (target) {
      engageMonster(target);
      return;
    }
  } catch {
    // ignore
  }

  cfg._lastTinyMove = nowMs;
  if (mover) {
    mover.request({ dest: "crab", key: "crab", priority: 1 });
  } else {
    try {
      smart_move("crab");
    } catch {
      // ignore
    }
  }
};

const runMonsterhunt = ({ cfg, targetOverride, getTarget, mover } = {}) => {
  try {
    const target =
      typeof targetOverride === "string"
        ? targetOverride
        : typeof getTarget === "function"
          ? getTarget()
          : null;
    if (!target) return;

    // Pre-emptive estimate using static data (may be inaccurate if monster leveled).
    const defEstimate = estimateCombatOutcome({ mtype: target });
    if (defEstimate)
      cfg._lastHuntEstimate = { target, ...defEstimate, at: now() };

    // Throttle path requests to avoid spamming smart_move/mover.
    const nowMs = now();
    const sameTarget = cfg._lastHuntMoveTarget === target;
    const sameMap = cfg._lastHuntMoveMap === character.map;
    const recentWindow = sameMap ? 20000 : 8000;
    const sameTargetRecently =
      sameTarget && nowMs - (cfg._lastHuntMove || 0) < recentWindow;

    // If already moving toward something (or gathering), don't queue more.
    if (isBusyMoving()) return;

    if (!sameTargetRecently) {
      cfg._lastHuntMove = nowMs;
      cfg._lastHuntMoveTarget = target;
      cfg._lastHuntMoveMap = character.map;

      if (mover) {
        mover.request({ dest: target, key: `hunt:${target}`, priority: 2 });
      } else {
        try {
          smart_move(target);
        } catch {
          // ignore
        }
      }
    }

    const monster = getNearestMonsterOfType(target);
    if (!monster) return;

    const liveEstimate = estimateCombatOutcome({ monster, mtype: target });
    if (liveEstimate) {
      cfg._lastHuntEstimate = { target, ...liveEstimate, at: now() };

      if (isDangerousOutcome(liveEstimate, cfg)) {
        cfg._lastHuntDanger = { target, estimate: liveEstimate, at: now() };
        broadcastHuntDanger({ cfg, target, estimate: liveEstimate });
        return; // Skip engaging until help arrives or assignment changes.
      }
    }

    engageMonster(monster);
  } catch {
    // ignore
  }
};

const runWorldEvent = ({ cfg, event, mover } = {}) => {
  if (!event) return;
  if (isBusyMoving()) return;
  const nowMs = now();
  if (cfg._lastWorldMove && nowMs - cfg._lastWorldMove < 5000) return;

  try {
    const monster = getNearestMonsterOfType(event.name);
    if (monster) {
      engageMonster(monster);
      return;
    }
  } catch {
    // ignore
  }

  cfg._lastWorldMove = nowMs;
  if (mover) {
    mover.request({
      dest: { map: event.map, x: event.x, y: event.y },
      key: `world:${event.name}`,
      priority: 3,
    });
  } else {
    try {
      smart_move({ map: event.map, x: event.x, y: event.y });
    } catch {
      // ignore
    }
  }
};

const runMageSupport = ({ assigned } = {}) => {
  if (assigned) return;
  try {
    if (is_on_cooldown("energize")) return;
    const party = parent?.party;
    if (!party) return;
    const names = Object.keys(party).filter((n) => n !== character.name);
    for (const name of names) {
      const p = get_player?.(name);
      if (!p) continue;
      if (character.map !== p.map) continue;
      if (distance(character, p) > 250) continue;
      if (character.mp < (G.skills.energize?.mp ?? 0)) continue;
      use_skill("energize", p);
      break;
    }
  } catch {
    // ignore
  }
};

module.exports = {
  runCrab,
  runMonsterhunt,
  runWorldEvent,
  runMageSupport,
};
