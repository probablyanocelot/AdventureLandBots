const { warn } = await require("../debug_log.js");
const { buildLocalWsUrl, getTelemetryWsPort } = await require("../env.js");

let telemetryStarted = false;
let socket = null;
let reconnectTimer = null;
let publishTimer = null;

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const sanitizeItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const out = { name: item.name };
  if (item.q !== undefined) out.q = item.q;
  if (item.level !== undefined) out.level = item.level;
  if (item.p !== undefined) out.p = item.p;
  if (item.l !== undefined) out.l = item.l;
  if (item.stat_type !== undefined) out.stat_type = item.stat_type;
  if (item.stat !== undefined) out.stat = item.stat;
  return out;
};

const buildPayload = () => {
  const items = Array.isArray(character?.items) ? character.items : [];
  return {
    type: "inventory:update",
    bot: {
      name: character?.name || null,
      ctype: character?.ctype || null,
      level: safeNumber(character?.level),
    },
    online: character ? !character.rip : true,
    location: {
      map: character?.map || null,
      in: character?.in || null,
      x: safeNumber(character?.x),
      y: safeNumber(character?.y),
    },
    gold: safeNumber(character?.gold),
    items: items.map(sanitizeItem),
    ts: Date.now(),
  };
};

const connect = (wsUrl) => {
  try {
    socket = new WebSocket(wsUrl);
  } catch (e) {
    warn("Telemetry websocket failed to create", e);
    return;
  }

  socket.addEventListener("open", () => {
    try {
      socket.send(JSON.stringify({ type: "client:hello", role: "bot" }));
    } catch {
      // ignore
    }
  });

  socket.addEventListener("close", () => {
    socket = null;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect(wsUrl);
    }, 2000);
  });

  socket.addEventListener("error", () => {
    try {
      socket?.close();
    } catch {
      // ignore
    }
  });
};

const startPublishing = (intervalMs) => {
  if (publishTimer) return;
  publishTimer = setInterval(
    () => {
      try {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const payload = buildPayload();
        if (!payload.bot?.name) return;
        socket.send(JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    Math.max(500, intervalMs),
  );
};

const installTelemetry = ({ cfg } = {}) => {
  if (telemetryStarted) return;
  telemetryStarted = true;

  const telemetryCfg = cfg?.telemetry || {};
  if (telemetryCfg.enabled === false) return;

  if (typeof WebSocket === "undefined") {
    warn("Telemetry disabled: WebSocket is not available in this runtime.");
    return;
  }

  const wsUrl = telemetryCfg.wsUrl || buildLocalWsUrl(getTelemetryWsPort());
  if (!wsUrl) {
    warn("Telemetry disabled: set TELEMETRY_WS_PORT or telemetry.wsUrl.");
    return;
  }
  const intervalMs = Number(telemetryCfg.intervalMs || 2000);

  connect(wsUrl);
  startPublishing(intervalMs);
};

module.exports = {
  installTelemetry,
};
