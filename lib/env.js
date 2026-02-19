let envLoaded = false;

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
  if (raw === undefined || raw === null || raw === "") return null;
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
  buildLocalWsUrl,
};
