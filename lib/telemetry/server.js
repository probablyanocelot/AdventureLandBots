const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { getTelemetryWsPort } = require("../al_env_config.js");

const PORT = getTelemetryWsPort();
if (!PORT) {
  throw new Error("TELEMETRY_WS_PORT is required to start telemetry server.");
}

const wss = new WebSocket.Server({ port: PORT });

wss.on("error", (err) => {
  const code = err?.code || "UNKNOWN";
  const msg = err?.message || String(err || "unknown error");
  console.error(
    `[telemetry] websocket server failed to start on ws://localhost:${PORT} (${code}): ${msg}`,
  );

  if (code === "EADDRINUSE") {
    console.error(
      `[telemetry] port ${PORT} is already in use. Stop the existing process using that port or set TELEMETRY_WS_PORT to a free port in .env.`,
    );
  }

  process.exitCode = 1;
});

wss.on("listening", () => {
  console.log(
    `Adventure Land telemetry websocket server listening on ws://localhost:${PORT}`,
  );
});

const latestByBot = new Map();
const COMBAT_LOG_DIR = "C:\\Users\\Boop\\adv_lnd_logs";
const COMBAT_LOG_FILE = path.join(COMBAT_LOG_DIR, "combat-debug.json");
const combatDebugEntries = [];
const DASHBOARD_ENDPOINT =
  process.env.TELEMETRY_DASHBOARD_ENDPOINT ||
  "http://localhost:3000/api/telemetry";

let lastDashboardForwardErrorAt = 0;

const logDashboardForwardError = (e) => {
  const now = Date.now();
  // avoid noisy logs if dashboard isn't running
  if (now - lastDashboardForwardErrorAt < 30000) return;
  lastDashboardForwardErrorAt = now;
  const msg = e?.message || String(e || "unknown error");
  console.warn(
    `[telemetry] failed forwarding to ${DASHBOARD_ENDPOINT}: ${msg}`,
  );
};

const forwardToDashboard = (payload) => {
  try {
    if (!payload || typeof payload !== "object") return;

    const url = new URL(DASHBOARD_ENDPOINT);
    const body = JSON.stringify(payload);
    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname || "/"}${url.search || ""}`,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
        timeout: 1500,
      },
      (res) => {
        // drain response to free sockets
        try {
          res.resume();
        } catch {
          // ignore
        }
      },
    );

    req.on("error", logDashboardForwardError);
    req.on("timeout", () => {
      try {
        req.destroy(new Error("request timeout"));
      } catch {
        // ignore
      }
    });

    req.write(body);
    req.end();
  } catch (e) {
    logDashboardForwardError(e);
  }
};

const persistCombatDebugLogs = () => {
  try {
    fs.mkdirSync(COMBAT_LOG_DIR, { recursive: true });
    fs.writeFileSync(
      COMBAT_LOG_FILE,
      JSON.stringify(combatDebugEntries, null, 2),
    );
  } catch {
    // ignore file write failures
  }
};

const appendCombatDebugLog = (entry) => {
  try {
    if (!entry || typeof entry !== "object") return;
    combatDebugEntries.push(entry);
    const maxEntries = 5000;
    if (combatDebugEntries.length > maxEntries) {
      combatDebugEntries.splice(0, combatDebugEntries.length - maxEntries);
    }
    persistCombatDebugLogs();
  } catch {
    // ignore
  }
};

const buildSnapshot = () => ({
  type: "inventory:snapshot",
  bots: Array.from(latestByBot.values()),
});

const broadcast = (payload) => {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch {
        // ignore send failures
      }
    }
  });
};

wss.on("connection", (ws) => {
  // Send the latest snapshot immediately on connect.
  try {
    ws.send(JSON.stringify(buildSnapshot()));
  } catch {
    // ignore
  }

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (!msg || typeof msg !== "object") return;

    if (msg.type === "inventory:update") {
      const name = msg?.bot?.name || msg?.name;
      if (!name) return;

      latestByBot.set(name, {
        name,
        ctype: msg?.bot?.ctype ?? msg?.ctype ?? null,
        level: msg?.bot?.level ?? msg?.level ?? null,
        gold: msg?.gold ?? null,
        online: msg?.online ?? true,
        location: msg?.location ?? null,
        items: Array.isArray(msg?.items) ? msg.items : [],
        ts: msg?.ts ?? Date.now(),
      });

      broadcast(buildSnapshot());
      forwardToDashboard({
        ...msg,
        bot: {
          name,
          ctype: msg?.bot?.ctype ?? msg?.ctype ?? null,
          level: msg?.bot?.level ?? msg?.level ?? null,
        },
        ts: msg?.ts ?? Date.now(),
      });
      return;
    }

    if (msg.type === "combat:debug") {
      const entry = {
        ts: msg?.ts ?? Date.now(),
        bot: msg?.bot || msg?.name || null,
        module: msg?.module || null,
        key: msg?.key || null,
        message: msg?.message || null,
        data: msg?.data ?? null,
      };
      appendCombatDebugLog(entry);
      forwardToDashboard({ type: "combat:debug", ...entry });
    }
  });
});
