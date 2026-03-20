const RAW_BASE =
  "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework-refactor/";
const PROXIED_REQUIRE_PATH = "lib/bootstrap/proxied_require.js";
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

const loadModuleExports = async (relativePath) => {
  const source = await loadModuleText(relativePath);
  const module = { exports: {} };
  const localRequire = (name) => {
    throw new Error(`require(${name}) not available in entry loader`);
  };

  const fn = new AsyncFunction("module", "exports", "require", source);
  await fn(module, module.exports, localRequire);
  return module.exports;
};

const run = async () => {
  const exports = await loadModuleExports(PROXIED_REQUIRE_PATH);
  const createProxiedRequire = exports && exports.createProxiedRequire;
  if (typeof createProxiedRequire !== "function") {
    throw new Error("createProxiedRequire not found in bootstrap loader");
  }

  const proxied_require = createProxiedRequire();
  const libs = await proxied_require("bootstrap/index.js");
  const bootstrap = libs.index || libs.bootstrap || libs.main;
  if (!bootstrap || typeof bootstrap.runClientBootstrap !== "function") {
    throw new Error(
      `bootstrap index missing runClientBootstrap (keys: ${Object.keys(libs || {}).join(", ")})`,
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
