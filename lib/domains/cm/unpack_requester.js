// Unpack requester domain routine.
// Purpose: non-merchant inventory overflow flow (request merchant, then handoff items when nearby).
// Inputs: merchant-assist config, inventory state, CM acknowledgements.
// Side effects: sends CM (`unpack:request/arrived/done`) and item transfers.
// Cleanup: installer returns disposable that clears listeners and loop timers.

const { getConfig } = await require("../../al_config.js");
const { info, warn } = await require("../../al_debug_log.js");
const { isNearby } = await require("../state/flags.js");
const { onCharacter } = await require("../events/listeners.js");
const { getLoc } = await require("../../fn_loc.js");
const { now } = await require("../../fn_time.js");

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

const isNearLoc = (loc, maxDist = 400) => {
  try {
    if (!loc || !Number.isFinite(loc.x) || !Number.isFinite(loc.y))
      return false;
    if (loc.map && character?.map && loc.map !== character.map) return false;
    const dx = Number(character?.x || 0) - Number(loc.x || 0);
    const dy = Number(character?.y || 0) - Number(loc.y || 0);
    return Math.sqrt(dx * dx + dy * dy) <= Number(maxDist || 0);
  } catch {
    return false;
  }
};

const getItemType = (item) => {
  if (!item) return null;
  if (item.type) return item.type;
  try {
    return G?.items?.[item.name]?.type || null;
  } catch {
    return null;
  }
};

const isLowPotionItem = (item) => {
  const name = item?.name;
  if (!name) return false;
  return (
    name === "hpot0" || name === "hpot1" || name === "mpot0" || name === "mpot1"
  );
};

const shouldSkipSendItem = (item, cfg) => {
  if (!item) return true;
  if (item.l || item.locked) return true;
  if (getItemType(item) === "booster") return true;
  if (isLowPotionItem(item)) return true;

  const deniedNames = cfg?.merchantAssist?.doNotSendItemNames;
  if (Array.isArray(deniedNames) && deniedNames.length) {
    return deniedNames.includes(item.name);
  }

  return false;
};

const getSendableItemSlots = (cfg) => {
  const out = [];
  try {
    const items = character.items;
    if (!Array.isArray(items)) return out;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;
      if (shouldSkipSendItem(item, cfg)) continue;
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
    lastArrivedAt: null,
    lastSendAt: 0,
    loopTimer: null,
    sendLoopTimer: null,
    offCm: null,
  };

  const stop = () => {
    st.stopped = true;

    try {
      if (st.loopTimer) clearTimeout(st.loopTimer);
    } catch {
      // ignore
    }
    st.loopTimer = null;

    try {
      if (st.sendLoopTimer) clearTimeout(st.sendLoopTimer);
    } catch {
      // ignore
    }
    st.sendLoopTimer = null;

    try {
      if (typeof st.offCm === "function") st.offCm();
    } catch {
      // ignore
    }
    st.offCm = null;
  };

  const buildDisposable = () => ({
    stop,
    dispose: () => {
      stop();
    },
    [Symbol.dispose]: () => {
      stop();
    },
    [Symbol.asyncDispose]: async () => {
      stop();
    },
  });

  const merchantName = cfg?.merchantAssist?.merchantName;

  if (!merchantName) {
    warn(
      "Unpack requester enabled but merchantAssist.merchantName is not set; requester will not run",
    );
    return buildDisposable();
  }

  const requesterEnabled = cfg?.merchantAssist?.requesterEnabled !== false;
  if (!cfg?.merchantAssist?.enabled || !requesterEnabled) {
    info("Unpack requester disabled by config");
    return buildDisposable();
  }

  // Listen for merchant arrival acks.
  st.offCm = onCharacter("cm", (m) => {
    try {
      console.log("[unpack_requester][cm]", m);
      if (!m || m.name !== merchantName) return;
      const data = m.message;
      if (!data || data.cmd !== "unpack:arrived") return;
      st.inFlightUntil = 0;
      st.pendingSend = true;
      st.activeRequestId = data.requestId || st.activeRequestId;
      st.lastArrivedAt = data.at || null;
    } catch {
      // ignore
    }
  });

  const sendLoop = () => {
    if (st.stopped) return;

    try {
      if (character.ctype === "merchant") {
        stop();
        return;
      }

      const nowMs = now();
      const sendCooldownMs = 350;
      if (nowMs - st.lastSendAt < sendCooldownMs) return;

      const nearMerchantByEntity = isNearby(merchantName, 400);
      const nearMerchantByCmLoc = isNearLoc(st.lastArrivedAt, 400);
      const nearMerchant = nearMerchantByEntity || nearMerchantByCmLoc;

      if (!st.pendingSend) {
        // Fallback: if CM delivery is missed but merchant is physically nearby,
        // start handoff for the current in-flight request.
        const hasActiveRequest = Boolean(st.activeRequestId);
        const requestIsFresh = !st.inFlightUntil || nowMs <= st.inFlightUntil;
        if (hasActiveRequest && requestIsFresh && nearMerchantByEntity) {
          st.pendingSend = true;
          st.inFlightUntil = 0;
          info(
            "Merchant nearby without unpack:arrived CM; starting unpack handoff",
            st.activeRequestId,
          );
        }
      }

      if (!st.pendingSend) return;
      if (!nearMerchant) return;

      const sendable = getSendableItemSlots(cfg);
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
      if (st.stopped) return;
      st.sendLoopTimer = setTimeout(sendLoop, 250);
    }
  };

  const loop = () => {
    if (st.stopped) return;

    try {
      // Never run requester on merchants.
      if (character.ctype === "merchant") {
        stop();
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
      if (st.stopped) return;
      st.loopTimer = setTimeout(loop, 1000);
    }
  };

  loop();
  sendLoop();

  return buildDisposable();
};

module.exports = {
  installUnpackRequester,
};
