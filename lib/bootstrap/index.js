const { createProxiedRequire } = require("./proxied_require.js");
const { applyTelemetryBootstrap } = require("./telemetry_bootstrap.js");
const { applySwapRoutingBootstrap } = require("./swap_routing_bootstrap.js");

const installWebSocketDiagnostics = () => {
  try {
    if (typeof window === "undefined") return;
    if (window.__ALBOTS_WS_DIAG_INSTALLED) return;
    const NativeWebSocket = window.WebSocket;
    if (typeof NativeWebSocket !== "function") return;

    const TARGET_MARKERS = [
      "localhost:8787",
      "127.0.0.1:8787",
      "[::1]:8787",
      "::1:8787",
    ];

    const normalizeTelemetryUrl = (urlLike) => {
      try {
        const parsed = new URL(String(urlLike || ""));
        const host = String(parsed.hostname || "")
          .trim()
          .toLowerCase();
        const port = Number(parsed.port || 0);
        const isTelemetryPort =
          port === 8787 || (!parsed.port && parsed.protocol === "ws:");
        if (!isTelemetryPort) return String(urlLike || "");
        if (host === "localhost" || host === "::1") {
          parsed.hostname = "127.0.0.1";
          return parsed.toString();
        }
        return parsed.toString();
      } catch {
        return String(urlLike || "");
      }
    };

    const shouldTrace = (urlLike) => {
      const url = String(urlLike || "");
      if (!url) return false;
      return TARGET_MARKERS.some((marker) => url.includes(marker));
    };

    const attachSocketTrace = (ws, url) => {
      if (!ws || typeof ws.addEventListener !== "function") return;

      console.warn(`[ALBots WS DIAG] create ${url}`);

      ws.addEventListener("open", () => {
        console.warn(`[ALBots WS DIAG] open ${url}`);
      });

      ws.addEventListener("close", (evt) => {
        console.warn(
          `[ALBots WS DIAG] close ${url} code=${evt?.code ?? "n/a"} reason=${evt?.reason || "n/a"} clean=${evt?.wasClean ?? "n/a"}`,
        );
      });

      ws.addEventListener("error", (evt) => {
        const detail =
          evt?.message || evt?.error?.message || evt?.type || "unknown";
        console.warn(`[ALBots WS DIAG] error ${url} detail=${detail}`);
      });
    };

    const WrappedWebSocket = function (...args) {
      const requestedUrl = args[0];
      const normalizedUrl = normalizeTelemetryUrl(requestedUrl);
      if (normalizedUrl && normalizedUrl !== requestedUrl) {
        console.warn(
          `[ALBots WS DIAG] rewrite ${String(requestedUrl)} -> ${normalizedUrl}`,
        );
        args[0] = normalizedUrl;
      }

      const ws = new NativeWebSocket(...args);
      try {
        const tracedUrl = normalizedUrl || requestedUrl;
        if (shouldTrace(tracedUrl)) attachSocketTrace(ws, String(tracedUrl));
      } catch {
        // ignore diagnostics failures
      }
      return ws;
    };

    WrappedWebSocket.prototype = NativeWebSocket.prototype;
    Object.defineProperty(WrappedWebSocket, "name", {
      value: "WebSocket",
    });
    WrappedWebSocket.CONNECTING = NativeWebSocket.CONNECTING;
    WrappedWebSocket.OPEN = NativeWebSocket.OPEN;
    WrappedWebSocket.CLOSING = NativeWebSocket.CLOSING;
    WrappedWebSocket.CLOSED = NativeWebSocket.CLOSED;

    window.WebSocket = WrappedWebSocket;
    window.__ALBOTS_WS_DIAG_INSTALLED = true;
    console.warn("[ALBots WS DIAG] installed WebSocket diagnostics wrapper");
  } catch (e) {
    console.log(
      "Failed to install websocket diagnostics:",
      e && e.message ? e.message : e,
    );
  }
};

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

  installWebSocketDiagnostics();
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
