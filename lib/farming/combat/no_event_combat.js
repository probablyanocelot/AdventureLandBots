const now = () => Date.now();

const runCrab = ({ cfg, mover } = {}) => {
  if (smart?.moving) return;
  const nowMs = now();
  if (cfg._lastTinyMove && nowMs - cfg._lastTinyMove < 5000) return;

  try {
    const target = get_nearest_monster?.({ type: "crab" });
    if (target) {
      if (typeof change_target === "function") change_target(target);
      if (typeof can_attack === "function" && can_attack(target))
        attack(target);
      else if (typeof is_in_range === "function" && !is_in_range(target)) {
        if (typeof xmove === "function") xmove(target.x, target.y);
      }
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

    if (!smart?.moving) {
      const nowMs = now();
      if (!cfg._lastHuntMove || nowMs - cfg._lastHuntMove > 5000) {
        cfg._lastHuntMove = nowMs;
        if (mover) {
          mover.request({ dest: target, key: `hunt:${target}`, priority: 2 });
        } else {
          smart_move(target);
        }
      }
    }

    const monster = get_nearest_monster?.({ type: target });
    if (!monster) return;

    if (typeof change_target === "function") change_target(monster);
    if (typeof can_attack === "function" && can_attack(monster))
      attack(monster);
    else if (typeof is_in_range === "function" && !is_in_range(monster)) {
      if (typeof xmove === "function") xmove(monster.x, monster.y);
    }
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
    const monster = get_nearest_monster?.({ type: event.name });
    if (monster) {
      if (typeof change_target === "function") change_target(monster);
      if (typeof can_attack === "function" && can_attack(monster))
        attack(monster);
      else if (typeof is_in_range === "function" && !is_in_range(monster)) {
        if (typeof xmove === "function") xmove(monster.x, monster.y);
      }
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
