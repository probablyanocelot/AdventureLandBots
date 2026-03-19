const { runClientBootstrap } = require("./index.js");

const DEFAULT_WAIT_TIMEOUT_MS = 30000;
const DEFAULT_WAIT_INTERVAL_MS = 100;

const hasGameGlobals = () => {
  try {
    if (typeof window !== "undefined") {
      if (window.character || window.parent?.character) return true;
    }

    if (typeof globalThis !== "undefined") {
      if (globalThis.character || globalThis.parent?.character) return true;
    }

    // Some runtimes expose globals lexically before attaching to window/globalThis.
    // eslint-disable-next-line no-undef
    if (typeof character !== "undefined" && character) return true;
  } catch {
    // ignore and return false below
  }

  return false;
};

const waitForGameGlobals = (
  timeoutMs = DEFAULT_WAIT_TIMEOUT_MS,
  intervalMs = DEFAULT_WAIT_INTERVAL_MS,
) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tick = () => {
      if (hasGameGlobals()) {
        resolve();
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(
          new Error(
            "Timed out waiting for Adventure Land globals (character/parent.character).",
          ),
        );
        return;
      }

      setTimeout(tick, intervalMs);
    };

    tick();
  });

const start = async () => {
  await waitForGameGlobals();
  await runClientBootstrap();
};

if (typeof window !== "undefined") {
  window.ALBotsWebpack = {
    runClientBootstrap,
    waitForGameGlobals,
    start,
  };

  const shouldAutostart = window.AL_BOTS_AUTOSTART !== false;
  if (shouldAutostart) {
    start().catch((err) => {
      console.error("[ALBotsWebpack] Autostart failed:", err);
    });
  }
}
