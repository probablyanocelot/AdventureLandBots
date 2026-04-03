const proxied_require = (() => {
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework/";
  const FOLDER = "/lib/";
  const AsyncFunction = (async () => {}).constructor;
  const module_cache = new Map();

  const normalize_module_name = (name) => {
    if (typeof name !== "string") return name;
    let n = name.trim();

    // Loaded code tends to use Node-ish relative paths ("./idle.js", "./merchant").
    // Our fetch base already points at the lib folder.
    n = n.replace(/^\.\//, "");
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
    const response = await fetch(WEB_BASE + file_name);
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
      const normalizedReq = normalize_module_name(reqName);
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

  return async function proxied_require(...libraries) {
    const path_name = this?.name ?? character.name + ".js";
    let ret = {};
    await Promise.all(
      libraries.map((name) => get_module(path_name, ret, name, handler)),
    );
    return ret;
  };
})();

// Load module + expose globally
(async () => {
  const libs = await proxied_require("main.js");
  const { main } = libs.main;

  window.main = main;   // <-- REQUIRED
})();
