const { isBusyMoving } = await require("./st_bool.js");
const { getNearestMonsterOfType, engageMonster } =
  await require("./combat_targeting.js");
const { now } = await require("./fn_time.js");
const { info } = await require("./al_debug_log.js");

const dbgState = new Map();
const isDebugEnabled = (cfg) =>
  Boolean(cfg?.debug?.combat || globalThis.AL_BOTS_DEBUG_COMBAT);

const dbg = (cfg, key, message, data = null, cooldownMs = 1200) => {
  try {
    if (!isDebugEnabled(cfg)) return;
    const ts = now();
    const last = dbgState.get(key) || 0;
    if (ts - last < cooldownMs) return;
    dbgState.set(key, ts);
    info(`[combat] ${message}`, data || "");
  } catch {
    // ignore
  }
};

const stopSmartMove = ({ cfg, reason, data } = {}) => {
  try {
    if (!smart?.moving) return;
    if (typeof stop === "function") stop("smart");
    dbg(
      cfg,
      `stop:${reason || "unknown"}`,
      `stop smart_move (${reason})`,
      data,
    );
  } catch {
    // ignore
  }
};

const isNearPoint = ({ map, x, y } = {}, threshold = 60) => {
  try {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (map && character?.map && map !== character.map) return false;
    if (typeof distance !== "function") return false;
    return distance(character, { x, y }) <= threshold;
  } catch {
    return false;
  }
};

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeFrequency = (value) => {
  const n = normalizeNumber(value, 1);
  return Math.max(0.1, n);
};

const getMonsterTargetingName = (name, preferredMtype = null) => {
  try {
    if (!name) return null;
    const entities = parent?.entities;
    if (!entities || !character) return null;

    let best = null;
    let bestDistance = Infinity;
    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster" || entity.dead) continue;
      if (entity.target !== name) continue;
      if (preferredMtype && entity.mtype !== preferredMtype) continue;

      const d = parent.distance?.(character, entity);
      const dist = Number.isFinite(d) ? d : Infinity;
      if (dist < bestDistance) {
        best = entity;
        bestDistance = dist;
      }
    }

    return best;
  } catch {
    return null;
  }
};

const getOwnCharacterNamesSet = () => {
  const out = new Set([character?.name].filter(Boolean));
  try {
    const chars = get_characters?.();
    if (Array.isArray(chars)) {
      for (const c of chars) {
        if (c?.name) out.add(c.name);
      }
    }
  } catch {
    // ignore
  }
  return out;
};

const getPlayerEntitySafe = (name) => {
  try {
    if (!name) return null;
    if (name === character?.name) return character;
    return get_player?.(name) || null;
  } catch {
    return null;
  }
};

