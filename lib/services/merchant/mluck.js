const DEFAULT_RADIUS = 320;
const DEFAULT_REFRESH_THRESHOLD_MS = 50 * 60 * 1000;

const normalizeRadius = (value) => {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return DEFAULT_RADIUS;
  return Math.max(50, radius);
};

const normalizeRefreshThreshold = (value) => {
  const ms = Number(value);
  if (!Number.isFinite(ms)) return DEFAULT_REFRESH_THRESHOLD_MS;
  return Math.max(1000, ms);
};

const createMluckSupport = ({
  enabled = true,
  range = DEFAULT_RADIUS,
  refreshMsThreshold = DEFAULT_REFRESH_THRESHOLD_MS,
} = {}) => {
  const st = {
    enabled: enabled !== false,
    range: normalizeRadius(range),
    refreshMsThreshold: normalizeRefreshThreshold(refreshMsThreshold),
    watched: new Set(),
    refreshed: new Set(),
  };

  const tryCastMluck = (target) => {
    if (!target) return false;

    try {
      if (typeof can_use === "function" && !can_use("mluck", target)) {
        return false;
      }
      use_skill("mluck", target);
      return true;
    } catch {
      return false;
    }
  };

  const apply = () => {
    try {
      if (!st.enabled) return;
      if (typeof is_on_cooldown === "function" && is_on_cooldown("mluck"))
        return;
      if (!parent || !parent.entities || !character) return;

      const nowNearby = new Set();

      for (const id in parent.entities) {
        const player = parent.entities[id];
        if (!player || player.type !== "character") continue;
        if (player.name === character.name) continue;

        const dist =
          typeof parent.distance === "function"
            ? parent.distance(character, player)
            : Infinity;
        if (dist > st.range) continue;

        nowNearby.add(player.name);

        const hasMluck = Boolean(player.s?.mluck);
        const hasStrongMluck = Boolean(player.s?.mluck?.strong);
        const selfLuck = hasMluck && player.s.mluck.f === character.name;
        const expiresSoon =
          selfLuck && Number(player.s.mluck.ms || 0) <= st.refreshMsThreshold;

        if (expiresSoon) {
          if (!st.refreshed.has(player.name)) {
            tryCastMluck(player);
            st.refreshed.add(player.name);
          }
        } else {
          st.refreshed.delete(player.name);
        }

        if (!hasMluck || !hasStrongMluck) {
          if (!st.watched.has(player.name)) {
            tryCastMluck(player);
            st.watched.add(player.name);
          }
        } else {
          st.watched.delete(player.name);
        }
      }

      for (const name of Array.from(st.watched)) {
        if (!nowNearby.has(name)) st.watched.delete(name);
      }
      for (const name of Array.from(st.refreshed)) {
        if (!nowNearby.has(name)) st.refreshed.delete(name);
      }
    } catch {
      // ignore errors so merchant loop keeps running
    }
  };

  const stopRoutine = () => {
    st.watched.clear();
    st.refreshed.clear();
  };

  const setRange = (rangePx) => {
    st.range = normalizeRadius(rangePx);
  };

  return {
    apply,
    stopRoutine,
    setRange,
  };
};

const defaultMluckSupport = createMluckSupport();

const applyMluckToNearbyPlayers = (radius = DEFAULT_RADIUS) => {
  defaultMluckSupport.setRange(radius);
  defaultMluckSupport.apply();
};

module.exports = {
  createMluckSupport,
  applyMluckToNearbyPlayers,
};
