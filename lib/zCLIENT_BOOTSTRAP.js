if (typeof require !== "function") performance_trick();
try {
  const { webFrame } = require("electron");
  function zoom(zoomFactor) {
    webFrame.setZoomFactor(zoomFactor);
  }
  zoom(0.5);
} catch (e) {
  console.log(e);
}

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

const pickFirstDefined = (keys, mapper) => {
  for (const key of keys) {
    const value = mapper(storageGet(key));
    if (value !== undefined && value !== null) return value;
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

  const LOCAL_LOADING_DEFAULTS = Object.freeze({
    enabled: true,
    fallbackToRemote: true,
    baseDir: null,
  });

  const getLocalLoadingConfig = () => {
    const userCfg =
      (typeof window !== "undefined" && window.AL_BOTS_LOCAL_LOADING) || null;
    const cfg = {
      ...LOCAL_LOADING_DEFAULTS,
      ...(userCfg && typeof userCfg === "object" ? userCfg : {}),
    };
    cfg.enabled = Boolean(cfg.enabled);
    cfg.fallbackToRemote = Boolean(cfg.fallbackToRemote);
    cfg.baseDir = typeof cfg.baseDir === "string" ? cfg.baseDir.trim() : null;
    return cfg;
  };

  let localCodesBasePromise = null;

  const getNodeRequire = () => {
    if (typeof window === "undefined") return null;
    if (typeof window.require === "function")
      return window.require.bind(window);
    if (
      typeof window.parent !== "undefined" &&
      typeof window.parent.require === "function"
    ) {
      return window.parent.require.bind(window.parent);
    }
    return null;
  };

  const uniqueNonEmpty = (items) => {
    const out = [];
    for (const item of items) {
      if (!item) continue;
      if (!out.includes(item)) out.push(item);
    }
    return out;
  };

  const normalizeRegionToken = (value) => {
    if (typeof value !== "string") return null;
    const v = value.trim();
    if (!v) return null;
    if (v.includes("_")) return v.split("_")[0] || null;
    return v;
  };

  const resolveLocalCodesBase = async (localCfg) => {
    if (localCfg && localCfg.baseDir) return localCfg.baseDir;

    const nodeRequire = getNodeRequire();
    if (!nodeRequire) return null;

    let electron = null;
    let fs = null;
    let path = null;
    try {
      electron = nodeRequire("electron");
      fs = nodeRequire("fs");
      path = nodeRequire("path");
    } catch {
      return null;
    }

    const app = electron && electron.remote && electron.remote.app;
    if (!app || !fs || !path) return null;

    const appDataRoot = path.join(app.getPath("appData"), app.getName());
    const uid = String(
      (typeof window !== "undefined" &&
        (window.user_id || window.parent?.user_id)) ||
        "",
    ).trim();

    const region = normalizeRegionToken(
      (typeof window !== "undefined" &&
        (window.server_region ||
          window.parent?.server_region ||
          window.server?.region ||
          window.parent?.server?.region)) ||
        "",
    );

    const autosyncNames = uniqueNonEmpty([
      uid && region ? `autosync${region}_${uid}` : null,
      uid && region ? `autosync${region}${uid}` : null,
      uid ? `autosync${uid}` : null,
    ]);

    try {
      const entries = await fs.promises.readdir(appDataRoot, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (!entry || !entry.isDirectory || !entry.isDirectory()) continue;
        if (!entry.name || !entry.name.startsWith("autosync")) continue;
        if (uid && !entry.name.includes(uid)) continue;
        autosyncNames.push(entry.name);
      }
    } catch {
      // ignore and continue with generated candidates
    }

    for (const autosyncName of uniqueNonEmpty(autosyncNames)) {
      const candidate = path.join(
        appDataRoot,
        autosyncName,
        "adventureland",
        "codes",
      );
      try {
        await fs.promises.access(candidate);
        return candidate;
      } catch {
        // try next
      }
    }

    return null;
  };

  const getLocalCodesBase = (localCfg) => {
    if (!localCodesBasePromise) {
      localCodesBasePromise = resolveLocalCodesBase(localCfg);
    }
    return localCodesBasePromise;
  };

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

  const withCacheBust = (url) =>
    `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`;

  const fetchModuleText = async (url) => {
    const response = await fetch(withCacheBust(url), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.text();
  };

  const fetchLocalModuleText = async (file_name, localCfg) => {
    const nodeRequire = getNodeRequire();
    if (!nodeRequire) throw new Error("Node require is unavailable");

    const fs = nodeRequire("fs");
    const path = nodeRequire("path");
    const baseDir = await getLocalCodesBase(localCfg);
    if (!baseDir) {
      throw new Error("Unable to resolve local AppData codes directory");
    }

    const absolutePath = path.join(baseDir, file_name);
    return fs.promises.readFile(absolutePath, "utf8");
  };

  const handler = async (file_name) => {
    const localCfg = getLocalLoadingConfig();
    const localLabel = file_name;
    const remoteUrl = WEB_BASE + file_name;
    let localError = null;

    if (localCfg.enabled) {
      try {
        return await fetchLocalModuleText(file_name, localCfg);
      } catch (e) {
        localError = e;
        if (!localCfg.fallbackToRemote) {
          const msg = e && e.message ? e.message : String(e);
          throw new Error(
            `proxied_require local load failed for ${localLabel}: ${msg}`,
          );
        }
      }
    }

    try {
      return await fetchModuleText(remoteUrl);
    } catch (e) {
      const remoteMsg = e && e.message ? e.message : String(e);
      const localMsg =
        localError && localError.message ? localError.message : localError;
      throw new Error(
        localError
          ? `proxied_require failed local (${localLabel}: ${localMsg}) and remote (${remoteUrl}: ${remoteMsg})`
          : `proxied_require failed to fetch ${remoteUrl} (${remoteMsg})`,
      );
    }
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

  // Keep these null in public repo; set privately via window/localStorage.
  wsHost: "localhost",
  wsPort: 8787,
  wsUrl: null,

  // Repo-safe mode: local runtime can inject private telemetry endpoint.
  allowRuntimeOverrides: true,
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

const SWAP_ROUTING_DEFAULTS = Object.freeze({
  enabled: true,
  hookName: "AL_BOTS_ROUTE_CHARACTER",
  serverRegion: null,
  serverIdentifier: null,
  navigateImmediately: false,
  allowRuntimeOverrides: true,
});

const SWAP_ROUTING_LAST_REQUEST_STORAGE_KEY = "albots:swapRouting:lastRequest";

const SWAP_ROUTING_ENABLED_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_ENABLED",
  "albots:swapRouting:enabled",
];

const SWAP_ROUTING_HOOK_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_HOOK",
  "albots:swapRouting:hookName",
];

const SWAP_ROUTING_REGION_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_SERVER_REGION",
  "albots:swapRouting:serverRegion",
];

const SWAP_ROUTING_IDENTIFIER_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_SERVER_IDENTIFIER",
  "albots:swapRouting:serverIdentifier",
];

