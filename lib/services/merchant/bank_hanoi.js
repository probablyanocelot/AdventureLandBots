const DEFAULT_INTERVAL_MS = 30000;

// TODO: put actual hanoi algorithm in helpers/ in case there are more use cases for it in the future

const findCompactionMove = (items = []) => {
  let left = 0;
  let right = items.length - 1;

  while (left < right) {
    while (left < items.length && items[left]) left += 1;
    while (right >= 0 && !items[right]) right -= 1;
    if (left < right) {
      return {
        from: right,
        to: left,
      };
    }
  }

  return null;
};

const moveBankSlot = async ({ pack, from, to }) => {
  if (!pack) return false;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
  if (from === to) return false;

  try {
    if (typeof bank_swap === "function") {
      await bank_swap(pack, from, to);
      return true;
    }

    if (typeof parent?.socket?.emit === "function") {
      parent.socket.emit("bank", {
        operation: "move",
        pack,
        a: from,
        b: to,
      });
      return true;
    }
  } catch {
    // ignore
  }

  return false;
};

const createBankHanoi = ({
  enabled = false,
  intervalMs = DEFAULT_INTERVAL_MS,
} = {}) => {
  const st = {
    enabled: Boolean(enabled),
    intervalMs: Math.max(1000, Number(intervalMs || DEFAULT_INTERVAL_MS)),
    lastRunAt: 0,
  };

  const tick = async () => {
    try {
      if (!st.enabled) return false;
      if (!character?.bank || typeof character.bank !== "object") return false;

      const now = Date.now();
      if (now - st.lastRunAt < st.intervalMs) return false;
      st.lastRunAt = now;

      for (const [pack, items] of Object.entries(character.bank)) {
        if (!Array.isArray(items)) continue;
        const move = findCompactionMove(items);
        if (!move) continue;

        const ok = await moveBankSlot({
          pack,
          from: move.from,
          to: move.to,
        });
        if (ok) return true;
      }
    } catch {
      // ignore
    }

    return false;
  };

  const stopRoutine = () => {
    st.lastRunAt = 0;
  };

  return {
    tick,
    stopRoutine,
  };
};

module.exports = {
  createBankHanoi,
};
