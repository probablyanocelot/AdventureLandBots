const { getNearestMonsterOfType, engageMonster } =
  await require("./targeting.js");

const now = () => Date.now();

const runCrab = ({ cfg, mover } = {}) => {
  if (smart?.moving) return;
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

    // Throttle path requests to avoid spamming smart_move/mover.
    const nowMs = now();
    const sameTargetRecently =
      cfg._lastHuntMoveTarget === target &&
      nowMs - (cfg._lastHuntMove || 0) < 8000;

    // If already moving toward something, don't queue more.
    if (smart?.moving) return;

    if (!sameTargetRecently) {
      cfg._lastHuntMove = nowMs;
      cfg._lastHuntMoveTarget = target;

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

    engageMonster(monster);
  } catch {
    // ignore
  }
};

const runWorldEvent = ({ cfg, event, mover } = {}) => {
  if (!event) return;
  if (smart?.moving) return;
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
