const { warn } = await require("../al_debug_log.js");
const { buildLocalWsUrl, getTelemetryWsPort } =
  await require("../al_env_config.js");

const st = {
  started: false,
  stopping: false,
  socket: null,
  reconnectTimer: null,
  publishTimer: null,
};

const safeNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const buildWsCandidates = (wsUrl) => {
  const candidates = [];
  const seen = new Set();

  const add = (value) => {
    if (!value || typeof value !== "string") return;
    if (seen.has(value)) return;
    seen.add(value);
    candidates.push(value);
  };

  add(wsUrl);

  try {
    const u = new URL(wsUrl);
    const isLoopbackHost =
      u.hostname === "localhost" ||
      u.hostname === "127.0.0.1" ||
      u.hostname === "::1";
    if (!isLoopbackHost) return candidates;

    const hostVariants = ["localhost", "127.0.0.1", "::1"];
    for (const host of hostVariants) {
      const copy = new URL(u.toString());
      copy.hostname = host;
      add(copy.toString());
    }
  } catch {
    // ignore parse failures, keep original URL only
  }

  return candidates;
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

const clearReconnectTimer = () => {
  try {
    if (st.reconnectTimer) clearTimeout(st.reconnectTimer);
  } catch {
    // ignore
  }
  st.reconnectTimer = null;
};

const clearPublishTimer = () => {
  try {
    if (st.publishTimer) clearInterval(st.publishTimer);
  } catch {
    // ignore
  }
  st.publishTimer = null;
};

const closeSocket = () => {
  try {
    st.socket?.close?.();
  } catch {
    // ignore
  }
  st.socket = null;
};

const stopTelemetry = () => {
  st.stopping = true;
  st.started = false;
  clearReconnectTimer();
  clearPublishTimer();
  closeSocket();
  st.stopping = false;
};

const buildDisposable = () => ({
  stop: () => {
    stopTelemetry();
  },
  dispose: () => {
    stopTelemetry();
  },
  [Symbol.dispose]: () => {
    stopTelemetry();
  },
  [Symbol.asyncDispose]: async () => {
    stopTelemetry();
  },
});

const connect = (wsUrl) => {
  const wsCandidates = buildWsCandidates(wsUrl);

  const connectIndex = (idx) => {
    const currentUrl = wsCandidates[idx];
    if (!currentUrl) return;

    let opened = false;
    try {
      st.socket = new WebSocket(currentUrl);
    } catch (e) {
      if (idx + 1 < wsCandidates.length) {
        connectIndex(idx + 1);
        return;
      }
      warn("Telemetry websocket failed to create", e);
      return;
    }

    st.socket.addEventListener("open", () => {
      opened = true;
      try {
        st.socket?.send?.(
          JSON.stringify({ type: "client:hello", role: "bot" }),
        );
      } catch {
        // ignore
      }
    });

    st.socket.addEventListener("close", () => {
      st.socket = null;

      if (!opened && idx + 1 < wsCandidates.length) {
        connectIndex(idx + 1);
        return;
      }

      if (!st.started || st.stopping) return;
      if (st.reconnectTimer) return;
      st.reconnectTimer = setTimeout(() => {
        st.reconnectTimer = null;
        if (!st.started || st.stopping) return;
        connect(wsUrl);
      }, 2000);
    });

    st.socket.addEventListener("error", () => {
      try {
        st.socket?.close?.();
      } catch {
        // ignore
      }
    });
  };

  connectIndex(0);
};

const startPublishing = (intervalMs) => {
  if (st.publishTimer) return;
  st.publishTimer = setInterval(
    () => {
      try {
        if (!st.socket || st.socket.readyState !== WebSocket.OPEN) return;
        const payload = buildPayload();
        if (!payload.bot?.name) return;
        st.socket.send(JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    Math.max(500, intervalMs),
  );
};

const installTelemetry = ({ cfg } = {}) => {
  if (st.started) return buildDisposable();
  st.started = true;

  const telemetryCfg = cfg?.telemetry || {};
  if (telemetryCfg.enabled === false) {
    st.started = false;
    return null;
  }

  if (typeof WebSocket === "undefined") {
    warn("Telemetry disabled: WebSocket is not available in this runtime.");
    st.started = false;
    return null;
  }

  const wsUrl = telemetryCfg.wsUrl || buildLocalWsUrl(getTelemetryWsPort());
  if (!wsUrl) {
    warn("Telemetry disabled: set TELEMETRY_WS_PORT or telemetry.wsUrl.");
    st.started = false;
    return null;
  }
  const intervalMs = Number(telemetryCfg.intervalMs || 2000);

  connect(wsUrl);
  startPublishing(intervalMs);

  return buildDisposable();
};

module.exports = {
  installTelemetry,
  stopTelemetry,
};
