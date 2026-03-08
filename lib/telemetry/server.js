const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { getTelemetryWsPort } = require("../al_env_config.js");

const PORT = getTelemetryWsPort();
if (!PORT) {
  throw new Error("TELEMETRY_WS_PORT is required to start telemetry server.");
}

const wss = new WebSocket.Server({ port: PORT });

const latestByBot = new Map();
const COMBAT_LOG_DIR = "C:\\Users\\Boop\\adv_lnd_logs";
const COMBAT_LOG_FILE = path.join(COMBAT_LOG_DIR, "combat-debug.json");
const combatDebugEntries = [];

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
      return;
    }

    if (msg.type === "combat:debug") {
      appendCombatDebugLog({
        ts: msg?.ts ?? Date.now(),
        bot: msg?.bot || msg?.name || null,
        module: msg?.module || null,
        key: msg?.key || null,
        message: msg?.message || null,
        data: msg?.data ?? null,
      });
    }
  });
});

console.log(
  `Adventure Land telemetry websocket server listening on ws://localhost:${PORT}`,
);
