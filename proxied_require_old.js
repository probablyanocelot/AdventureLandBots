const proxied_require = (() => {
  const NODE_BASE = ".";
  const WEB_BASE = "https://gitlab.com/husk_script/adv_lnd";
  const FOLDER = "/codes/";
  const tick_delay = () =>
    new Promise((r) => {
      setTimeout(r, 0);
    });
  const AsyncFunction = (() => async function () {})().constructor;
  const COMPLETED_PROMISE = Promise.resolve(null);
  let module_cache = {};
  async function fetch(path_name, ret, name, handler) {
    try {
      let lib_name = name.split(".")[0];
      await tick_delay();
      if (module_cache[name]) {
        let result = await Promise.race([
          module_cache[name],
          COMPLETED_PROMISE,
        ]);
        if (result == null) {
          game_log(
            `(${character.name})[${path_name}]: Module ${name} found in cache, but not completed. Waiting for finish.`
          );
          ret[lib_name] = (await module_cache[name]).exports;
          game_log(
            `(${character.name})[${path_name}]: Module ${name} finished loading.`
          );
        } else {
          game_log(
            `(${character.name})[${path_name}]: Module ${name} found in cache.`
          );
          ret[lib_name] = (await module_cache[name]).exports;
        }

        return;
      }
      let resolve;
      module_cache[name] = new Promise((r) => (resolve = r));
      game_log(`(${character.name})[${path_name}]: Fetching ${name}`);
      let data = await handler(FOLDER + name);
      game_log(`(${character.name})[${path_name}]: Fetched ${name}`);
      await tick_delay();
      let func = AsyncFunction("module", "exports", "require", data + "");
      let _module = { exports: {} };
      game_log(`(${character.name})[${path_name}]: Executing ${name}`);
      await func(
        _module,
        _module.exports,
        proxied_require.bind({ name: path_name + ":" + name })
      );
      game_log(`(${character.name})[${path_name}]: Executed ${name}`);
      resolve(_module);
      ret[lib_name] = _module.exports;
    } catch (e) {
      console.log(
        "(" + character.name + ")[" + path_name + "]: ERROR ENCOUNTERED: " + e
      );
      console.log(
        "(" + character.name + ")[" + path_name + "]: Offending script: " + name
      );
      throw e;
    }
    return;
  }
  async function proxied_require(...libraries) {
    const path_name = this?.name ?? character.name + ".js";
    await tick_delay();
    if (typeof parent.module != "undefined") {
      let ret = {};
      let libs = libraries.map(async (name) => {
        await fetch(path_name, ret, name, async (file_name) => {
          return await require("fs").promises.readFile("." + file_name);
        });
        return;
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