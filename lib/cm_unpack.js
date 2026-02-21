// Farmer-side (non-merchant) unpack requester.
// Sends CM to the merchant/orchestrator when inventory is getting full.
// "Request only" mode: does not auto-send items yet.

const { getConfig } = await require("./al_config.js");
const { info, warn } = await require("./al_debug_log.js");
const { isNearby } = await require("./st_bool.js");
const { onCharacter } = await require("./event_listeners.js");
const { getLoc } = await require("./fn_loc.js");
const { now } = await require("./fn_time.js");

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

const isPotionItem = (item) => {
  if (!item || !item.name) return false;
  try {
    const def = G?.items?.[item.name];
    if (def && def.type === "pot") return true;
  } catch {
    // ignore
  }
  return item.name.startsWith("hpot") || item.name.startsWith("mpot");
};

const getSendableItemSlots = () => {
  const out = [];
  try {
    const items = character.items;
    if (!Array.isArray(items)) return out;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      if (item.l || item.locked) continue;
      if (isPotionItem(item)) continue;
      out.push(i);
    }
  } catch {
    // ignore
  }
  return out;
};

const installUnpackRequester = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastRequestAt: 0,
    inFlightUntil: 0,
    warnedNoMerchant: false,
    activeRequestId: null,
    pendingSend: false,
    lastSendAt: 0,
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
  onCharacter("cm", (m) => {
    try {
      if (!m || m.name !== merchantName) return;
      const data = m.message;
      if (!data || data.cmd !== "unpack:arrived") return;
      st.inFlightUntil = 0;
      st.pendingSend = true;
      st.activeRequestId = data.requestId || st.activeRequestId;
    } catch {
      // ignore
    }
  });

  const sendLoop = () => {
    if (st.stopped) return;

    try {
      if (character.ctype === "merchant") {
        st.stopped = true;
        return;
      }

      if (!st.pendingSend) return;

      const nowMs = now();
      const sendCooldownMs = 350;
      if (nowMs - st.lastSendAt < sendCooldownMs) return;

      if (!isNearby(merchantName, 400)) return;

      const sendable = getSendableItemSlots();
      if (!sendable.length) {
        st.pendingSend = false;
        try {
          send_cm(merchantName, {
            cmd: "unpack:done",
            requestId: st.activeRequestId || null,
            at: nowMs,
          });
        } catch {
          // ignore
        }
        return;
      }

      const slot = sendable[0];
      const item = character.items?.[slot];
      if (!item) return;

      const qty = item.q ? item.q : 1;
      try {
        send_item(merchantName, slot, qty);
        st.lastSendAt = nowMs;
      } catch (e) {
        warn("Failed to send item to merchant", e);
      }
    } catch {
      // ignore
    } finally {
      setTimeout(sendLoop, 250);
    }
  };

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
      const nowMs = now();

      // If we have room again, allow future requests immediately.
      if (free > threshold) {
        st.inFlightUntil = 0;
      }

      // If we're already waiting for a merchant, don't spam.
      if (st.inFlightUntil && nowMs < st.inFlightUntil) return;

      // Send request when low on space.
      if (free <= threshold) {
        if (nowMs - st.lastRequestAt >= cooldownMs) {
          const requestId = makeRequestId();
          st.lastRequestAt = nowMs;
          st.activeRequestId = requestId;
          st.pendingSend = false;
          // In-flight window: if merchant doesn't ack, we still won't spam instantly.
          st.inFlightUntil = nowMs + Math.max(15000, cooldownMs);

          try {
            send_cm(merchantName, {
              cmd: "unpack:request",
              requestId,
              reason: "inventory",
              freeSlots: free,
              loc: getLoc(),
              at: nowMs,
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
  sendLoop();

  return {
    stop: () => {
      st.stopped = true;
    },
  };
};

module.exports = {
  installUnpackRequester,
};
