const TELEMETRY_CONFIG = Object.freeze({
  enabled: true,
  wsHost: "localhost",
  wsPort: 8787,
  wsUrl: null,
  allowRuntimeOverrides: true,
});

const TELEMETRY_URL_STORAGE_KEYS = [
  "AL_BOTS_TELEMETRY_WS_URL",
  "albots:telemetry:wsUrl",
  "TELEMETRY_WS_URL",
];

const TELEMETRY_PORT_STORAGE_KEYS = [
  "AL_BOTS_TELEMETRY_WS_PORT",
  "albots:telemetry:wsPort",
  "TELEMETRY_WS_PORT",
];

const storageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const pickFirst = (keys, mapper) => {
  for (const key of keys) {
    const value = mapper(storageGet(key));
    if (value) return value;
  }
  return null;
};

const asFiniteNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const asWsUrl = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "ws:" && u.protocol !== "wss:") return null;
    return u.toString();
  } catch {
    return null;
  }
};

const buildLocalTelemetryUrl = (host, port) =>
  host && port ? `ws://${host}:${port}` : null;

const ensureWsPort = (wsUrl, fallbackPort) => {
  const normalized = asWsUrl(wsUrl);
  if (!normalized) return null;

  const port = asFiniteNumber(fallbackPort);
  if (!port) return normalized;

  try {
    const parsed = new URL(normalized);
    if (parsed.port) return parsed.toString();
    parsed.port = String(port);
    return parsed.toString();
  } catch {
    return normalized;
  }
};

const extractWsPort = (wsUrl) => {
  const u = asWsUrl(wsUrl);
  if (!u) return null;
  try {
    const parsed = new URL(u);
    if (parsed.port) {
      const explicitPort = Number(parsed.port);
      return Number.isFinite(explicitPort) ? explicitPort : null;
    }
    if (parsed.protocol === "wss:") return 443;
    if (parsed.protocol === "ws:") return 80;
  } catch {
    // ignore
  }
  return null;
};

const readLocalTelemetryUrl = () =>
  pickFirst(TELEMETRY_URL_STORAGE_KEYS, asWsUrl);

const readLocalTelemetryPort = () =>
  pickFirst(TELEMETRY_PORT_STORAGE_KEYS, asFiniteNumber);

const resolveTelemetryWsUrl = () => {
  try {
    if (!TELEMETRY_CONFIG.enabled) return null;

    const configHost =
      typeof TELEMETRY_CONFIG.wsHost === "string"
        ? TELEMETRY_CONFIG.wsHost.trim()
        : "";
    const preferredHost = configHost || "localhost";
    const defaultPort = asFiniteNumber(TELEMETRY_CONFIG.wsPort);

    if (TELEMETRY_CONFIG.allowRuntimeOverrides) {
      const globalUrl = asWsUrl(window?.TELEMETRY_WS_URL);
      if (globalUrl) {
        const globalPort = asFiniteNumber(window?.TELEMETRY_WS_PORT);
        const localPort = readLocalTelemetryPort();
        return (
          ensureWsPort(globalUrl, globalPort || localPort || defaultPort) ||
          globalUrl
        );
      }

      const localUrl = readLocalTelemetryUrl();
      if (localUrl) {
        const globalPort = asFiniteNumber(window?.TELEMETRY_WS_PORT);
        const localPort = readLocalTelemetryPort();
        return (
          ensureWsPort(localUrl, localPort || globalPort || defaultPort) ||
          localUrl
        );
      }

      const globalPort = asFiniteNumber(window?.TELEMETRY_WS_PORT);
      if (globalPort) return buildLocalTelemetryUrl(preferredHost, globalPort);

      const localPort = readLocalTelemetryPort();
      if (localPort) return buildLocalTelemetryUrl(preferredHost, localPort);
    }

    const configUrl = asWsUrl(TELEMETRY_CONFIG.wsUrl);
    if (configUrl) return ensureWsPort(configUrl, defaultPort) || configUrl;

    const configPort = defaultPort;
    if (configPort) return buildLocalTelemetryUrl(preferredHost, configPort);
  } catch {
    // ignore
  }
  return null;
};

const applyTelemetryBootstrap = () => {
  const telemetryWsUrl = resolveTelemetryWsUrl();
  const telemetryWsPort =
    asFiniteNumber(TELEMETRY_CONFIG.wsPort) || extractWsPort(telemetryWsUrl);
  const baseCfg =
    window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
      ? window.AL_BOTS_CONFIG
      : {};

  if (telemetryWsUrl) {
    const baseTelemetry =
      baseCfg.telemetry && typeof baseCfg.telemetry === "object"
        ? baseCfg.telemetry
        : {};

    window.AL_BOTS_CONFIG = {
      ...baseCfg,
      telemetry: {
        ...baseTelemetry,
        enabled: true,
        wsUrl: telemetryWsUrl,
        wsPort: telemetryWsPort,
      },
    };

    if (telemetryWsPort) {
      window.TELEMETRY_WS_PORT = telemetryWsPort;
    }
  } else if (!window.AL_BOTS_CONFIG) {
    window.AL_BOTS_CONFIG = {};
  }
};

module.exports = {
  applyTelemetryBootstrap,
};
