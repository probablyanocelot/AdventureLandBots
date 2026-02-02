// Farmer-side (non-merchant) unpack requester.
// Sends CM to the merchant/orchestrator when inventory is getting full.
// "Request only" mode: does not auto-send items yet.

const { getConfig } = await require("config.js");
const { info, warn } = await require("util/logger.js");

const makeRequestId = () =>
  `unpack:${Date.now()}:${Math.random().toString(16).slice(2)}`;

const getFreeSlots = () => {
  try {
    // Adventure Land provides character.esize = free inventory slots.
    if (typeof character.esize === "number") return character.esize;
  } catch {
    // ignore
  }

  try {
    const items = character.items;
    if (Array.isArray(items)) return items.filter((i) => !i).length;
  } catch {
    // ignore
  }

  // Unknown; assume we have space.
  return 999;
};

const getLoc = () => ({ map: character.map, x: character.x, y: character.y });

const installUnpackRequester = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastRequestAt: 0,
    inFlightUntil: 0,
    warnedNoMerchant: false,
  };

  const merchantName = cfg?.merchantAssist?.merchantName;

  if (!merchantName) {
    warn(
      "Unpack requester enabled but merchantAssist.merchantName is not set; requester will not run",
    );
    return {
      stop: () => {
        st.stopped = true;
      },
    };
  }

  const requesterEnabled = cfg?.merchantAssist?.requesterEnabled !== false;
  if (!cfg?.merchantAssist?.enabled || !requesterEnabled) {
    info("Unpack requester disabled by config");
    return {
      stop: () => {
        st.stopped = true;
      },
    };
  }

  // Listen for merchant arrival acks.
  try {
    character.on("cm", (m) => {
      try {
        if (!m || m.name !== merchantName) return;
        const data = m.message;
        if (!data || data.cmd !== "unpack:arrived") return;
        st.inFlightUntil = 0;
      } catch {
        // ignore
      }
    });
  } catch {
    // ignore
  }

  const loop = () => {
    if (st.stopped) return;

    try {
      // Never run requester on merchants.
      if (character.ctype === "merchant") {
        st.stopped = true;
        return;
      }

      const threshold = Math.max(
        1,
        Number(cfg?.merchantAssist?.inventoryFreeSlotsThreshold ?? 4),
      );
      const cooldownMs = Math.max(
        5000,
        Number(cfg?.merchantAssist?.requestCooldownMs ?? 45000),
      );

      const free = getFreeSlots();
      const now = Date.now();

      // If we have room again, allow future requests immediately.
      if (free > threshold) {
        st.inFlightUntil = 0;
      }

      // If we're already waiting for a merchant, don't spam.
      if (st.inFlightUntil && now < st.inFlightUntil) return;

      // Send request when low on space.
      if (free <= threshold) {
        if (now - st.lastRequestAt >= cooldownMs) {
          const requestId = makeRequestId();
          st.lastRequestAt = now;
          // In-flight window: if merchant doesn't ack, we still won't spam instantly.
          st.inFlightUntil = now + Math.max(15000, cooldownMs);

          try {
            send_cm(merchantName, {
              cmd: "unpack:request",
              requestId,
              reason: "inventory",
              freeSlots: free,
              loc: getLoc(),
              at: now,
            });

            info(
              "Sent unpack:request",
              requestId,
              "freeSlots",
              free,
              "to",
              merchantName,
            );
          } catch (e) {
            warn("Failed to send unpack:request", e);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setTimeout(loop, 1000);
    }
  };

  loop();

  return {
    stop: () => {
      st.stopped = true;
    },
  };
};

module.exports = {
  installUnpackRequester,
};
