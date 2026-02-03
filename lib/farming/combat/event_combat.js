const { getConfig } = await require("../../config.js");
const { isJoinableEvent } = await require("../../routines/magiport.js");
const { warn } = await require("../../util/logger.js");

const isInJoinableEvent = () => {
  try {
    return Boolean(character.in && isJoinableEvent(character.in));
  } catch {
    return false;
  }
};

const pickTarget = () => {
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
      if (!target) return;
      tryAttack(target);
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
