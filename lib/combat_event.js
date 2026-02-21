const { getConfig } = await require("./al_config.js");
const { isJoinableEvent } = await require("./fn_server_events.js");
const { warn } = await require("./al_debug_log.js");

const getPartyNames = () => {
  const names = new Set();
  try {
    if (character?.name) names.add(character.name);
  } catch {
    // ignore
  }
  try {
    const party = parent?.party;
    if (party && typeof party === "object") {
      for (const name of Object.keys(party)) names.add(name);
    }
  } catch {
    // ignore
  }
  return names;
};

const getPartyAnchor = () => {
  try {
    const party = parent?.party;
    if (!party || typeof party !== "object") return null;

    let best = null;
    let bestDist = Infinity;

    for (const name of Object.keys(party)) {
      if (!name || name === character?.name) continue;
      const p = get_player?.(name);
      if (!p || p.rip) continue;
      if (p.map && character?.map && p.map !== character.map) continue;

      const dist =
        typeof distance === "function" ? distance(character, p) : Infinity;

      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }

    return best;
  } catch {
    return null;
  }
};

const moveTowards = (x, y) => {
  try {
    if (smart?.moving) return false;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (typeof xmove !== "function") return false;
    xmove(x, y);
    return true;
  } catch {
    return false;
  }
};

const getMonsterTargetName = (monster) => {
  if (!monster) return null;
  try {
    if (typeof get_target_of === "function") {
      const target = get_target_of(monster);
      if (target?.name) return target.name;
      if (target?.id) return target.id;
    }
  } catch {
    // ignore
  }
  try {
    if (monster?.target) return monster.target;
  } catch {
    // ignore
  }
  return null;
};

const isCrabxx = (monster) =>
  Boolean(
    monster &&
    monster.type === "monster" &&
    (monster.mtype === "crabxx" || monster.id === "crabxx"),
  );

const getCrabRaveTarget = () => {
  const partyNames = getPartyNames();
  const isOutsideParty = (name) => name && !partyNames.has(name);

  const isValidCrabxx = (monster) =>
    Boolean(monster && monster.visible && !monster.dead && isCrabxx(monster));

  const isCrabxxTargetingOutside = (monster) =>
    isOutsideParty(getMonsterTargetName(monster));

  try {
    const current = get_targeted_monster?.();
    if (isValidCrabxx(current) && isCrabxxTargetingOutside(current))
      return current;
  } catch {
    // ignore
  }

  try {
    const entities = parent?.entities || {};
    let best = null;
    let bestDist = Infinity;
    for (const id in entities) {
      const monster = entities[id];
      if (!isValidCrabxx(monster)) continue;
      if (!isCrabxxTargetingOutside(monster)) continue;

      if (typeof distance === "function") {
        const dist = distance(character, monster);
        if (dist < bestDist) {
          best = monster;
          bestDist = dist;
        }
      } else if (!best) {
        best = monster;
      }
    }
    return best;
  } catch {
    return null;
  }
};

const isInJoinableEvent = () => {
  try {
    return Boolean(character.in && isJoinableEvent(character.in));
  } catch {
    return false;
  }
};

const pickTarget = () => {
  try {
    if (character?.in === "crabrave") return getCrabRaveTarget();
  } catch {
    // ignore
  }

  try {
    const current = get_targeted_monster?.();
    if (current && current.visible && !current.dead) return current;
  } catch {
    // ignore
  }

  try {
    return get_nearest_monster?.({
      no_target: false,
      path_check: false,
    });
  } catch {
    return null;
  }
};

const tryAttack = (target) => {
  if (!target) return;

  try {
    if (typeof change_target === "function") change_target(target);
  } catch {
    // ignore
  }

  try {
    if (typeof can_attack === "function" && can_attack(target)) {
      attack(target);
      return;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof is_in_range === "function" && !is_in_range(target)) {
      if (!smart?.moving && typeof xmove === "function") {
        xmove(target.x, target.y);
      }
    }
  } catch {
    // ignore
  }
};

const tryPotions = () => {
  try {
    if (typeof use_hp_or_mp === "function") use_hp_or_mp();
  } catch {
    // ignore
  }
};

const installEventCombat = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastRepositionAt: 0,
  };

  const tick = async () => {
    if (st.stopped) return;

    try {
      if (!cfg?.eventCombat?.enabled && cfg?.eventCombat?.enabled !== undefined)
        return;

      if (character?.ctype === "merchant") return;
      if (character?.rip) return;

      if (!isInJoinableEvent()) return;

      // Avoid fighting while smart_move is in progress (usually travelling).
      if (smart?.moving) return;

      tryPotions();

      const target = pickTarget();
      if (target) {
        tryAttack(target);
        return;
      }

      // No target in view yet: reposition to acquire event mobs.
      const nowMs = Date.now();
      if (nowMs - st.lastRepositionAt < 1000) return;
      st.lastRepositionAt = nowMs;

      // 1) Follow the nearest visible party member in the same map.
      const anchor = getPartyAnchor();
      if (anchor && typeof distance === "function") {
        const dist = distance(character, anchor);
        if (dist > 120) {
          moveTowards(anchor.x, anchor.y);
          return;
        }
      }

      // 2) Fallback: nudge toward first spawn on the event map.
      try {
        const mapDef = G?.maps?.[character?.map];
        const firstSpawn = Array.isArray(mapDef?.spawns)
          ? mapDef.spawns[0]
          : null;
        if (Array.isArray(firstSpawn) && firstSpawn.length >= 2) {
          moveTowards(firstSpawn[0], firstSpawn[1]);
        }
      } catch {
        // ignore
      }
    } catch (e) {
      warn("Event combat tick error", e);
    } finally {
      setTimeout(tick, 250);
    }
  };

  tick();

  return {
    stop: () => {
      st.stopped = true;
    },
  };
};

module.exports = {
  installEventCombat,
};
