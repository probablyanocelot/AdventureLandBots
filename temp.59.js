const proxied_require = (() => {
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework/";
  const FOLDER = "/lib/";
  const AsyncFunction = (async () => {}).constructor;
  const module_cache = new Map();
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
    try {
      let lib_name = name.split(".")[0];
      if (!module_cache.has(name)) {
        module_cache.set(name, run(path_name, name, handler));
      }
      ret[lib_name] = (await module_cache.get(name)).exports;
    } catch (e) {
      console.log(
        "(" + character.name + ")[" + path_name + "]: ERROR ENCOUNTERED: " + e,
      );
      console.log(
        "(" +
          character.name +
          ")[" +
          path_name +
          "]: Offending script: " +
          name,
      );
      throw e;
    }
  };
  // const isNode =
  //   typeof process !== "undefined" && process.versions && process.versions.node;

  // const handler = isNode
  //   ? async (file_name) => {
  //       const fs = require("fs");
  //       return fs.promises.readFile("." + file_name, "utf8");
  //     }
  //   : async (file_name) => {
  //       const response = await fetch(WEB_BASE + file_name);
  //       return response.text();
  //     };

  const handler = async (file_name) => {
    const response = await fetch(WEB_BASE + file_name);
    return response.text();
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

// Replace the direct (non-async) require/use with an async IIFE that awaits the proxied_require result
(async () => {
  // Load the module (await the proxied_require call)
  const libs = await proxied_require("test.js");
  // Module base name is the filename without extension: "move_in_circle"
  const { test } = libs.test || {};
  if (typeof test !== "function") {
    throw new Error("test not found in test.js exports");
  }

  async function doTest() {
    await test();
  }

  await test();
})().catch((e) => {
  log("Error loading/calling test:", e);
});