const isHuntGroupArrived = ({
  huntGroupNames = [],
  anchor,
  radius = 220,
} = {}) => {
  try {
    if (!anchor || !Array.isArray(huntGroupNames) || !huntGroupNames.length)
      return false;

    for (const name of huntGroupNames) {
      const p = getPlayerEntitySafe(name);
      if (!p || p.rip) return false;
      if (p.map && character?.map && p.map !== character.map) return false;
      const d = distance?.(p, anchor);
      if (!Number.isFinite(d) || d > radius) return false;
    }

    return true;
  } catch {
    return false;
  }
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

const runMonsterhunt = ({
  cfg,
  targetOverride,
  getTarget,
  mover,
  rallyPoint,
  focusAllyName,
  huntGroupNames,
} = {}) => {
  try {
    const target =
      typeof targetOverride === "string"
        ? targetOverride
        : typeof getTarget === "function"
          ? getTarget()
          : null;
    if (!target) return;

    const nowMs = now();

    const focusMonster =
      getMonsterTargetingName(focusAllyName, target) ||
      getMonsterTargetingName(focusAllyName);
    if (focusMonster) {
      if (smart?.moving) {
        stopSmartMove({
          cfg,
          reason: "hunt_assist_target_visible",
          data: { target, focusAllyName, id: focusMonster?.id },
        });
      }
      engageMonster(focusMonster);
      return;
    }

    // Pre-emptive estimate using static data (may be inaccurate if monster leveled).
    const defEstimate = estimateCombatOutcome({ mtype: target });
    if (defEstimate) {
      cfg._lastHuntEstimate = { target, ...defEstimate, at: nowMs };
      // If the static definition already looks dangerous, don't start bouncing between spawns.
      if (isDangerousOutcome(defEstimate, cfg)) {
        cfg._lastHuntDanger = { target, estimate: defEstimate, at: nowMs };
        dbg(
          cfg,
          `hunt_danger:def:${target}`,
          "hunt paused: dangerous by definition",
          {
            target,
            hitsToDie: defEstimate.hitsToDie,
            hitsToKill: defEstimate.hitsToKill,
          },
          2500,
        );
        broadcastHuntDanger({ cfg, target, estimate: defEstimate });
        return;
      }
    }

    const dangerRecent =
      cfg._lastHuntDanger &&
      cfg._lastHuntDanger.target === target &&
      nowMs - cfg._lastHuntDanger.at < 30000;

    // If we've recently determined this hunt is too dangerous, pause instead of re-pathing endlessly.
    if (dangerRecent) {
      dbg(
        cfg,
        `hunt_danger:recent:${target}`,
        "hunt paused: recent danger window",
        { target },
        2500,
      );
      return;
    }

    // Throttle path requests to avoid spamming smart_move/mover.
    const sameTarget = cfg._lastHuntMoveTarget === target;
    const sameMap = cfg._lastHuntMoveMap === character.map;
    const recentWindow = sameMap ? 20000 : 8000;
    const sameTargetRecently =
      sameTarget && nowMs - (cfg._lastHuntMove || 0) < recentWindow;

    const monster = getNearestMonsterOfType(target);

    // We reached/arrived enough to see the target pack: stop pathing and engage.
    if (monster && smart?.moving) {
      stopSmartMove({ cfg, reason: "hunt_target_visible", data: { target } });
    }

    // If already moving toward something (or gathering), don't queue more.
    if (isBusyMoving()) return;

    if (!monster && rallyPoint && !isNearPoint(rallyPoint, 90)) {
      if (mover) {
        const requested = mover.request({
          dest: { map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y },
          key: `hunt:rally:${target}`,
          priority: 2,
          cooldownMs: 2500,
        });
        dbg(
          cfg,
          `hunt_rally:${target}`,
          "queued hunt rally move",
          { target, rallyPoint, via: "mover", requested },
          1200,
        );
      } else {
        try {
          smart_move({ map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y });
          dbg(
            cfg,
            `hunt_rally:${target}`,
            "queued hunt rally move",
            { target, rallyPoint, via: "smart_move" },
            1200,
          );
        } catch {
          // ignore
        }
      }
      return;
    }

    if (!sameTargetRecently) {
      cfg._lastHuntMove = nowMs;
      cfg._lastHuntMoveTarget = target;
      cfg._lastHuntMoveMap = character.map;

      if (mover) {
        const requested = mover.request({
          dest: target,
          key: `hunt:${target}`,
          priority: 2,
        });
        dbg(
          cfg,
          `hunt_move:${target}`,
          "queued hunt move",
          { target, via: "mover", requested },
          1500,
        );
      } else {
        try {
          smart_move(target);
          dbg(
            cfg,
            `hunt_move:${target}`,
            "queued hunt move",
            { target, via: "smart_move" },
            1500,
          );
        } catch {
          // ignore
        }
      }
    }

    if (!monster) return;

    const targetAttack = normalizeNumber(
      monster?.attack,
      normalizeNumber(G?.monsters?.[target]?.attack, 0),
    );
    const lowAttackThreshold = normalizeNumber(
      cfg?.noEventFarming?.lowAttack,
      0,
    );
    const isHardTarget = targetAttack > lowAttackThreshold;
    const groupArrivalRadius = Math.max(
      80,
      normalizeNumber(cfg?.noEventFarming?.huntGroupArrivalRadius, 220),
    );
    const groupArrived = isHuntGroupArrived({
      huntGroupNames,
      anchor: monster,
      radius: groupArrivalRadius,
    });

    if (isHardTarget && !groupArrived) {
      dbg(
        cfg,
        `hunt_wait_group:${target}`,
        "hard target: waiting for hunt group before engage",
        {
          target,
          attack: targetAttack,
          lowAttackThreshold,
          groupArrivalRadius,
          huntGroupNames,
        },
        1400,
      );

      if (rallyPoint && !isNearPoint(rallyPoint, 90)) {
        if (mover) {
          mover.request({
            dest: { map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y },
            key: `hunt:rally_wait:${target}`,
            priority: 2,
            cooldownMs: 2000,
          });
        } else {
          try {
            smart_move({
              map: rallyPoint.map,
              x: rallyPoint.x,
              y: rallyPoint.y,
            });
          } catch {
            // ignore
          }
        }
      }

      return;
    }

    dbg(
      cfg,
      `hunt_engage:${target}`,
      "engaging hunt target",
      { target, id: monster?.id },
      1000,
    );

    const liveEstimate = estimateCombatOutcome({ monster, mtype: target });
    if (liveEstimate) {
      cfg._lastHuntEstimate = { target, ...liveEstimate, at: now() };

      if (isDangerousOutcome(liveEstimate, cfg)) {
        cfg._lastHuntDanger = { target, estimate: liveEstimate, at: now() };
        dbg(
          cfg,
          `hunt_danger:live:${target}`,
          "hunt paused: dangerous live estimate",
          {
            target,
            id: monster?.id,
            hitsToDie: liveEstimate.hitsToDie,
            hitsToKill: liveEstimate.hitsToKill,
          },
          2500,
        );
        broadcastHuntDanger({ cfg, target, estimate: liveEstimate });
        return; // Skip engaging until help arrives or assignment changes.
      }
    }

    engageMonster(monster, {
      skillOptions: {
        disableMultiTarget: isHardTarget,
      },
    });
  } catch {
    // ignore
  }
};

const runWorldEvent = ({ cfg, event, mover } = {}) => {
  if (!event) return;

  // If we've arrived at event coordinates, stop smart pathing so combat can take over.
  if (smart?.moving && isNearPoint(event, 75)) {
    stopSmartMove({
      cfg,
      reason: "world_arrival_radius",
      data: { event: event.name, map: event.map },
    });
  }

  const monster = getNearestMonsterOfType(event.name);

  // If event mob is visible, stop smart movement and engage immediately.
  if (monster && smart?.moving) {
    stopSmartMove({
      cfg,
      reason: "world_target_visible",
      data: { event: event.name, id: monster?.id },
    });
  }

  if (isBusyMoving()) return;

  const nowMs = now();
  if (cfg._lastWorldMove && nowMs - cfg._lastWorldMove < 5000) return;

  if (monster) {
    dbg(
      cfg,
      `world_engage:${event.name}`,
      "engaging world target",
      { event: event.name, id: monster?.id },
      1000,
    );
    engageMonster(monster);
    return;
  }

  dbg(
    cfg,
    `world_no_target:${event.name}`,
    "world event: no target visible; moving to event point",
    { event: event.name, map: event.map, x: event.x, y: event.y },
    2000,
  );

  cfg._lastWorldMove = nowMs;
  if (mover) {
    const requested = mover.request({
      dest: { map: event.map, x: event.x, y: event.y },
      key: `world:${event.name}`,
      priority: 3,
    });
    dbg(
      cfg,
      `world_move:${event.name}`,
      "queued world-event move",
      { event: event.name, via: "mover", requested },
      1500,
    );
  } else {
    try {
      smart_move({ map: event.map, x: event.x, y: event.y });
      dbg(
        cfg,
        `world_move:${event.name}`,
        "queued world-event move",
        { event: event.name, via: "smart_move" },
        1500,
      );
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

const runPriestSupport = ({ cfg } = {}) => {
  try {
    if (character?.ctype !== "priest") return;
    if (character?.rip) return;

    const party = parent?.party;
    if (!party) return;

    const ownNames = getOwnCharacterNamesSet();

    const healSkill = G?.skills?.heal || {};
    const groupHealSkill = G?.skills?.groupheal || {};
    const healRange = normalizeNumber(healSkill.range, 320);
    const healMp = normalizeNumber(healSkill.mp, 0);
    const groupRange = normalizeNumber(groupHealSkill.range, healRange);
    const groupMp = normalizeNumber(groupHealSkill.mp, 0);

    const mod = normalizeNumber(
      cfg?.noEventFarming?.priestGroupHealOutputMod,
      0.7,
    );
    const groupHealEstimate = Math.max(
      1,
      normalizeNumber(groupHealSkill.output, character?.heal * mod),
    );
    const minGroupTargets = Math.max(
      2,
      Math.floor(
        normalizeNumber(cfg?.noEventFarming?.priestGroupHealMinTargets, 2),
      ),
    );

    const partyNames = new Set([character.name, ...Object.keys(party)]);
    const injured = [];
    for (const name of partyNames) {
      const entity = name === character.name ? character : get_player?.(name);
      if (!entity) continue;
      if (entity?.map && character?.map && entity.map !== character.map)
        continue;

      const maxHp = normalizeNumber(entity.max_hp, 0);
      const hp = normalizeNumber(entity.hp, maxHp);
      const missing = Math.max(0, maxHp - hp);
      if (missing <= 0) continue;

      const d =
        name === character.name
          ? 0
          : normalizeNumber(distance?.(character, entity), Infinity);

      injured.push({
        name,
        entity,
        missing,
        ratio: maxHp > 0 ? hp / maxHp : 1,
        dist: d,
        isOwn: ownNames.has(name),
      });
    }

    if (!injured.length) return;

    const groupCandidates = injured.filter(
      (it) => it.dist <= groupRange && it.missing >= groupHealEstimate * 0.45,
    );
    const groupTotalMissing = groupCandidates.reduce(
      (sum, it) => sum + it.missing,
      0,
    );

    if (
      !is_on_cooldown("groupheal") &&
      character.mp >= groupMp &&
      (groupCandidates.length >= minGroupTargets ||
        groupTotalMissing >= groupHealEstimate * (minGroupTargets + 0.5))
    ) {
      use_skill("groupheal");
      return;
    }

    if (is_on_cooldown("heal") || character.mp < healMp) return;

    const singleCandidates = injured
      .filter((it) => it.dist <= healRange)
      .sort((a, b) => {
        if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
        if (a.ratio !== b.ratio) return a.ratio - b.ratio;
        if (a.missing !== b.missing) return b.missing - a.missing;
        return a.dist - b.dist;
      });

    const target = singleCandidates[0];
    if (!target) return;
    use_skill("heal", target.entity || target.name);
  } catch {
    // ignore
  }
};

module.exports = {
  runCrab,
  runMonsterhunt,
  runWorldEvent,
  runMageSupport,
  runPriestSupport,
};
