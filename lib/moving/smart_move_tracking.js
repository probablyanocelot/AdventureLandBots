const { now } = await require("../util/time.js");

const isGathering = () => {
  try {
    const c = character?.c || {};
    return Boolean(c.fishing || c.mining);
  } catch {
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
    } catch {
      // ignore
    }
  };

  const request = ({ dest, key, priority = 1, cooldownMs = 5000 } = {}) => {
    if (!dest || !key) return false;

    try {
      if (smart?.moving) return false;
      if (isGathering()) return false;
    } catch {
      // ignore
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
      const result = smart_move(dest);
      if (result && typeof result.then === "function") {
        result.catch(() => {
          // ignore
        });
      }
      return true;
    } catch {
      return false;
    }
  };

  return { request };
};

module.exports = {
  createMoveManager,
};