const SWAP_ROUTING_NAVIGATE_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_NAVIGATE",
  "albots:swapRouting:navigateImmediately",
];

const asTrimmedString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const asBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;

  const lowered = value.trim().toLowerCase();
  if (!lowered) return null;
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  return null;
};

const getCurrentServerRegion = () =>
  asTrimmedString(
    window?.server_region ||
      window?.parent?.server_region ||
      window?.server?.region ||
      window?.parent?.server?.region,
  );

const getCurrentServerIdentifier = () =>
  asTrimmedString(
    window?.server_identifier ||
      window?.parent?.server_identifier ||
      window?.server?.id ||
      window?.parent?.server?.id,
  );

const normalizeSwapRoutingConfig = (cfg = {}) => ({
  enabled: Boolean(cfg.enabled),
  hookName: asTrimmedString(cfg.hookName) || SWAP_ROUTING_DEFAULTS.hookName,
  serverRegion: asTrimmedString(cfg.serverRegion) || getCurrentServerRegion(),
  serverIdentifier:
    asTrimmedString(cfg.serverIdentifier) || getCurrentServerIdentifier(),
  navigateImmediately: Boolean(cfg.navigateImmediately),
  allowRuntimeOverrides: cfg.allowRuntimeOverrides !== false,
});

const buildCharacterRouteHref = ({
  targetName,
  serverRegion,
  serverIdentifier,
} = {}) => {
  const resolvedTarget = asTrimmedString(targetName);
  const resolvedRegion =
    asTrimmedString(serverRegion) || getCurrentServerRegion();
  const resolvedIdentifier =
    asTrimmedString(serverIdentifier) || getCurrentServerIdentifier();

  if (!resolvedTarget || !resolvedRegion || !resolvedIdentifier) return null;

  return `/character/${encodeURIComponent(resolvedTarget)}/in/${encodeURIComponent(
    resolvedRegion,
  )}/${encodeURIComponent(resolvedIdentifier)}/`;
};

