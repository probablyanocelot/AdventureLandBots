const DO_FARM_BANDAID = true;
const iFarmBandaid = () => {
  const me = character.name;

  if (character.ctype === "ranger" && me !== "camelCase") {
    const farmMap = { couplaGrapes: "rat", ReachOut: "crab" };
    const rangers = get_characters()
      .slice(0, 4)
      .filter((c) => c.type === "ranger");

    window.iFarm =
      rangers.length === 2
        ? "rat"
        : rangers.length === 3
          ? (farmMap[me] ?? window.iFarm)
          : window.iFarm;
  }
};

if (DO_FARM_BANDAID) iFarmBandaid();

const {
  TELEGRAM_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEMETRY_WS_PORT,
  LOCAL_CODES_LOCATION,
  LOCAL_CODES_HTTP_BASE,
} = require_code(99);

window.TELEGRAM_TOKEN = TELEGRAM_TOKEN;
window.TELEGRAM_CHAT_ID = TELEGRAM_CHAT_ID;
window.TELEMETRY_WS_PORT = TELEMETRY_WS_PORT;
window.LOCAL_CODES_LOCATION = LOCAL_CODES_LOCATION;
window.LOCAL_CODES_HTTP_BASE = LOCAL_CODES_HTTP_BASE;

// Local loading configuration: set these near the top for branch swaps and repo hot reloads.
const LOCAL_LOADING_CONFIG = {
  // enable local code loading when true; if a local path is present, it will also be honored.
  enabled: false,
  // fall back to remote fetch if local loading is unavailable.
  fallbackToRemote: true,
  // set an explicit code base dir, or leave null to use LOCAL_CODES_LOCATION / autosync discovery.
  baseDir: null,
};

const explicitLocalCodesPath =
  typeof LOCAL_CODES_LOCATION === "string" && LOCAL_CODES_LOCATION.trim()
    ? LOCAL_CODES_LOCATION.trim().replace(/[\\/]+$/, "")
    : null;

const localLoadingEnabled = Boolean(LOCAL_LOADING_CONFIG.enabled);

window.AL_BOTS_LOCAL_LOADING = {
  enabled: localLoadingEnabled,
  fallbackToRemote: Boolean(LOCAL_LOADING_CONFIG.fallbackToRemote),
  baseDir: localLoadingEnabled
    ? LOCAL_LOADING_CONFIG.baseDir || explicitLocalCodesPath
    : null,
};

function windowConfig() {
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
}

windowConfig();

const DEFAULT_RAW_BASE =
  "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/dev/";
const DEFAULT_RAW_BASE_NO_SLASH = DEFAULT_RAW_BASE.replace(/\/+$/, "");
const RAW_BASE =
  ((window?.LOCAL_CODES_HTTP_BASE?.trim() || "").replace(/\/+$/, "") ||
    DEFAULT_RAW_BASE_NO_SLASH) + "/";
window.RAW_BASE = RAW_BASE;
const AsyncFunction = Function("return (async function () {}).constructor")();

const withCacheBust = (url) =>
  `${url}${url.includes("?") ? "&" : "?"}cb=${Date.now()}`;

