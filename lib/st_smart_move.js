const { now } = await require("./fn_time.js");
const { logCatch } = await require("./al_debug_log.js");
const { isGathering } = await require("./st_bool.js");

const roundCoord = (value) =>
  Number.isFinite(value) ? Math.round(value) : value;

const normalizeDest = (dest) => {
  try {
    if (!dest || typeof dest !== "object") return dest;
    if (!("x" in dest) || !("y" in dest)) return dest;
    return { ...dest, x: roundCoord(dest.x), y: roundCoord(dest.y) };
  } catch (e) {
    logCatch("normalizeDest failed", e);
    return dest;
  }
};

const isCloseToDest = (dest, threshold = 20) => {
  try {
    if (!dest || typeof dest !== "object") return false;
    const hasCoords = Number.isFinite(dest.x) && Number.isFinite(dest.y);
    if (!hasCoords) return false;
    if (dest.map && dest.map !== character.map) return false;

    const cx = roundCoord(character?.x || 0);
    const cy = roundCoord(character?.y || 0);
    const dx = cx - roundCoord(dest.x);
    const dy = cy - roundCoord(dest.y);
    return Math.sqrt(dx * dx + dy * dy) <= threshold;
  } catch (e) {
    logCatch("isCloseToDest failed", e);
    return false;
  }
};

const createMoveManager = () => {
  const state = {
    current: null,
  };

  const clearIfIdle = () => {
    try {
      if (!smart?.moving) state.current = null;
    } catch (e) {
      logCatch("clearIfIdle failed", e);
    }
  };

  const request = ({ dest, key, priority = 1, cooldownMs = 5000 } = {}) => {
    if (!dest || !key) return false;

    try {
      if (smart?.moving) return false;
      if (isGathering()) return false;
    } catch (e) {
      logCatch("request prechecks failed", e);
    }

    const normalizedDest = normalizeDest(dest);

    // Skip requesting smart_move if we're already close enough to the target.
    if (isCloseToDest(normalizedDest)) {
      state.current = { key, priority, at: now() };
      return false;
    }

    clearIfIdle();
    const ts = now();

    if (state.current) {
      if (state.current.key === key && ts - state.current.at < cooldownMs) {
        return false;
      }
      // Only override if higher priority.
      if (priority <= state.current.priority) return false;
    }

    state.current = { key, priority, at: ts };
    try {
      const result = smart_move(normalizedDest);
      if (result && typeof result.then === "function") {
        result.catch(() => {
          logCatch("smart_move promise rejected", normalizedDest);
        });
      }
      return true;
    } catch (e) {
      logCatch("smart_move threw", e);
      return false;
    }
  };

  return { request };
};

module.exports = {
  createMoveManager,
};
