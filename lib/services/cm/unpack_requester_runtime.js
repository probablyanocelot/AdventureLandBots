// Unpack requester service routine.
// Purpose: non-merchant inventory overflow flow (request merchant, then handoff items when nearby).

const { getConfig } = await require("../../config/index.js");
const { info, warn } = await require("../../al_debug_log.js");
const { onCharacter } = await require("../events/index.js");
const { is_friendly } = await require("../party/index.js");

const makeRequestId = () =>
  `unpack:${Date.now()}:${Math.random().toString(16).slice(2)}`;

const now = () => Date.now();
const getLoc = () => ({
  map: character?.map,
  x: Number(character?.x || 0),
  y: Number(character?.y || 0),
});

const getFreeSlots = () => {
  try {
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

const isNearPlayer = (name, maxDist = 400) => {
  try {
    if (!name) return false;
    const p = get_player?.(name);
    if (!p || p.rip) return false;
    if (p.map && character?.map && p.map !== character.map) return false;

    const d = Number.isFinite(distance?.(character, p))
      ? distance(character, p)
      : Infinity;
    return d <= Number(maxDist || 0);
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

  // Rogue-specific guard: retain pumpkinspice for self-use.
  const skipPumpkinSpiceForRogue = Boolean(
    cfg?.merchantAssist?.skipPumpkinSpiceWhenRogue,
  );
  if (
    skipPumpkinSpiceForRogue &&
    character?.ctype === "rogue" &&
    item.name === "pumpkinspice"
  ) {
    return true;
  }

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

const isReceiverFullError = (err) => {
  try {
    const msg = String(err?.message || err || "").toLowerCase();
    return msg.includes("no space on receiver");
  } catch {
    return false;
  }
};

const isTrustedOwnedMerchant = (name) => {
  if (!name) return false;

  try {
    if (!is_friendly(name)) return false;
  } catch {
    return false;
  }

  try {
    const chars = get_characters?.();
    if (!Array.isArray(chars)) return true;
    const ownChar = chars.find((c) => c?.name === name);
    if (!ownChar) return false;
    const ctype = ownChar?.ctype || ownChar?.class || ownChar?.type || null;
    if (ctype && ctype !== "merchant") return false;
  } catch {
    // ignore lookup errors and trust is_friendly result
  }

  return true;
};

const installUnpackRequester = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastRequestAt: 0,
    inFlightUntil: 0,
    activeRequestId: null,
    pendingSend: false,
    lastArrivedAt: null,
    lastSendAt: 0,
    loopTimer: null,
    sendLoopTimer: null,
    offCm: null,
  };

  const stopRoutine = () => {
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
    stopRoutine,
    dispose: () => {
      stopRoutine();
    },
    [Symbol.dispose]: () => {
      stopRoutine();
    },
    [Symbol.asyncDispose]: async () => {
      stopRoutine();
    },
  });

  const merchantName = cfg?.merchantAssist?.merchantName;

  if (!merchantName) {
    warn(
      "Unpack requester enabled but merchantAssist.merchantName is not set; requester will not run",
    );
    return buildDisposable();
  }

  if (!isTrustedOwnedMerchant(merchantName)) {
    warn(
      "Unpack requester blocked: merchantAssist.merchantName is not a trusted owned merchant",
      merchantName,
    );
    return buildDisposable();
  }

  const requesterEnabled = cfg?.merchantAssist?.requesterEnabled !== false;
  if (!cfg?.merchantAssist?.enabled || !requesterEnabled) {
    info("Unpack requester disabled by config");
    return buildDisposable();
  }

  st.offCm = onCharacter("cm", (m) => {
    try {
      if (!m || m.name !== merchantName) return;
      if (!isTrustedOwnedMerchant(m.name)) return;
      const data = m.message;
      if (!data || (data.cmd !== "unpack:arrived" && data.cmd !== "arrived"))
        return;

      const arrivedRequestId = data.requestId || null;
      if (
        arrivedRequestId &&
        st.activeRequestId &&
        arrivedRequestId !== st.activeRequestId
      ) {
        return;
      }

      st.inFlightUntil = 0;
      st.pendingSend = true;
      st.activeRequestId = arrivedRequestId || st.activeRequestId;
      st.lastArrivedAt = data.at || null;

      try {
        if (st.sendLoopTimer) clearTimeout(st.sendLoopTimer);
      } catch {
        // ignore
      }
      st.sendLoopTimer = setTimeout(sendLoop, 0);

      info(
        "Received unpack arrival ack; starting unpack handoff",
        st.activeRequestId,
      );
    } catch {
      // ignore
    }
  });

  const sendLoop = () => {
    if (st.stopped) return;

    try {
      if (character.ctype === "merchant") {
        stopRoutine();
        return;
      }

      const nowMs = now();
      const sendCooldownMs = Math.max(
        150,
        Number(cfg?.merchantAssist?.unpackSendIntervalMs ?? 250),
      );
      if (nowMs - st.lastSendAt < sendCooldownMs) return;

      const nearMerchantByEntity = isNearPlayer(merchantName, 400);
      const nearMerchantByCmLoc = isNearLoc(st.lastArrivedAt, 400);
      const nearMerchant = nearMerchantByEntity || nearMerchantByCmLoc;

      if (!st.pendingSend) {
        const hasActiveRequest = Boolean(st.activeRequestId);
        const threshold = Math.max(
          1,
          Number(cfg?.merchantAssist?.inventoryFreeSlotsThreshold ?? 4),
        );
        const needUnpack = getFreeSlots() <= threshold;

        if (nearMerchantByEntity && (hasActiveRequest || needUnpack)) {
          st.pendingSend = true;
          st.inFlightUntil = 0;
          st.activeRequestId = st.activeRequestId || makeRequestId();
          info(
            "Merchant nearby; starting unpack handoff without requiring CM arrival ack",
            st.activeRequestId,
          );
        }
      }

      if (!st.pendingSend) return;
      if (!nearMerchant) return;
      if (!isTrustedOwnedMerchant(merchantName)) return;

      const sendable = getSendableItemSlots(cfg);
      if (!sendable.length) {
        st.pendingSend = false;
        try {
          if (!isTrustedOwnedMerchant(merchantName)) return;
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
        if (!isTrustedOwnedMerchant(merchantName)) return;
        send_item(merchantName, slot, qty);
        st.lastSendAt = nowMs;
      } catch (e) {
        if (isReceiverFullError(e)) {
          st.pendingSend = false;
          st.inFlightUntil = nowMs + 15000;
          info(
            "Stopping unpack handoff because merchant has no receiver space",
            st.activeRequestId,
          );
          return;
        }
        warn("Failed to send item to merchant", e);
      }
    } catch {
      // ignore
    } finally {
      if (st.stopped) return;
      const sendLoopIntervalMs = Math.max(
        100,
        Number(cfg?.merchantAssist?.unpackSendIntervalMs ?? 250),
      );
      st.sendLoopTimer = setTimeout(sendLoop, sendLoopIntervalMs);
    }
  };

  const loop = () => {
    if (st.stopped) return;

    try {
      if (character.ctype === "merchant") {
        stopRoutine();
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

      if (free > threshold) {
        st.inFlightUntil = 0;
      }

      if (st.inFlightUntil && nowMs < st.inFlightUntil) return;

      if (free <= threshold) {
        if (nowMs - st.lastRequestAt >= cooldownMs) {
          const requestId = makeRequestId();
          st.lastRequestAt = nowMs;
          st.activeRequestId = requestId;
          st.pendingSend = false;
          st.inFlightUntil = nowMs + Math.max(15000, cooldownMs);

          try {
            if (!isTrustedOwnedMerchant(merchantName)) return;
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
      const loopIntervalMs = Math.max(
        250,
        Number(cfg?.merchantAssist?.unpackCheckIntervalMs ?? 1000),
      );
      st.loopTimer = setTimeout(loop, loopIntervalMs);
    }
  };

  loop();
  sendLoop();

  return buildDisposable();
};

module.exports = {
  installUnpackRequester,
};
