const { runClientBootstrap } = require("./index.js");

const DEFAULT_WAIT_TIMEOUT_MS = 30000;
const DEFAULT_WAIT_INTERVAL_MS = 100;

const hasGameGlobals = () => {
  if (typeof window === "undefined") return false;
  return Boolean(window.character || window.parent?.character);
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
