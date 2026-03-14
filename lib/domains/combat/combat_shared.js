const { now } = await require("../../fn_time.js");
const { info } = await require("../../al_debug_log.js");

const dbgState = new Map();
const isDebugEnabled = (cfg) =>
  Boolean(cfg?.debug?.combat || globalThis.AL_BOTS_DEBUG_COMBAT);

const dbg = (cfg, key, message, data = null, cooldownMs = 1200) => {
  try {
    if (!isDebugEnabled(cfg)) return;
    const ts = now();
    const last = dbgState.get(key) || 0;
    if (ts - last < cooldownMs) return;
    dbgState.set(key, ts);
    info(`[combat] ${message}`, data || "");
  } catch {
    // ignore
  }
};

const stopSmartMove = ({ cfg, reason, data } = {}) => {
  try {
    if (!smart?.moving) return;
    if (typeof stopRoutine === "function") stopRoutine("smart");
    dbg(
      cfg,
      `stop:${reason || "unknown"}`,
      `stop smart_move (${reason})`,
      data,
    );
  } catch {
    // ignore
  }
};

const isNearPoint = ({ map, x, y } = {}, threshold = 60) => {
  try {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (map && character?.map && map !== character.map) return false;
    if (typeof distance !== "function") return false;
    return distance(character, { x, y }) <= threshold;
  } catch {
    return false;
  }
};

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeFrequency = (value) => {
  const n = normalizeNumber(value, 1);
  return Math.max(0.1, n);
};

const getOwnCharacterNamesSet = () => {
  const out = new Set([character?.name].filter(Boolean));
  try {
    const chars = get_characters?.();
    if (Array.isArray(chars)) {
      for (const c of chars) {
        if (c?.name) out.add(c.name);
      }
    }
  } catch {
    // ignore
  }
  return out;
};

const getPlayerEntitySafe = (name) => {
  try {
    if (!name) return null;
    if (name === character?.name) return character;
    return get_player?.(name) || null;
  } catch {
    return null;
  }
};

const spreadFromPartyIfStacked = ({ cfg, huntGroupNames = [] } = {}) => {
  try {
    if (!character?.s?.stacked) return false;
    if (typeof xmove !== "function") return false;

    const nowMs = now();
    const moveCooldownMs = Math.max(
      120,
      normalizeNumber(cfg?.noEventFarming?.stackedSpreadCooldownMs, 220),
    );
    if (
      cfg?._lastStackedSpreadAt &&
      nowMs - Number(cfg._lastStackedSpreadAt) < moveCooldownMs
    ) {
      return true;
    }

    const nameSet = new Set(
      Array.isArray(huntGroupNames) ? huntGroupNames.filter(Boolean) : [],
    );
    for (const n of Object.keys(parent?.party || {})) {
      if (n) nameSet.add(n);
    }

    const nearbyAllies = [];
    const clusterRadius = Math.max(
      12,
      normalizeNumber(cfg?.noEventFarming?.stackedClusterRadius, 35),
    );

    for (const name of nameSet) {
      if (!name || name === character?.name) continue;
      const p = getPlayerEntitySafe(name);
      if (!p || p.rip) continue;
      if (p.map && character?.map && p.map !== character.map) continue;
      const d = normalizeNumber(distance?.(character, p), Infinity);
      if (!Number.isFinite(d) || d > clusterRadius) continue;
      nearbyAllies.push(p);
    }

    if (!nearbyAllies.length) return false;

    const center = nearbyAllies.reduce(
      (acc, p) => {
        acc.x += Number(p.x || 0);
        acc.y += Number(p.y || 0);
        return acc;
      },
      { x: 0, y: 0 },
    );
    center.x /= nearbyAllies.length;
    center.y /= nearbyAllies.length;

    let dx = Number(character?.x || 0) - center.x;
    let dy = Number(character?.y || 0) - center.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const spreadStep = Math.max(
      10,
      normalizeNumber(cfg?.noEventFarming?.stackedSpreadStep, 28),
    );
    const nx = Number(character?.x || 0) + dx * spreadStep;
    const ny = Number(character?.y || 0) + dy * spreadStep;

    xmove(nx, ny);
    cfg._lastStackedSpreadAt = nowMs;
    dbg(
      cfg,
      `stacked_spread:${character?.name || "self"}`,
      "stacked detected: spreading from party",
      {
        allies: nearbyAllies.map((p) => p?.name).filter(Boolean),
        to: { x: nx, y: ny },
      },
      350,
    );
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  dbg,
  stopSmartMove,
  isNearPoint,
  normalizeNumber,
  normalizeFrequency,
  getOwnCharacterNamesSet,
  getPlayerEntitySafe,
  spreadFromPartyIfStacked,
};