const getNodeRequire = () => {
  if (typeof window === "undefined") return null;
  if (typeof window.require === "function") return window.require.bind(window);
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

const asTrimmedNonEmptyString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const stripTrailingPathSeparators = (value) =>
  String(value).replace(/[\\/]+$/, "");

const resolveLocalCodesBase = async () => {
  const explicitBaseDir =
    asTrimmedNonEmptyString(
      window?.LOCAL_CODES_LOCATION || window?.parent?.LOCAL_CODES_LOCATION,
    ) || null;
  if (explicitBaseDir) {
    const normalized = stripTrailingPathSeparators(explicitBaseDir);
    console.warn("[ALBots loader] using local codes path:", normalized);
    console.info(
      "[ALBots loader] Bypass remote config via LOCAL_CODES_LOCATION",
      normalized,
    );
    return normalized;
  }

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
    // ignore
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

const readLocalModuleText = async (relativePath) => {
  const nodeRequire = getNodeRequire();
  if (!nodeRequire) return null;

  const fs = nodeRequire("fs");
  const path = nodeRequire("path");
  const baseDir = await resolveLocalCodesBase();
  if (!baseDir) return null;

  const absolutePath = path.join(baseDir, relativePath);
  return fs.promises.readFile(absolutePath, "utf8");
};

const fetchRemoteModuleText = async (relativePath) => {
  const primaryUrl = withCacheBust(`${RAW_BASE}${relativePath}`);

  const attemptFetch = async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} (${url})`);
    }
    return response.text();
  };

  try {
    return await attemptFetch(primaryUrl);
  } catch (primaryError) {
    const primaryMsg =
      primaryError && primaryError.message
        ? primaryError.message
        : String(primaryError);
    if (RAW_BASE !== DEFAULT_RAW_BASE) {
      const fallbackUrl = withCacheBust(`${DEFAULT_RAW_BASE}${relativePath}`);
      try {
        console.warn(
          `[ALBots loader] Remote host ${RAW_BASE} failed for ${relativePath}; falling back to ${DEFAULT_RAW_BASE}`,
        );
        return await attemptFetch(fallbackUrl);
      } catch (fallbackError) {
        const fallbackMsg =
          fallbackError && fallbackError.message
            ? fallbackError.message
            : String(fallbackError);
        throw new Error(
          `HTTP fetch failed for both ${primaryUrl} (${primaryMsg}) and ${fallbackUrl} (${fallbackMsg})`,
        );
      }
    }
    throw new Error(`HTTP fetch failed for ${primaryUrl} (${primaryMsg})`);
  }
};

const loadModuleText = async (relativePath) => {
  try {
    const local = await readLocalModuleText(relativePath);
    if (typeof local === "string") return local;
  } catch (e) {
    console.log(
      `[ALBots entry] local load failed (${relativePath}):`,
      e && e.message ? e.message : e,
    );
  }

  return fetchRemoteModuleText(relativePath);
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

const normalizeModuleName = (name, basePath) => {
  if (typeof name !== "string") return name;
  let n = name.trim();
  if (n.startsWith("./") || n.startsWith("../")) {
    n = resolveRelativePath(basePath, n);
  }
  n = n.replace(/^\//, "");
  if (!/\.[a-z0-9]+$/i.test(n)) n += ".js";
  return n;
};

const moduleSources = new Map();
const moduleExports = new Map();

const preloadModuleSource = async (relativePath) => {
  const normalized = normalizeModuleName(relativePath);
  if (moduleSources.has(normalized)) return;
  const source = await loadModuleText(normalized);
  moduleSources.set(normalized, source);
};

const evalModule = async (relativePath) => {
  const normalized = normalizeModuleName(relativePath);
  if (moduleExports.has(normalized)) return moduleExports.get(normalized);

  const source = moduleSources.get(normalized);
  if (!source) {
    throw new Error(
      `Module source not preloaded: ${normalized}. Add to BOOTSTRAP_DEPS if needed.`,
    );
  }

  const module = { exports: {} };
  const localRequire = (name) => {
    const resolved = normalizeModuleName(name, normalized);
    if (!moduleExports.has(resolved)) {
      throw new Error(
        `Module not preloaded for sync require: ${resolved}. Add to BOOTSTRAP_DEPS if needed.`,
      );
    }
    return moduleExports.get(resolved);
  };

  const fn = new AsyncFunction("module", "exports", "require", source);
  await fn(module, module.exports, localRequire);
  moduleExports.set(normalized, module.exports);
  return module.exports;
};

const BOOTSTRAP_DEPS = [
  "lib/bootstrap/proxied_require.js",
  "lib/bootstrap/telemetry_bootstrap.js",
  "lib/bootstrap/swap_routing_bootstrap.js",
  "lib/bootstrap/index.js",
];

const run = async () => {
  await Promise.all(BOOTSTRAP_DEPS.map(preloadModuleSource));
  await evalModule("lib/bootstrap/proxied_require.js");
  await evalModule("lib/bootstrap/telemetry_bootstrap.js");
  await evalModule("lib/bootstrap/swap_routing_bootstrap.js");

  const bootstrap = await evalModule("lib/bootstrap/index.js");
  if (!bootstrap || typeof bootstrap.runClientBootstrap !== "function") {
    throw new Error(
      `bootstrap index missing runClientBootstrap (keys: ${Object.keys(bootstrap || {}).join(", ")})`,
    );
  }

  await bootstrap.runClientBootstrap();
};

run().catch((err) => {
  console.log(
    "[ALBots entry] bootstrap failed:",
    err && err.message ? err.message : err,
  );
});
