const storageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const pickFirst = (keys, mapper) => {
  for (const key of keys) {
    const value = mapper(storageGet(key));
    if (value) return value;
  }
  return null;
};

const proxied_require = (() => {
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework/";
  const FOLDER = "lib/";
  const AsyncFunction = (async () => {}).constructor;
  const module_cache = new Map();
  const OPTIONAL_EXTERNAL_MODULES = Object.freeze({
    dotenv: Object.freeze({ config: () => ({ parsed: {} }) }),
    "node:dotenv": Object.freeze({ config: () => ({ parsed: {} }) }),
    "dotenv/config": Object.freeze({}),
  });

  const REMOTE_RELOAD_DEFAULTS = Object.freeze({
    enabled: true,
    intervalMs: 60000,
    github: Object.freeze({
      owner: "probablyanocelot",
      repo: "AdventureLandBots",
      ref: "rework",
    }),
  });

  const getRemoteReloadConfig = () => {
    const userCfg =
      (typeof window !== "undefined" && window.AL_BOTS_REMOTE_RELOAD) || null;
    const cfg = {
      ...REMOTE_RELOAD_DEFAULTS,
      ...(userCfg && typeof userCfg === "object" ? userCfg : {}),
    };
    const userGithub =
      userCfg && typeof userCfg.github === "object" ? userCfg.github : null;

    cfg.intervalMs = Math.max(
      5000,
      Number(cfg.intervalMs || REMOTE_RELOAD_DEFAULTS.intervalMs),
    );
    cfg.enabled = Boolean(cfg.enabled);
    cfg.github = {
      ...REMOTE_RELOAD_DEFAULTS.github,
      ...(userGithub || {}),
    };

    return cfg;
  };

  const shaStorageKeys = (github) => {
    const id = `${github.owner}/${github.repo}@${github.ref}`;
    return {
      sha: `albots:remoteReload:sha:${id}`,
      lastFetch: `albots:remoteReload:lastFetch:${id}`,
      lastError: `albots:remoteReload:lastError:${id}`,
    };
  };

  const fetchLatestGithubSha = async (github) => {
    const url = `https://api.github.com/repos/${encodeURIComponent(github.owner)}/${encodeURIComponent(github.repo)}/commits/${encodeURIComponent(github.ref)}`;
    const resp = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
      },
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(
        `GitHub SHA check failed (HTTP ${resp.status}): ${text.slice(0, 200)}`,
      );
    }
    const data = await resp.json();
    return data && typeof data.sha === "string" ? data.sha : null;
  };

  const startRemoteReloadWatcher = () => {
    const cfg = getRemoteReloadConfig();
    if (!cfg.enabled) return;

    const github = cfg.github;
    const keys = shaStorageKeys(github);
    const pathName =
      (typeof window !== "undefined" &&
        window.location &&
        window.location.pathname) ||
      "";
    const label = `[ALBots remote-reload ${github.owner}/${github.repo}@${github.ref}]`;

    let localBaseline = null;
    let initialized = false;

    const readStoredSha = () => storageGet(keys.sha);
    const writeStoredSha = (sha) => storageSet(keys.sha, sha);
    const readLastFetch = () => Number(storageGet(keys.lastFetch) || 0);
    const writeLastFetch = (ts) => storageSet(keys.lastFetch, ts);
    const writeLastError = (msg) => storageSet(keys.lastError, msg);

    const maybeReloadIfChanged = (latestSha) => {
      if (!latestSha) return;

      if (!initialized) {
        initialized = true;
        localBaseline = latestSha;
        writeStoredSha(latestSha);
        console.log(
          `${label} baseline set to ${latestSha.slice(0, 7)} (${pathName})`,
        );
        return;
      }

      if (localBaseline && latestSha !== localBaseline) {
        console.log(
          `${label} detected change ${String(localBaseline).slice(0, 7)} -> ${latestSha.slice(0, 7)}; reloading (${pathName})`,
        );
        window.location.reload();
      }
    };

    const tick = async () => {
      const storedSha = readStoredSha();
      if (storedSha && initialized) maybeReloadIfChanged(storedSha);

      const now = Date.now();
      const lastFetch = readLastFetch();
      if (now - lastFetch < cfg.intervalMs) return;

      writeLastFetch(now);

      try {
        const latestSha = await fetchLatestGithubSha(github);
        if (latestSha) {
          writeStoredSha(latestSha);
          maybeReloadIfChanged(latestSha);
        }
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        writeLastError(`${new Date().toISOString()} ${msg}`);
        if (Math.random() < 0.1) console.log(`${label} check failed: ${msg}`);
      }
    };

    setInterval(tick, 5000);
    tick();
  };

  const resolveRelativePath = (basePath, relPath) => {
    if (!relPath) return relPath;

    const baseParts = String(basePath || "")
      .split("/")
      .filter(Boolean);
    // Drop filename if present.
    if (baseParts.length && baseParts[baseParts.length - 1].includes(".")) {
      baseParts.pop();
    }

    const relParts = String(relPath).split("/").filter(Boolean);

    const stack = [...baseParts];
    for (const part of relParts) {
      if (part === ".") continue;
      if (part === "..") {
        if (stack.length) stack.pop();
        continue;
      }
      stack.push(part);
    }

    return stack.join("/");
  };

  const normalize_module_name = (name, basePath) => {
    if (typeof name !== "string") return name;
    let n = name.trim();

    if (n.startsWith("./") || n.startsWith("../")) {
      n = resolveRelativePath(basePath, n);
    }

    n = n.replace(/^\//, "");

    n = n.replace(/^lib\//, "");
    n = n.replace(/^\/lib\//, "");

    if (!/\.[a-z0-9]+$/i.test(n)) n += ".js";

    return n;
  };

  const lib_key_from_name = (name) => {
    const base = String(name).split("/").pop();
    return base.split(".")[0];
  };

  const isBareSpecifier = (name) => {
    if (typeof name !== "string") return false;
    const n = name.trim();
    return (
      Boolean(n) &&
      !n.startsWith("./") &&
      !n.startsWith("../") &&
      !n.startsWith("/")
    );
  };

  const resolveExternalModule = (reqName) => {
    if (!isBareSpecifier(reqName)) return null;

    const n = reqName.trim();
    if (Object.prototype.hasOwnProperty.call(OPTIONAL_EXTERNAL_MODULES, n)) {
      return OPTIONAL_EXTERNAL_MODULES[n];
    }

    if (typeof window !== "undefined" && typeof window.require === "function") {
      try {
        return window.require(n);
      } catch {
        return undefined;
      }
    }

    return undefined;
  };

  const handler = async (file_name) => {
    // Bust caches so freshly pushed changes can be fetched immediately.
    // GitHub raw is CDN-backed; a cache-busting query string is the most reliable.
    const url = WEB_BASE + file_name + `?cb=${Date.now()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(
        `proxied_require failed to fetch ${url} (HTTP ${response.status})`,
      );
    }
    return response.text();
  };

  const run = async (path_name, name, handler) => {
    const normalized = normalize_module_name(name);
    let data = await handler(FOLDER + normalized);
    let func = new AsyncFunction("module", "exports", "require", data);
    let _module = { exports: {} };

    const localRequire = async (reqName) => {
      const external = resolveExternalModule(reqName);
      if (external !== null) {
        if (external !== undefined) return external;
        throw new Error(
          `External module not available in remote loader: ${reqName}`,
        );
      }

      const normalizedReq = normalize_module_name(reqName, normalized);
      const libs = await proxied_require(normalizedReq);
      return libs[lib_key_from_name(normalizedReq)];
    };

    await func(
      _module,
      _module.exports,
      localRequire.bind({ name: path_name + ":" + normalized }),
    );
    return _module;
  };

  const get_module = async (path_name, ret, name, handler) => {
    const normalized = normalize_module_name(name);
    let lib_name = lib_key_from_name(normalized);
    if (!module_cache.has(normalized)) {
      module_cache.set(normalized, run(path_name, normalized, handler));
    }
    ret[lib_name] = (await module_cache.get(normalized)).exports;
  };

  async function proxied_require(...libraries) {
    const path_name = this?.name ?? character.name + ".js";
    let ret = {};
    await Promise.all(
      libraries.map((name) => get_module(path_name, ret, name, handler)),
    );
    return ret;
  }

  proxied_require.startRemoteReloadWatcher = startRemoteReloadWatcher;

  return proxied_require;
})();

const TELEMETRY_CONFIG = Object.freeze({
  // One place, one switch.
  enabled: true,

  // Preferred: set full ws:// or wss:// URL here.
  wsUrl: null,

  // If wsUrl is null, fallback to ws://<wsHost>:<wsPort>.
  wsHost: "localhost",
  wsPort: null,

  // Keep false for strict "one place" behavior.
  // Set true only if you want window/localStorage to override this file.
  allowRuntimeOverrides: false,
});

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

const readLocalTelemetryUrl = () => {
  return pickFirst(TELEMETRY_URL_STORAGE_KEYS, asWsUrl);
};

const readLocalTelemetryPort = () => {
  return pickFirst(TELEMETRY_PORT_STORAGE_KEYS, asFiniteNumber);
};

const resolveTelemetryWsUrl = () => {
  try {
    if (!TELEMETRY_CONFIG.enabled) return null;

    const configHost =
      typeof TELEMETRY_CONFIG.wsHost === "string"
        ? TELEMETRY_CONFIG.wsHost.trim()
        : "";
    const preferredHost = configHost || "localhost";

    if (TELEMETRY_CONFIG.allowRuntimeOverrides) {
      const globalUrl = asWsUrl(window?.TELEMETRY_WS_URL);
      if (globalUrl) return globalUrl;

      const localUrl = readLocalTelemetryUrl();
      if (localUrl) return localUrl;

      const globalPort = asFiniteNumber(window?.TELEMETRY_WS_PORT);
      if (globalPort) return buildLocalTelemetryUrl(preferredHost, globalPort);

      const localPort = readLocalTelemetryPort();
      if (localPort) return buildLocalTelemetryUrl(preferredHost, localPort);
    }

    const configUrl = asWsUrl(TELEMETRY_CONFIG.wsUrl);
    if (configUrl) return configUrl;

    const configPort = asFiniteNumber(TELEMETRY_CONFIG.wsPort);
    if (configPort) return buildLocalTelemetryUrl(preferredHost, configPort);
  } catch {
    // ignore
  }
  return null;
};

(async () => {
  try {
    if (typeof window !== "undefined") {
      const telemetryWsUrl = resolveTelemetryWsUrl();
      const telemetryWsPort =
        asFiniteNumber(TELEMETRY_CONFIG.wsPort) ||
        extractWsPort(telemetryWsUrl);
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
    }
  } catch (e) {
    console.log("Failed to set AL_BOTS_CONFIG:", e);
  }

  const libs = await proxied_require("al_main.js");
  const entry = libs.al_main || libs.main;
  if (!entry || typeof entry.main !== "function") {
    throw new Error(
      `Entry module not found or invalid. Expected libs.al_main/main with exported main(). Keys: ${Object.keys(libs || {}).join(", ")}`,
    );
  }
  const { main } = entry;

  try {
    window.AL_BOTS = entry;
    Object.defineProperty(window, "bot", {
      configurable: true,
      get: () => entry.bot,
    });
  } catch (e) {
    console.log("Failed to expose AL_BOTS globals:", e);
  }

  window.main = main; // <-- REQUIRED
  await main();

  try {
    if (typeof proxied_require.startRemoteReloadWatcher === "function") {
      proxied_require.startRemoteReloadWatcher();
    }
  } catch (e) {
    console.log("Remote reload watcher failed to start:", e);
  }
})();
