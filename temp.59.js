const proxied_require = (() => {
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework/";
  const FOLDER = "/lib/";
  const AsyncFunction = (async () => {}).constructor;
  const module_cache = new Map();

  const handler = async (file_name) => {
    const response = await fetch(WEB_BASE + file_name);
    return response.text();
  };

  const run = async (path_name, name, handler) => {
    let data = await handler(FOLDER + name);
    let func = new AsyncFunction("module", "exports", "require", data);
    let _module = { exports: {} };
    await func(
      _module,
      _module.exports,
      proxied_require.bind({ name: path_name + ":" + name }),
    );
    return _module;
  };

  const get_module = async (path_name, ret, name, handler) => {
    let lib_name = name.split(".")[0];
    if (!module_cache.has(name)) {
      module_cache.set(name, run(path_name, name, handler));
    }
    ret[lib_name] = (await module_cache.get(name)).exports;
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

  window.start = main;   // <-- REQUIRED
	main();
})();
