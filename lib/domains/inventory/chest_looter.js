const getChests = () => {
  try {
    return parent?.chests || {};
  } catch {
    return {};
  }
};

const lootChest = (id) => {
  if (!id) return false;
  const chests = getChests();
  if (!chests || !chests[id]) return false;

  try {
    if (typeof globalThis.loot === "function") {
      globalThis.loot(id);
      return true;
    }
  } catch {
    // ignore
  }

  return false;
};

const installChestLooter = ({ intervalMs = 250, seenSet } = {}) => {
  const seen = seenSet instanceof Set ? seenSet : new Set();
  const st = {
    timer: null,
    stopped: false,
  };

  const tick = () => {
    if (st.stopped) return;
    try {
      const chests = getChests();
      if (!chests || typeof chests !== "object") return;

      for (const id of Object.keys(chests)) {
        if (seen.has(id)) continue;
        seen.add(id);
        lootChest(id);
      }
    } catch {
      // ignore
    }
  };

  const start = () => {
    if (st.stopped || st.timer) return;
    st.timer = setInterval(tick, Math.max(50, Number(intervalMs || 250)));
    tick();
  };

  const stop = () => {
    st.stopped = true;
    try {
      if (st.timer) clearInterval(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  start();

  return {
    stop,
    dispose: () => stop(),
    [Symbol.dispose]: () => stop(),
    [Symbol.asyncDispose]: async () => stop(),
  };
};

module.exports = {
  getChests,
  lootChest,
  installChestLooter,
};
