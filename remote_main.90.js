const proxied_require = (() => {
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework/";
  const FOLDER = "/lib/";
  const AsyncFunction = (async () => {}).constructor;
  const module_cache = new Map();

  // --- Remote reload watcher -------------------------------------------------
  // Goal: reload the whole page/iframe when the remote branch changes.
  // Why here? This file is the bootstrap that always runs first.
  //
  // Default behavior:
  // - Checks GitHub for the latest commit SHA for the configured ref.
  // - Stores SHA + last fetch time in localStorage so multiple characters/tabs
  //   don't hammer the GitHub API.
  //
  // Config override (optional) from console/snippet:
  //   window.AL_BOTS_REMOTE_RELOAD = { enabled: true, intervalMs: 60000 }
  //   window.AL_BOTS_REMOTE_RELOAD = { enabled: false }
  const REMOTE_RELOAD_DEFAULTS = Object.freeze({
    enabled: true,
    // Conservative: GitHub unauthenticated rate limit is low; this is shared via
    // localStorage across all your open characters.
    intervalMs: 60000,
    // If you change WEB_BASE, update these too (or set window.AL_BOTS_REMOTE_RELOAD.github)
    github: Object.freeze({
      owner: "probablyanocelot",
      repo: "AdventureLandBots",
      ref: "rework",
    }),
  });

  const getRemoteReloadConfig = () => {
    const userCfg =
      (typeof window !== "undefined" && window.AL_BOTS_REMOTE_RELOAD) || {};
    const cfg = {
      ...REMOTE_RELOAD_DEFAULTS,
      ...(userCfg && typeof userCfg === "object" ? userCfg : {}),
    };
    // Normalize
    cfg.intervalMs = Math.max(
      5000,
      Number(cfg.intervalMs || REMOTE_RELOAD_DEFAULTS.intervalMs),
    );
    cfg.enabled = Boolean(cfg.enabled);
    if (!cfg.github) cfg.github = REMOTE_RELOAD_DEFAULTS.github;
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

  const safeNow = () => Date.now();

  const fetchLatestGithubSha = async (github) => {
    // Uses GitHub API (CORS-friendly) so any repo change triggers reload.
    // Endpoint: GET /repos/{owner}/{repo}/commits/{ref}
    const url = `https://api.github.com/repos/${encodeURIComponent(github.owner)}/${encodeURIComponent(github.repo)}/commits/${encodeURIComponent(github.ref)}`;
    const resp = await fetch(url, {
      method: "GET",
      // Ensure we don't get a cached response from the browser.
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

    // Local (in-memory) baseline for this iframe.
    let localBaseline = null;
    let initialized = false;

    const readStoredSha = () => {
      try {
        return localStorage.getItem(keys.sha);
      } catch {
        return null;
      }
    };
    const writeStoredSha = (sha) => {
      try {
        localStorage.setItem(keys.sha, sha);
      } catch {
        // ignore
      }
    };
    const readLastFetch = () => {
      try {
        return Number(localStorage.getItem(keys.lastFetch) || 0);
      } catch {
        return 0;
      }
    };
    const writeLastFetch = (ts) => {
      try {
        localStorage.setItem(keys.lastFetch, String(ts));
      } catch {
        // ignore
      }
    };
    const writeLastError = (msg) => {
      try {
        localStorage.setItem(keys.lastError, msg);
      } catch {
        // ignore
      }
    };

    const maybeReloadIfChanged = (latestSha) => {
      if (!latestSha) return;

      // Initialize baseline first time without reloading.
      if (!initialized) {
        initialized = true;
        localBaseline = latestSha;
        writeStoredSha(latestSha);
        console.log(
          `${label} baseline set to ${latestSha.slice(0, 7)} (${pathName})`,
        );
        return;
      }

      // If local baseline differs, reload.
      if (localBaseline && latestSha !== localBaseline) {
        console.log(
          `${label} detected change ${String(localBaseline).slice(0, 7)} -> ${latestSha.slice(0, 7)}; reloading (${pathName})`,
        );
        // Hard reload of the current iframe/page.
        window.location.reload();
      }
    };

    const tick = async () => {
      // First: if another iframe already fetched and updated localStorage, react.
      const storedSha = readStoredSha();
      if (storedSha && initialized) maybeReloadIfChanged(storedSha);

      const now = safeNow();
      const lastFetch = readLastFetch();
      if (now - lastFetch < cfg.intervalMs) return;

      // Mark fetch time early to reduce stampedes across iframes.
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
        // Don’t spam the log every tick; only log occasionally.
        if (Math.random() < 0.1) console.log(`${label} check failed: ${msg}`);
      }
    };

    // Use a short internal tick for cross-iframe sync, but throttle actual API calls via localStorage.
    setInterval(() => {
      tick();
    }, 5000);

    // Kick off quickly.
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

    // Loaded code tends to use Node-ish relative paths ("./idle.js", "./merchant").
    // Our fetch base already points at the lib folder.
    if (n.startsWith("./") || n.startsWith("../")) {
      n = resolveRelativePath(basePath, n);
    }

    n = n.replace(/^\//, "");

    // Allow callers to include the folder anyway.
    n = n.replace(/^lib\//, "");
    n = n.replace(/^\/lib\//, "");

    // Default extension is .js
    if (!/\.[a-z0-9]+$/i.test(n)) n += ".js";

    return n;
  };

  const lib_key_from_name = (name) => {
    const base = String(name).split("/").pop();
    return base.split(".")[0];
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

    // Provide a Node-like require for module code:
    // `await require("./idle.js")` returns the exports object directly.
    const localRequire = async (reqName) => {
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

  // Expose the watcher so the bootstrap code can start it.
  proxied_require.startRemoteReloadWatcher = startRemoteReloadWatcher;

  return proxied_require;
})();

// Local override for telemetry websocket port when loading remote code.
// Set to a number (e.g., 8787) to enable ws://localhost:<port>.
// Leave null to keep telemetry disabled by default.
const TELEMETRY_WS_PORT = null;

try {
  if (typeof window !== "undefined") {
    window.TELEMETRY_WS_PORT = TELEMETRY_WS_PORT;
  }
} catch {
  // ignore
}

// Boot diagnostics for remote-loaded startup.
try {
  if (typeof window !== "undefined") {
    window.AL_BOTS_BOOT = {
      startedAt: new Date().toISOString(),
      stage: "bootstrap_loaded",
      ok: false,
      error: null,
    };
  }
} catch {
  // ignore
}

// Load module + expose globally
(async () => {
  const setBootStage = (stage, extras = {}) => {
    try {
      if (typeof window === "undefined") return;
      window.AL_BOTS_BOOT = {
        ...(window.AL_BOTS_BOOT || {}),
        stage,
        ...extras,
      };
    } catch {
      // ignore
    }
  };

  setBootStage("bootstrap_start");

  try {
    if (typeof window !== "undefined") {
      const telemetryWsUrl =
        typeof TELEMETRY_WS_PORT === "number" &&
        Number.isFinite(TELEMETRY_WS_PORT)
          ? `ws://localhost:${TELEMETRY_WS_PORT}`
          : null;

      const existing =
        window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
          ? window.AL_BOTS_CONFIG
          : {};
      const existingTelemetry =
        existing.telemetry && typeof existing.telemetry === "object"
          ? existing.telemetry
          : {};

      // Only inject defaults; never override an explicit user value.
      const mergedTelemetry = {
        ...existingTelemetry,
      };
      if (mergedTelemetry.enabled === undefined) {
        mergedTelemetry.enabled = Boolean(telemetryWsUrl);
      }
      if (mergedTelemetry.wsUrl === undefined) {
        mergedTelemetry.wsUrl = telemetryWsUrl;
      }

      window.AL_BOTS_CONFIG = {
        ...existing,
        telemetry: mergedTelemetry,
      };
    }
  } catch (e) {
    console.log("Failed to set AL_BOTS_CONFIG:", e);
  }

  setBootStage("fetch_al_main");
  const libs = await proxied_require("al_main.js");
  setBootStage("al_main_loaded", { libKeys: Object.keys(libs || {}) });

  const entry = libs.al_main || libs.main;
  if (!entry || typeof entry.main !== "function") {
    throw new Error(
      `Entry module not found or invalid. Expected libs.al_main/main with exported main(). Keys: ${Object.keys(libs || {}).join(", ")}`,
    );
  }
  const { main } = entry;

  // Expose exports for easy inspection from the console/snippets.
  // This keeps getters intact (e.g., AL_BOTS.bot).
  try {
    window.AL_BOTS = entry;
    Object.defineProperty(window, "bot", {
      configurable: true,
      get: () => entry.bot,
    });
  } catch (e) {
    console.log("Failed to expose AL_BOTS globals:", e);
  }

  setBootStage("before_main");
  window.main = main; // <-- REQUIRED
  await main();
  setBootStage("after_main", {
    ok: true,
    botCtor: window?.AL_BOTS?.bot?.constructor?.name || null,
  });

  // Start watching remote for changes and reload the iframe/page when detected.
  // This runs after main() starts so your bot can begin immediately.
  try {
    if (typeof proxied_require.startRemoteReloadWatcher === "function") {
      proxied_require.startRemoteReloadWatcher();
    }
  } catch (e) {
    console.log("Remote reload watcher failed to start:", e);
  }
})().catch((e) => {
  const message = e?.stack || e?.message || String(e);
  try {
    if (typeof window !== "undefined") {
      window.AL_BOTS_BOOT = {
        ...(window.AL_BOTS_BOOT || {}),
        ok: false,
        stage: "failed",
        error: message,
        failedAt: new Date().toISOString(),
      };
    }
  } catch {
    // ignore
  }

  try {
    console.log("[AL_BOTS_BOOT] startup failed:", e);
  } catch {
    // ignore
  }

  try {
    if (typeof game_log === "function") {
      game_log(
        "AL_BOTS bootstrap failed — check console + window.AL_BOTS_BOOT",
        "#FF6B6B",
      );
    }
  } catch {
    // ignore
  }

  try {
    if (typeof set_message === "function") {
      set_message("AL_BOTS FAILED (see window.AL_BOTS_BOOT)", "#FF6B6B");
    }
  } catch {
    // ignore
  }
});
