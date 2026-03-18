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

const createProxiedRequire = () => {
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework-refactor/";
  const FOLDER = "lib/";
  // NOTE: keep this as a runtime string-eval to avoid Babel down-leveling
  // `(async () => {}).constructor` into a plain Function constructor.
  // We need the real AsyncFunction constructor so top-level `await` in
  // dynamically loaded modules parses correctly.
  const AsyncFunction = Function("return (async function () {}).constructor")();
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
    const data = await handler(FOLDER + normalized);
    let func;
    try {
      func = new AsyncFunction("module", "exports", "require", data);
    } catch (e) {
      const msg = e && e.message ? e.message : String(e);
      throw new SyntaxError(
        `proxied_require failed to compile module ${FOLDER + normalized}: ${msg}`,
      );
    }
    const _module = { exports: {} };

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
    const lib_name = lib_key_from_name(normalized);
    if (!module_cache.has(normalized)) {
      module_cache.set(normalized, run(path_name, normalized, handler));
    }
    ret[lib_name] = (await module_cache.get(normalized)).exports;
  };

  async function proxied_require(...libraries) {
    const path_name = this?.name ?? character.name + ".js";
    const ret = {};
    await Promise.all(
      libraries.map((name) => get_module(path_name, ret, name, handler)),
    );
    return ret;
  }

  proxied_require.startRemoteReloadWatcher = startRemoteReloadWatcher;

  return proxied_require;
};

module.exports = {
  createProxiedRequire,
};
