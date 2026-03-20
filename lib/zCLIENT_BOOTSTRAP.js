const RAW_BASE =
  "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework-restructure/";
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

const resolveLocalCodesBase = async () => {
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
  const url = withCacheBust(`${RAW_BASE}${relativePath}`);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${url})`);
  }
  return response.text();
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
