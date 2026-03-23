let envLoaded = false;
const { logCatch } = require("./al_debug_log.js");

const loadEnv = () => {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const dotenv = require("dotenv");
    if (dotenv && typeof dotenv.config === "function") {
      dotenv.config();
    }
  } catch {
    // ignore if dotenv is unavailable
  }
};

const getEnv = (key) => {
  loadEnv();
  if (typeof process === "undefined" || !process?.env) return undefined;
  return process.env[key];
};

const getTelemetryWsPort = () => {
  const raw = getEnv("TELEMETRY_WS_PORT");
  if (raw === undefined || raw === null || raw === "") {
    // No env var, fallback to browser/global config if available
    try {
      const wsPort =
        typeof window !== "undefined"
          ? window.TELEMETRY_WS_PORT
          : globalThis.TELEMETRY_WS_PORT;
      if (typeof wsPort === "number") {
        return Number.isFinite(wsPort) ? wsPort : null;
      }
      const cfg =
        typeof window !== "undefined" ? window.AL_BOTS_CONFIG : undefined;
      const telemetry = cfg && typeof cfg === "object" ? cfg.telemetry : null;
      if (telemetry && typeof telemetry.wsPort === "number") {
        return Number.isFinite(telemetry.wsPort) ? telemetry.wsPort : null;
      }
      if (telemetry && typeof telemetry.wsUrl === "string") {
        try {
          const url = new URL(telemetry.wsUrl);
          const port = Number(url.port);
          return Number.isFinite(port) ? port : null;
        } catch (e) {
          logCatch("getTelemetryWsPort parse failed", e);
          return null;
        }
      }
    } catch (e) {
      logCatch("getTelemetryWsPort failed", e);
      return null;
    }
    return null;
  }
  const port = Number(raw);
  if (!Number.isFinite(port)) return null;
  return port;
};

const buildLocalWsUrl = (port) => {
  if (!port) return null;
  return `wss://127.0.0.1:${port}`;
};

module.exports = {
  getEnv,
  getTelemetryWsPort,
  buildLocalWsUrl,
};
