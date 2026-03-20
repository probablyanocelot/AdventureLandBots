const { getConfig } = await require("../../config/index.js");
const { info, warn } = await require("../../al_debug_log.js");
const { onCharacter } = await require("../events/listeners.js");
const { is_friendly } = await require("../party/party.js");
const { getLoc, now } = await require("../shared/index.js");

const REQUEST_TIMEOUT_MS = 90000;
const MOVE_REQUEST_COOLDOWN_MS = 2500;
const ARRIVED_ACK_COOLDOWN_MS = 900;
const HANDOFF_NEAR_DIST = 380;

const isNearLoc = (loc, maxDist = 400) => {
  try {
    if (!loc || !Number.isFinite(loc.x) || !Number.isFinite(loc.y)) {
      return false;
    }
    if (loc.map && character?.map && loc.map !== character.map) return false;
    const dx = Number(character?.x || 0) - Number(loc.x || 0);
    const dy = Number(character?.y || 0) - Number(loc.y || 0);
    return Math.sqrt(dx * dx + dy * dy) <= Number(maxDist || 0);
  } catch {
    return false;
  }
};

const getPlayerLoc = (name) => {
  try {
    if (!name) return null;
    const p = get_player?.(name);
    if (!p || p.rip) return null;
    return {
      map: p.map || null,
      x: Number(p.x || 0),
      y: Number(p.y || 0),
    };
  } catch {
    return null;
  }
};

const buildNoopDisposable = () => ({
  stopRoutine: () => {},
  dispose: () => {},
  [Symbol.dispose]: () => {},
  [Symbol.asyncDispose]: async () => {},
});

const createUnpackSupport = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const enabled = Boolean(cfg?.merchantAssist?.enabled);
  const supportEnabled = cfg?.merchantAssist?.supportEnabled !== false;

  if (!enabled || !supportEnabled) {
    return buildNoopDisposable();
  }

  if (character?.ctype !== "merchant") {
    return buildNoopDisposable();
  }

  const st = {
    stopped: false,
    queue: [],
    active: null,
    offCm: null,
    loopTimer: null,
    lastMoveAt: 0,
    lastArrivedAckAt: 0,
  };

  const normalizeRequest = (from, data) => ({
    from,
    requestId:
      data?.requestId || `unpack:${from}:${Date.now()}:${Math.random()}`,
    reason: data?.reason || "inventory",
    loc: data?.loc || null,
    pots: data?.pots || null,
    createdAt: now(),
    arrivedAcked: false,
  });

  const upsertRequest = (req) => {
    const idx = st.queue.findIndex(
      (q) => q.requestId === req.requestId || q.from === req.from,
    );
    if (idx >= 0) {
      st.queue[idx] = {
        ...st.queue[idx],
        ...req,
        createdAt: st.queue[idx].createdAt || req.createdAt,
      };
      return;
    }

    st.queue.push(req);
  };

  const clearRequest = ({ from, requestId } = {}) => {
    st.queue = st.queue.filter((q) => {
      if (requestId && q.requestId === requestId) return false;
      if (from && q.from === from) return false;
      return true;
    });

    if (!st.active) return;
    if (requestId && st.active.requestId === requestId) {
      st.active = null;
      return;
    }
    if (from && st.active.from === from) {
      st.active = null;
    }
  };

  const sendArrivedAck = (req) => {
    const nowMs = now();
    if (nowMs - st.lastArrivedAckAt < ARRIVED_ACK_COOLDOWN_MS) return;

    try {
      send_cm(req.from, {
        cmd: "unpack:arrived",
        requestId: req.requestId,
        reason: req.reason,
        at: getLoc(),
      });
      send_cm(req.from, {
        cmd: "arrived",
        requestId: req.requestId,
        reason: req.reason,
        at: getLoc(),
      });
      st.lastArrivedAckAt = nowMs;
      req.arrivedAcked = true;
    } catch (e) {
      warn("Failed to send unpack:arrived", e);
    }
  };

  const maybeSendRequestedPots = (req) => {
    if (req.reason !== "pots") return;
    if (req.potsSent) return;

    const sendOne = (spec) => {
      const itemName = String(spec?.type || "").trim();
      const wantQty = Math.max(0, Number(spec?.qty || 0));
      if (!itemName || wantQty <= 0) return;

      const slot = locate_item(itemName);
      if (slot < 0) return;

      const item = character?.items?.[slot];
      if (!item) return;

      const haveQty = Number(item.q || 1);
      const sendQty = Math.max(1, Math.min(wantQty, haveQty));
      send_item(req.from, slot, sendQty);
    };

    try {
      sendOne(req.pots?.h);
      sendOne(req.pots?.m);
      req.potsSent = true;
    } catch (e) {
      warn("Failed to send requested pots during unpack support", e);
    }
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
      if (typeof st.offCm === "function") st.offCm();
    } catch {
      // ignore
    }
    st.offCm = null;

    st.queue = [];
    st.active = null;
  };

  st.offCm = onCharacter("cm", (m) => {
    try {
      const from = m?.name;
      if (!from || !is_friendly(from)) return;

      const data = m?.message;
      if (!data?.cmd) return;

      if (data.cmd === "unpack:request") {
        const req = normalizeRequest(from, data);
        upsertRequest(req);
        info("Received unpack:request", req.requestId, "from", from);
        return;
      }

      if (data.cmd === "unpack:done") {
        clearRequest({ from, requestId: data.requestId || null });
      }
    } catch {
      // ignore
    }
  });

  const loop = () => {
    if (st.stopped) return;

    try {
      const nowMs = now();

      st.queue = st.queue.filter(
        (q) => nowMs - Number(q.createdAt || 0) <= REQUEST_TIMEOUT_MS,
      );

      if (!st.active && st.queue.length) {
        st.active = st.queue.shift() || null;
      }

      const req = st.active;
      if (!req) return;

      const requesterLoc = getPlayerLoc(req.from);
      const fallbackLoc = req.loc;
      const targetLoc = requesterLoc || fallbackLoc;

      const nearRequester = requesterLoc
        ? isNearLoc(requesterLoc, HANDOFF_NEAR_DIST)
        : isNearLoc(fallbackLoc, HANDOFF_NEAR_DIST);

      if (targetLoc && !nearRequester) {
        if (nowMs - st.lastMoveAt >= MOVE_REQUEST_COOLDOWN_MS) {
          st.lastMoveAt = nowMs;
          try {
            smart_move(targetLoc);
          } catch (e) {
            warn("Failed to smart_move for unpack request", e);
          }
        }

        // Keep sender informed while traveling so fallback location can be used.
        sendArrivedAck(req);
        return;
      }

      sendArrivedAck(req);
      maybeSendRequestedPots(req);
    } catch {
      // ignore
    } finally {
      if (st.stopped) return;
      st.loopTimer = setTimeout(loop, 250);
    }
  };

  loop();

  return {
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  createUnpackSupport,
};
