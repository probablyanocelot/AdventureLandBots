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

const getRemoteTelemetryWsPort = () => {
  try {
    if (typeof window === "undefined") return null;
    if (typeof window.TELEMETRY_WS_PORT === "number") {
      return Number.isFinite(window.TELEMETRY_WS_PORT)
        ? window.TELEMETRY_WS_PORT
        : null;
    }
    const cfg = window.AL_BOTS_CONFIG;
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
        logCatch("getRemoteTelemetryWsPort parse failed", e);
        return null;
      }
    }
  } catch (e) {
    logCatch("getRemoteTelemetryWsPort failed", e);
    return null;
  }
  return null;
};

const getTelemetryWsPort = () => {
  const raw = getEnv("TELEMETRY_WS_PORT");
  if (raw === undefined || raw === null || raw === "") {
    return getRemoteTelemetryWsPort();
  }
  const port = Number(raw);
  if (!Number.isFinite(port)) return null;
  return port;
};

const buildLocalWsUrl = (port) => {
  if (!port) return null;
  return `ws://localhost:${port}`;
};

module.exports = {
  getEnv,
  getTelemetryWsPort,
  getRemoteTelemetryWsPort,
  buildLocalWsUrl,
};
