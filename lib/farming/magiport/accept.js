// Safe magiport auto-accept + expectation state.
//
// Adventure Land calls global `on_magiport(name)` on PVE servers.
// We only accept when:
// - We're explicitly expecting a port from `name` (set via CM handshake), and
// - `name` is in the trusted mage allowlist.

const { now } = require("../timing/last.js");

const STATE_KEY = "__ALBOTS_MAGIPORT__";

const getState = () => {
  if (typeof globalThis === "undefined") return null;
  if (!globalThis[STATE_KEY]) {
    globalThis[STATE_KEY] = {
      expectingFrom: null,
      expiresAt: 0,
      taskId: null,
      lastAcceptedAt: 0,
      installed: false,
      installedAt: 0,
      trustedMages: [],
      debug: false,
    };
  }
  return globalThis[STATE_KEY];
};

const setTrustedMages = (names) => {
  const st = getState();
  if (!st) return;
  st.trustedMages = Array.isArray(names) ? names.filter(Boolean) : [];
};

const setExpectedMagiport = (fromName, ttlMs = 15000, taskId = null) => {
  const st = getState();
  if (!st) return;
  st.expectingFrom = fromName;
  st.expiresAt = now() + Math.max(1000, Number(ttlMs || 15000));
  st.taskId = taskId;
};

const clearExpectedMagiport = () => {
  const st = getState();
  if (!st) return;
  st.expectingFrom = null;
  st.expiresAt = 0;
  st.taskId = null;
};

const isTrustedMage = (name) => {
  const st = getState();
  if (!st) return false;
  return st.trustedMages.includes(name);
};

const isExpecting = (fromName) => {
  const st = getState();
  if (!st) return false;
  if (!st.expectingFrom) return false;
  if (now() > st.expiresAt) return false;
  return st.expectingFrom === fromName;
};

const maybeAccept = async (name) => {
  const st = getState();
  if (!st) return;

  // Basic sanity checks
  if (!name) return;
  if (character && character.rip) return;

  if (!isExpecting(name)) {
    if (st.debug) console.log("[magiport] not expecting", name);
    return;
  }

  if (!isTrustedMage(name)) {
    if (st.debug) console.log("[magiport] not trusted", name);
    return;
  }

  // Prevent any accidental double-accept spam.
  if (now() - st.lastAcceptedAt < 1000) return;

  try {
    // `accept_magiport` exists in runner_functions.js.
    await accept_magiport(name);
    st.lastAcceptedAt = now();
  } catch (e) {
    if (st.debug) console.log("[magiport] accept failed", e);
  } finally {
    // Clear expectation so we don't accept a second request unintentionally.
    clearExpectedMagiport();
  }
};

const installMagiportAutoAccept = (cfg = {}) => {
  const st = getState();
  if (!st) return;

  // Update trusted mages whenever install is called.
  if (cfg && typeof cfg === "object" && Array.isArray(cfg.trustedMages)) {
    setTrustedMages(cfg.trustedMages);
  }

  if (st.installed) return;

  // Chain any existing on_magiport handler.
  const previous =
    typeof globalThis.on_magiport === "function"
      ? globalThis.on_magiport
      : null;

  globalThis.on_magiport = (name) => {
    try {
      // Do our logic first so it works even if previous throws.
      // Note: we intentionally don't await; the game doesn't await this callback.
      maybeAccept(name);
    } catch {
      // ignore
    }

    if (previous) {
      try {
        return previous(name);
      } catch {
        // ignore
      }
    }
  };

  st.installed = true;
  st.installedAt = now();
};

module.exports = {
  installMagiportAutoAccept,
  setExpectedMagiport,
  clearExpectedMagiport,
  setTrustedMages,
};
