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

const destSignature = (dest) => {
  try {
    if (typeof dest === "string") return `name:${dest}`;
    if (!dest || typeof dest !== "object") return String(dest);
    const map = typeof dest.map === "string" ? dest.map : "";
    const x = Number.isFinite(dest.x) ? roundCoord(dest.x) : "";
    const y = Number.isFinite(dest.y) ? roundCoord(dest.y) : "";
    if (map || x !== "" || y !== "") return `pt:${map}:${x}:${y}`;
    return `obj:${JSON.stringify(dest)}`;
  } catch {
    return String(dest);
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
    lastByKey: new Map(),
    lastByDest: new Map(),
  };

  const pruneOldKeys = (ts) => {
    try {
      for (const [key, at] of state.lastByKey.entries()) {
        if (!Number.isFinite(at) || ts - at > 120000) {
          state.lastByKey.delete(key);
        }
      }
      for (const [sig, at] of state.lastByDest.entries()) {
        if (!Number.isFinite(at) || ts - at > 120000) {
          state.lastByDest.delete(sig);
        }
      }
    } catch (e) {
      logCatch("pruneOldKeys failed", e);
    }
  };

  const request = ({ dest, key, priority = 1, cooldownMs = 5000 } = {}) => {
    if (!dest || !key) return false;

    const ts = now();
    pruneOldKeys(ts);

    const lastAt = Number(state.lastByKey.get(key) || 0);
    if (ts - lastAt < cooldownMs) return false;

    try {
      if (isGathering()) return false;
    } catch (e) {
      logCatch("request prechecks failed", e);
    }

    const normalizedDest = normalizeDest(dest);
    const sig = destSignature(normalizedDest);
    const destLastAt = Number(state.lastByDest.get(sig) || 0);
    const destCooldownMs = Math.max(1200, Math.min(cooldownMs, 6000));
    if (ts - destLastAt < destCooldownMs) return false;

    // Skip requesting smart_move if we're already close enough to the target.
    if (isCloseToDest(normalizedDest)) {
      return false;
    }

    try {
      if (smart?.moving && state.current) {
        if (state.current.key === key) {
          state.lastByKey.set(key, ts);
          state.lastByDest.set(sig, ts);
          return false;
        }
        // Only override an active path if higher priority.
        if (priority <= state.current.priority) {
          state.lastByKey.set(key, ts);
          state.lastByDest.set(sig, ts);
          return false;
        }
      }
    } catch (e) {
      logCatch("request active-move check failed", e);
    }

    if (state.current && state.current.key === key) {
      if (ts - state.current.at < cooldownMs) {
        state.lastByKey.set(key, ts);
        state.lastByDest.set(sig, ts);
        return false;
      }
    }

    state.lastByKey.set(key, ts);
    state.lastByDest.set(sig, ts);
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
