// Safe magiport auto-accept + expectation state.
//
// Adventure Land calls global `on_magiport(name)` on PVE servers.
// We only accept when:
// - We're explicitly expecting a port from `name` (set via CM handshake), and
// - `name` is in the trusted mage allowlist.

const { now } = await require("./fn_time.js");

const STATE_KEY = "__ALBOTS_MAGIPORT__";
const PERSIST_KEY_PREFIX = "__ALBOTS_MAGIPORT_STATE__";

const normalizeName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase();

const getPersistKey = () => {
  const id = String(character?.id || character?.name || "unknown");
  return `${PERSIST_KEY_PREFIX}:${id}`;
};

const readPersistedState = () => {
  try {
    if (typeof get !== "function") return null;
    const raw = get(getPersistKey());
    if (!raw || typeof raw !== "object") return null;
    return {
      expectingFrom: normalizeName(raw.expectingFrom) || null,
      expiresAt: Number(raw.expiresAt || 0),
      taskId: raw.taskId || null,
      lastAcceptedAt: Number(raw.lastAcceptedAt || 0),
      lastAcceptedFrom: normalizeName(raw.lastAcceptedFrom) || null,
      lastAcceptedTaskId: raw.lastAcceptedTaskId || null,
    };
  } catch {
    return null;
  }
};

const persistState = (st) => {
  try {
    if (!st || typeof set !== "function") return;
    set(getPersistKey(), {
      expectingFrom: st.expectingFrom || null,
      expiresAt: Number(st.expiresAt || 0),
      taskId: st.taskId || null,
      lastAcceptedAt: Number(st.lastAcceptedAt || 0),
      lastAcceptedFrom: st.lastAcceptedFrom || null,
      lastAcceptedTaskId: st.lastAcceptedTaskId || null,
      savedAt: new Date().toISOString(),
    });
  } catch {
    // ignore persistence failures
  }
};

const getState = () => {
  if (typeof globalThis === "undefined") return null;
  if (!globalThis[STATE_KEY]) {
    const persisted = readPersistedState();
    const persistedExpectationValid =
      Boolean(persisted?.expectingFrom) &&
      Number(persisted?.expiresAt || 0) > now();

    globalThis[STATE_KEY] = {
      expectingFrom: persistedExpectationValid ? persisted.expectingFrom : null,
      expiresAt: persistedExpectationValid ? persisted.expiresAt : 0,
      taskId: persistedExpectationValid ? persisted.taskId || null : null,
      lastAcceptedAt: Number(persisted?.lastAcceptedAt || 0),
      lastAcceptedFrom: persisted?.lastAcceptedFrom || null,
      lastAcceptedTaskId: persisted?.lastAcceptedTaskId || null,
      installed: false,
      installedAt: 0,
      trustedMages: [],
      debug: false,
    };

    persistState(globalThis[STATE_KEY]);
  }
  return globalThis[STATE_KEY];
};

const setTrustedMages = (names) => {
  const st = getState();
  if (!st) return;
  st.trustedMages = Array.isArray(names)
    ? names.filter(Boolean).map((n) => String(n).trim().toLowerCase())
    : [];
};

const setExpectedMagiport = (fromName, ttlMs = 15000, taskId = null) => {
  const st = getState();
  if (!st) return;
  st.expectingFrom = normalizeName(fromName) || null;
  st.expiresAt = now() + Math.max(1000, Number(ttlMs || 15000));
  st.taskId = taskId;
  persistState(st);
};

const clearExpectedMagiport = () => {
  const st = getState();
  if (!st) return;
  st.expectingFrom = null;
  st.expiresAt = 0;
  st.taskId = null;
  persistState(st);
};

const isTrustedMage = (name) => {
  const st = getState();
  if (!st) return false;
  return st.trustedMages.includes(normalizeName(name));
};

const isExpecting = (fromName) => {
  const st = getState();
  if (!st) return false;
  if (!st.expectingFrom) return false;
  if (now() > st.expiresAt) return false;
  return st.expectingFrom === normalizeName(fromName);
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

  const acceptedFromSameMageRecently =
    normalizeName(name) === normalizeName(st.lastAcceptedFrom) &&
    now() - Number(st.lastAcceptedAt || 0) < 2500;
  if (acceptedFromSameMageRecently) {
    if (st.debug)
      console.log("[magiport] duplicate same-mage accept blocked", name);
    clearExpectedMagiport();
    return;
  }

  if (
    st.taskId &&
    st.lastAcceptedTaskId &&
    String(st.taskId) === String(st.lastAcceptedTaskId)
  ) {
    if (st.debug)
      console.log("[magiport] duplicate taskId accept blocked", st.taskId);
    clearExpectedMagiport();
    return;
  }

  // Prevent any accidental double-accept spam.
  if (now() - st.lastAcceptedAt < 1000) return;

  try {
    // `accept_magiport` exists in runner_functions.js.
    await accept_magiport(name);
    st.lastAcceptedAt = now();
    st.lastAcceptedFrom = normalizeName(name) || null;
    st.lastAcceptedTaskId = st.taskId || null;
    persistState(st);
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
