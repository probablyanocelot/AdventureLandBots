const { createProxiedRequire } = require("./proxied_require.js");
const { applyTelemetryBootstrap } = require("./telemetry_bootstrap.js");
const { applySwapRoutingBootstrap } = require("./swap_routing_bootstrap.js");

const applyZoomPreference = () => {
  try {
    const nodeRequire =
      typeof window !== "undefined" && typeof window.require === "function"
        ? window.require.bind(window)
        : null;
    if (!nodeRequire) return;

    const electron = nodeRequire("electron");
    const webFrame = electron && electron.webFrame;
    if (!webFrame || typeof webFrame.setZoomFactor !== "function") return;

    function zoom(zoomFactor) {
      webFrame.setZoomFactor(zoomFactor);
    }
    zoom(0.5);
  } catch (e) {
    console.log("applyZoomPreference skipped:", e && e.message ? e.message : e);
  }
};

const runClientBootstrap = async () => {
  if (typeof require !== "function") performance_trick();

  applyZoomPreference();

  const proxied_require = createProxiedRequire();

  try {
    if (typeof window !== "undefined") {
      applyTelemetryBootstrap();
      applySwapRoutingBootstrap();
    }
  } catch (e) {
    console.log("Failed to set AL_BOTS_CONFIG:", e);
  }

  const libs = await proxied_require("al_main.js");
  const entry = libs.al_main || libs.main;
  if (!entry || typeof entry.main !== "function") {
    throw new Error(
      `Entry module not found or invalid. Expected libs.al_main/main with exported main(). Keys: ${Object.keys(libs || {}).join(", ")}`,
    );
  }
  const { main } = entry;

  try {
    window.AL_BOTS = entry;
    Object.defineProperty(window, "bot", {
      configurable: true,
      get: () => entry.bot,
    });
  } catch (e) {
    console.log("Failed to expose AL_BOTS globals:", e);
  }

  window.main = main;
  await main();

  try {
    if (typeof proxied_require.startRemoteReloadWatcher === "function") {
      proxied_require.startRemoteReloadWatcher();
    }
  } catch (e) {
    console.log("Remote reload watcher failed to start:", e);
  }
};

module.exports = {
  runClientBootstrap,
};
