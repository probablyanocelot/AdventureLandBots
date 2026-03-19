const TELEMETRY_CONFIG = Object.freeze({
  enabled: true,
  wsHost: "127.0.0.1",
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

const TELEGRAM_TOKEN_STORAGE_KEYS = [
  "AL_BOTS_TELEGRAM_TOKEN",
  "albots:telegram:token",
  "TELEGRAM_TOKEN",
];

const TELEGRAM_CHAT_ID_STORAGE_KEYS = [
  "AL_BOTS_TELEGRAM_CHAT_ID",
  "albots:telegram:chatId",
  "TELEGRAM_CHAT_ID",
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

const asNonEmptyString = (value) => {
  if (value == null) return null;
  const str = String(value).trim();
  return str || null;
};

const getWindowTargets = () => {
  if (typeof window === "undefined") return [];

  const targets = [window];
  try {
    if (window.parent && window.parent !== window) targets.push(window.parent);
  } catch {
    // ignore cross-origin access
  }
  try {
    if (window.top && !targets.includes(window.top)) targets.push(window.top);
  } catch {
    // ignore cross-origin access
  }

  return targets;
};

const readGlobalValue = (key, mapper) => {
  const normalize = typeof mapper === "function" ? mapper : (v) => v;
  const targets = getWindowTargets();

  for (const target of targets) {
    try {
      const value = normalize(target?.[key]);
      if (value != null) return value;
    } catch {
      // ignore access errors
    }
  }

  return null;
};

const readGlobalObject = (key) =>
  readGlobalValue(key, (value) =>
    value && typeof value === "object" ? value : null,
  );

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

const normalizeLoopbackWsUrl = (wsUrl) => {
  const normalized = asWsUrl(wsUrl);
  if (!normalized) return null;

  try {
    const parsed = new URL(normalized);
    const host = String(parsed.hostname || "")
      .trim()
      .toLowerCase();
    if (host === "localhost" || host === "::1") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return normalized;
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

const readGlobalTelemetryUrl = () =>
  readGlobalValue("TELEMETRY_WS_URL", asWsUrl);

const readGlobalTelemetryPort = () =>
  readGlobalValue("TELEMETRY_WS_PORT", asFiniteNumber);

const readGlobalTelegramToken = () =>
  readGlobalValue("TELEGRAM_TOKEN", asNonEmptyString);

const readGlobalTelegramChatId = () =>
  readGlobalValue("TELEGRAM_CHAT_ID", asNonEmptyString);

const readLocalTelegramToken = () =>
  pickFirst(TELEGRAM_TOKEN_STORAGE_KEYS, asNonEmptyString);

const readLocalTelegramChatId = () =>
  pickFirst(TELEGRAM_CHAT_ID_STORAGE_KEYS, asNonEmptyString);

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
      const globalUrl = readGlobalTelemetryUrl();
      if (globalUrl) {
        const globalPort = readGlobalTelemetryPort();
        const localPort = readLocalTelemetryPort();
        return normalizeLoopbackWsUrl(
          ensureWsPort(globalUrl, globalPort || localPort || defaultPort) ||
            globalUrl,
        );
      }

      const localUrl = readLocalTelemetryUrl();
      if (localUrl) {
        const globalPort = readGlobalTelemetryPort();
        const localPort = readLocalTelemetryPort();
        return normalizeLoopbackWsUrl(
          ensureWsPort(localUrl, localPort || globalPort || defaultPort) ||
            localUrl,
        );
      }

      const globalPort = readGlobalTelemetryPort();
      if (globalPort)
        return normalizeLoopbackWsUrl(
          buildLocalTelemetryUrl(preferredHost, globalPort),
        );

      const localPort = readLocalTelemetryPort();
      if (localPort)
        return normalizeLoopbackWsUrl(
          buildLocalTelemetryUrl(preferredHost, localPort),
        );
    }

    const configUrl = asWsUrl(TELEMETRY_CONFIG.wsUrl);
    if (configUrl)
      return normalizeLoopbackWsUrl(
        ensureWsPort(configUrl, defaultPort) || configUrl,
      );

    const configPort = defaultPort;
    if (configPort)
      return normalizeLoopbackWsUrl(
        buildLocalTelemetryUrl(preferredHost, configPort),
      );
  } catch {
    // ignore
  }
  return null;
};

const resolveTelegramConfig = () => {
  const token = readGlobalTelegramToken() || readLocalTelegramToken();
  const chatId = readGlobalTelegramChatId() || readLocalTelegramChatId();
  if (!token && !chatId) return null;
  return {
    token: token || null,
    chatId: chatId || null,
    enabled: Boolean(token && chatId),
  };
};

const applyTelemetryBootstrap = () => {
  const globalTelemetryUrl = readGlobalTelemetryUrl();
  const localTelemetryUrl = readLocalTelemetryUrl();
  const globalTelemetryPort = readGlobalTelemetryPort();
  const localTelemetryPort = readLocalTelemetryPort();

  const telemetryWsUrl = resolveTelemetryWsUrl();
  const isHttpsPage =
    typeof window !== "undefined" &&
    window.location &&
    window.location.protocol === "https:";
  const isInsecureWsUrl =
    typeof telemetryWsUrl === "string" && telemetryWsUrl.startsWith("ws://");
  const disableInsecureBrowserTelemetry = isHttpsPage && isInsecureWsUrl;
  const telemetryWsPort =
    asFiniteNumber(TELEMETRY_CONFIG.wsPort) || extractWsPort(telemetryWsUrl);
  const telegram = resolveTelegramConfig();
  const inheritedCfg = readGlobalObject("AL_BOTS_CONFIG");
  const baseCfg =
    (window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
      ? window.AL_BOTS_CONFIG
      : inheritedCfg) || {};

  const nextCfg = {
    ...baseCfg,
  };

  if (telemetryWsUrl) {
    const baseTelemetry =
      baseCfg.telemetry && typeof baseCfg.telemetry === "object"
        ? baseCfg.telemetry
        : {};

    nextCfg.telemetry = {
      ...baseTelemetry,
      enabled: !disableInsecureBrowserTelemetry,
      wsUrl: telemetryWsUrl,
      wsPort: telemetryWsPort,
    };

    if (telemetryWsPort) {
      window.TELEMETRY_WS_PORT = telemetryWsPort;
    }

    if (disableInsecureBrowserTelemetry) {
      console.warn(
        `[ALBots telemetry bootstrap] telemetry disabled: https page cannot use insecure websocket URL ${telemetryWsUrl}. Use wss://... if you need telemetry in browser mode.`,
      );
    }
  }

  if (telegram) {
    const baseTelegram =
      baseCfg.telegram && typeof baseCfg.telegram === "object"
        ? baseCfg.telegram
        : {};
    nextCfg.telegram = {
      ...baseTelegram,
      ...telegram,
    };

    if (telegram.token) {
      window.TELEGRAM_TOKEN = telegram.token;
    }
    if (telegram.chatId) {
      window.TELEGRAM_CHAT_ID = telegram.chatId;
    }
  }

  if (!telemetryWsUrl && !telegram && !window.AL_BOTS_CONFIG) {
    window.AL_BOTS_CONFIG = {};
    return;
  }

  window.AL_BOTS_CONFIG = nextCfg;

  try {
    const cfgTelemetry =
      nextCfg?.telemetry && typeof nextCfg.telemetry === "object"
        ? nextCfg.telemetry
        : null;
    console.warn(
      `[ALBots telemetry bootstrap] resolved wsUrl=${cfgTelemetry?.wsUrl || "n/a"} wsPort=${cfgTelemetry?.wsPort || "n/a"} globalUrl=${globalTelemetryUrl || "n/a"} localUrl=${localTelemetryUrl || "n/a"} globalPort=${globalTelemetryPort || "n/a"} localPort=${localTelemetryPort || "n/a"}`,
    );
  } catch {
    // ignore diagnostics failures
  }
};

module.exports = {
  applyTelemetryBootstrap,
};
