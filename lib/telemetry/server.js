const WebSocket = require("ws");
const { getTelemetryWsPort } = require("../al_env_config.js");

const PORT = getTelemetryWsPort();
if (!PORT) {
  throw new Error("TELEMETRY_WS_PORT is required to start telemetry server.");
}

const wss = new WebSocket.Server({ port: PORT });

const latestByBot = new Map();

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
    }
  });
});

console.log(
  `Adventure Land telemetry websocket server listening on ws://localhost:${PORT}`,
);