const persistSwapRoutingRequest = (payload) => {
  try {
    if (typeof window !== "undefined") {
      window.AL_BOTS_LAST_SWAP_ROUTE = payload;
    }
  } catch {
    // ignore
  }

  try {
    storageSet(SWAP_ROUTING_LAST_REQUEST_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const normalizeSwapRoutingPayload = ({ route, targetName, ...rest } = {}) => {
  const href =
    asTrimmedString(route?.href) ||
    buildCharacterRouteHref({
      targetName,
      serverRegion: route?.serverRegion,
      serverIdentifier: route?.serverIdentifier,
    });

  return {
    ...rest,
    targetName:
      asTrimmedString(targetName) || asTrimmedString(route?.targetName),
    route: href
      ? {
          ...(route && typeof route === "object" ? route : {}),
          href,
          serverRegion: asTrimmedString(route?.serverRegion) || null,
          serverIdentifier: asTrimmedString(route?.serverIdentifier) || null,
        }
      : route || null,
  };
};

const applySwapRoutingPayload = (payload, { navigate = true } = {}) => {
  const normalized = normalizeSwapRoutingPayload(payload || {});
  const href = asTrimmedString(normalized?.route?.href);

  if (!href) {
    return {
      ok: false,
      handled: false,
      reason: "missing-href",
      payload: normalized,
    };
  }

  persistSwapRoutingRequest(normalized);

  if (!navigate) {
    return {
      ok: true,
      handled: false,
      pending: true,
      href,
      payload: normalized,
    };
  }

  try {
    parent.window.location.href = href;
    return {
      ok: true,
      handled: true,
      navigated: true,
      href,
      payload: normalized,
    };
  } catch (e) {
    return {
      ok: false,
      handled: false,
      href,
      payload: normalized,
      error: e,
    };
  }
};

const resolveSwapRoutingConfig = () => {
  try {
    const runtimeCfg =
      typeof window !== "undefined" &&
      window.AL_BOTS_SWAP_ROUTING &&
      typeof window.AL_BOTS_SWAP_ROUTING === "object"
        ? window.AL_BOTS_SWAP_ROUTING
        : null;

    const merged = {
      ...SWAP_ROUTING_DEFAULTS,
      ...(runtimeCfg || {}),
    };

    if (merged.allowRuntimeOverrides !== false) {
      const enabled = pickFirstDefined(
        SWAP_ROUTING_ENABLED_STORAGE_KEYS,
        asBoolean,
      );
      const hookName = pickFirstDefined(
        SWAP_ROUTING_HOOK_STORAGE_KEYS,
        asTrimmedString,
      );
      const serverRegion = pickFirstDefined(
        SWAP_ROUTING_REGION_STORAGE_KEYS,
        asTrimmedString,
      );
      const serverIdentifier = pickFirstDefined(
        SWAP_ROUTING_IDENTIFIER_STORAGE_KEYS,
        asTrimmedString,
      );
      const navigateImmediately = pickFirstDefined(
        SWAP_ROUTING_NAVIGATE_STORAGE_KEYS,
        asBoolean,
      );

      if (enabled !== null) merged.enabled = enabled;
      if (hookName) merged.hookName = hookName;
      if (serverRegion) merged.serverRegion = serverRegion;
      if (serverIdentifier) merged.serverIdentifier = serverIdentifier;
      if (navigateImmediately !== null) {
        merged.navigateImmediately = navigateImmediately;
      }
    }

    return normalizeSwapRoutingConfig(merged);
  } catch {
    return normalizeSwapRoutingConfig(SWAP_ROUTING_DEFAULTS);
  }
};

const installSwapRoutingHook = (swapRouting) => {
  try {
    if (typeof window === "undefined") return null;

    const cfg = normalizeSwapRoutingConfig(swapRouting);
    const hookName = cfg.hookName || SWAP_ROUTING_DEFAULTS.hookName;
    const existing = window[hookName];
    if (
      typeof existing === "function" &&
      existing.__AL_BOTS_AUTO_ROUTE_HOOK__ !== true
    ) {
      return existing;
    }

    const autoHook = ({ route, targetName, ...rest } = {}) => {
      const payload = normalizeSwapRoutingPayload({
        ...rest,
        targetName,
        route: {
          ...(route && typeof route === "object" ? route : {}),
          serverRegion:
            asTrimmedString(route?.serverRegion) || cfg.serverRegion || null,
          serverIdentifier:
            asTrimmedString(route?.serverIdentifier) ||
            cfg.serverIdentifier ||
            null,
        },
      });

      try {
        console.log("[ALBots swap-routing] route requested", payload);
      } catch {
        // ignore
      }

      persistSwapRoutingRequest(payload);

      if (cfg.enabled && cfg.navigateImmediately) {
        return applySwapRoutingPayload(payload, { navigate: true });
      }

      return {
        ok: true,
        handled: false,
        pending: true,
        href: payload?.route?.href || null,
        payload,
      };
    };

    autoHook.__AL_BOTS_AUTO_ROUTE_HOOK__ = true;
    window[hookName] = autoHook;
    window.AL_BOTS_BUILD_CHARACTER_ROUTE = buildCharacterRouteHref;
    window.AL_BOTS_APPLY_SWAP_ROUTE = (payload) =>
      applySwapRoutingPayload(payload, { navigate: true });
    window.AL_BOTS_APPLY_LAST_SWAP_ROUTE = () =>
      applySwapRoutingPayload(window.AL_BOTS_LAST_SWAP_ROUTE, {
        navigate: true,
      });

    return autoHook;
  } catch {
    return null;
  }
};

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

(async () => {
  try {
    if (typeof window !== "undefined") {
      const telemetryWsUrl = resolveTelemetryWsUrl();
      const telemetryWsPort =
        asFiniteNumber(TELEMETRY_CONFIG.wsPort) ||
        extractWsPort(telemetryWsUrl);
      const swapRouting = resolveSwapRoutingConfig();
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

      const currentCfg =
        window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
          ? window.AL_BOTS_CONFIG
          : {};
      const baseSwapRouting =
        currentCfg.swapRouting && typeof currentCfg.swapRouting === "object"
          ? currentCfg.swapRouting
          : {};

      window.AL_BOTS_CONFIG = {
        ...currentCfg,
        swapRouting: {
          ...baseSwapRouting,
          enabled: swapRouting.enabled,
          hookName: swapRouting.hookName,
          serverRegion: swapRouting.serverRegion,
          serverIdentifier: swapRouting.serverIdentifier,
        },
      };

      installSwapRoutingHook(swapRouting);
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
