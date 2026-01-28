// const { utils, combat } = await proxied_require("utils.js", "combat.js"); // Example usage
const proxied_require = (() => {
  const NODE_BASE = ".";
  const WEB_BASE =
    "https://raw.githubusercontent.com/probablyanocelot/AdventureLandBots/refs/heads/rework/";
  const FOLDER = "/codes/";
  const tick_delay = () =>
    new Promise((r) => {
      setTimeout(r, 0);
    });
  const AsyncFunction = (() => async function () {})().constructor;
  let module_cache = {};

  function getCharacterName() {
    try {
      return typeof character !== "undefined" && character && character.name
        ? character.name
        : "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  function safeGameLog(msg) {
    try {
      if (typeof game_log === "function") {
        game_log(msg);
      } else {
        log(msg);
      }
    } catch (e) {
      log(msg);
    }
  }

  async function fetch(path_name, ret, name, handler) {
    try {
      let lib_name = name.split(".")[0];
      await tick_delay();

      if (module_cache[name]) {
        safeGameLog(
          `(${getCharacterName()})[${path_name}]: Module ${name} found in cache.`,
        );
        ret[lib_name] = (await module_cache[name]).exports;
        return;
      }

      let resolve;
      module_cache[name] = new Promise((r) => (resolve = r));
      safeGameLog(`(${getCharacterName()})[${path_name}]: Fetching ${name}`);
      let data = await handler(FOLDER + name);
      safeGameLog(`(${getCharacterName()})[${path_name}]: Fetched ${name}`);
      await tick_delay();

      let func = AsyncFunction("module", "exports", "require", data + "");
      let _module = { exports: {} };
      safeGameLog(`(${getCharacterName()})[${path_name}]: Executing ${name}`);
      await func(
        _module,
        _module.exports,
        proxied_require.bind({ name: path_name + ":" + name }),
      );
      safeGameLog(`(${getCharacterName()})[${path_name}]: Executed ${name}`);
      resolve(_module);
      ret[lib_name] = _module.exports;
    } catch (e) {
      try {
        log(
          "(" +
            getCharacterName() +
            ")[" +
            path_name +
            "]: ERROR ENCOUNTERED: " +
            e,
        );
        log(
          "(" +
            getCharacterName() +
            ")[" +
            path_name +
            "]: Offending script: " +
            name,
        );
      } catch (_) {}
      throw e;
    }
  }

  async function proxied_require(...libraries) {
    const path_name = this?.name ?? getCharacterName() + ".js";
    await tick_delay();

    const isNode =
      typeof process !== "undefined" &&
      process.versions &&
      !!process.versions.node;

    if (isNode) {
      let ret = {};
      let libs = libraries.map(async (name) => {
        await fetch(path_name, ret, name, async (file_name) => {
          return await require("fs").promises.readFile("." + file_name, "utf8");
        });
      });
      await Promise.all(libs);
      return ret;
    } else {
      let ret = {};
      let libs = libraries.map(async (name) => {
        await fetch(path_name, ret, name, async (file_name) => {
          var oReq = new XMLHttpRequest();
          oReq.open("GET", WEB_BASE + file_name, true);
          oReq.send();
          let resolve,
            prom = new Promise((r) => (resolve = r));
          oReq.addEventListener("load", () => {
            resolve(oReq.responseText);
          });
          return await prom;
        });
      });
      await Promise.all(libs);
      return ret;
    }
  }
  return proxied_require;
})();

// exports.proxied_require = proxied_require;

// Replace the direct (non-async) require/use with an async IIFE that awaits the proxied_require result
(async () => {
  // Load the module (await the proxied_require call)
  const libs = await proxied_require("move_in_circle.js");
  // Module base name is the filename without extension: "move_in_circle"
  const { moveInCircle } = libs.move_in_circle || {};
  if (typeof moveInCircle !== "function") {
    throw new Error("moveInCircle not found in move_in_circle.js exports");
  }

  async function doMove() {
    await moveInCircle({ x: 100, y: 100 }, 50, Math.PI);
  }

  await doMove();
})().catch((e) => {
  log("Error loading/calling move_in_circle:", e);
});
