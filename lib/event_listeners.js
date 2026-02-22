// Centralized event listeners and helpers.

const createEmitterHub = (getEmitter) => {
  const handlersByEvent = new Map();
  const installed = new Set();

  const ensure = (event) => {
    if (!event || installed.has(event)) return;
    const emitter = getEmitter();
    if (!emitter || typeof emitter.on !== "function") return;
    installed.add(event);

    if (!handlersByEvent.has(event)) handlersByEvent.set(event, new Set());

    emitter.on(event, (...args) => {
      const handlers = handlersByEvent.get(event);
      if (!handlers || !handlers.size) return;
      for (const handler of handlers) {
        try {
          handler(...args);
        } catch {
          // ignore
        }
      }
    });
  };

  const on = (event, handler) => {
    if (!event || !handler) return () => {};
    if (!handlersByEvent.has(event)) handlersByEvent.set(event, new Set());
    ensure(event);
    const handlers = handlersByEvent.get(event);
    handlers.add(handler);
    return () => handlers.delete(handler);
  };

  return { on };
};

const characterHub = createEmitterHub(() =>
  typeof character !== "undefined" ? character : null,
);
const gameHub = createEmitterHub(() =>
  typeof game !== "undefined" ? game : null,
);

const onCharacter = (event, handler) => characterHub.on(event, handler);
const onGame = (event, handler) => gameHub.on(event, handler);

const cmLogState = new Map();
const shouldLogCm = () => Boolean(globalThis.AL_BOTS_DEBUG_CM);
const cmLogCooldownMs = () => {
  const n = Number(globalThis.AL_BOTS_DEBUG_CM_COOLDOWN_MS);
  return Number.isFinite(n) && n > 0 ? n : 8000;
};

const logCmOnce = (key, payload) => {
  if (!shouldLogCm()) return;
  const ts = Date.now();
  const last = Number(cmLogState.get(key) || 0);
  if (ts - last < cmLogCooldownMs()) return;
  cmLogState.set(key, ts);
  try {
    console.log(payload);
  } catch {
    // ignore
  }
};

const safePreview = (value, depth = 0, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") return "[Function]";

  if (typeof value === "object") {
    if (seen.has(value)) return "[Circular]";
    if (depth >= 4) return "[MaxDepth]";
    seen.add(value);

    if (Array.isArray(value)) {
      const out = value
        .slice(0, 20)
        .map((v) => safePreview(v, depth + 1, seen));
      if (value.length > 20) out.push(`[+${value.length - 20} more]`);
      return out;
    }

    const out = {};
    const keys = Object.keys(value);
    for (const key of keys.slice(0, 30)) {
      out[key] = safePreview(value[key], depth + 1, seen);
    }
    if (keys.length > 30) out.__truncatedKeys = keys.length - 30;
    return out;
  }

  try {
    return String(value);
  } catch {
    return "[Unserializable]";
  }
};

const waitForCharacterEvent = ({ event, predicate, timeoutMs = 2000 } = {}) =>
  new Promise((resolve) => {
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      try {
        off();
      } catch {
        // ignore
      }
      resolve(val);
    };

    const handler = (...args) => {
      try {
        if (predicate && !predicate(...args)) return;
        finish(args.length <= 1 ? args[0] : args);
      } catch {
        // ignore
      }
    };

    const off = onCharacter(event, handler);
    setTimeout(() => finish(null), Math.max(1, timeoutMs));
  });

const waitForCm = ({ from, cmd, predicate, timeoutMs = 2000 } = {}) =>
  waitForCharacterEvent({
    event: "cm",
    timeoutMs,
    predicate: (m) => {
      if (!m || !m.name || !m.message) return false;
      if (from && m.name !== from) return false;
      if (cmd && m.message.cmd !== cmd) return false;
      if (predicate && !predicate(m)) return false;
      return true;
    },
  });

const waitForCmBatch = ({
  expectedNames,
  taskId,
  cmd,
  timeoutMs = 5000,
} = {}) =>
  new Promise((resolve) => {
    const results = new Map();
    const done = () => {
      try {
        off();
      } catch {
        // ignore
      }
      resolve(results);
    };

    const handler = (m) => {
      try {
        if (!m || !m.name || !m.message) return;
        if (expectedNames && !expectedNames.includes(m.name)) return;
        if (cmd && m.message.cmd !== cmd) return;
        if (taskId && m.message.taskId !== taskId) return;
        results.set(m.name, m.message);
        if (expectedNames && results.size >= expectedNames.length) done();
      } catch {
        // ignore
      }
    };

    const off = onCharacter("cm", handler);
    setTimeout(done, Math.max(1, timeoutMs));
  });

const runtimeGlobalsState = {
  installed: false,
  offCmLog: null,
  offDeath: null,
  deathDelayTimer: null,
  originalSendCm: null,
  wrappedSendCm: null,
};

const stopGlobalRuntimeListeners = () => {
  try {
    if (runtimeGlobalsState.offCmLog) runtimeGlobalsState.offCmLog();
  } catch {
    // ignore
  }
  runtimeGlobalsState.offCmLog = null;

  try {
    if (runtimeGlobalsState.offDeath) runtimeGlobalsState.offDeath();
  } catch {
    // ignore
  }
  runtimeGlobalsState.offDeath = null;

  try {
    if (runtimeGlobalsState.deathDelayTimer) {
      clearTimeout(runtimeGlobalsState.deathDelayTimer);
    }
  } catch {
    // ignore
  }
  runtimeGlobalsState.deathDelayTimer = null;

  try {
    if (
      runtimeGlobalsState.wrappedSendCm &&
      globalThis.send_cm === runtimeGlobalsState.wrappedSendCm
    ) {
      globalThis.send_cm = runtimeGlobalsState.originalSendCm;
      globalThis.__AL_BOTS_CM_LOG_WRAP__ = false;
    }
  } catch {
    // ignore
  }
  runtimeGlobalsState.originalSendCm = null;
  runtimeGlobalsState.wrappedSendCm = null;
  runtimeGlobalsState.installed = false;
};

const createRuntimeGlobalsDisposable = () => ({
  stop: () => {
    stopGlobalRuntimeListeners();
  },
  dispose: () => {
    stopGlobalRuntimeListeners();
  },
  [Symbol.dispose]: () => {
    stopGlobalRuntimeListeners();
  },
  [Symbol.asyncDispose]: async () => {
    stopGlobalRuntimeListeners();
  },
});

const installGlobalRuntimeListeners = () => {
  if (runtimeGlobalsState.installed) return createRuntimeGlobalsDisposable();

  try {
    if (typeof character === "undefined")
      return createRuntimeGlobalsDisposable();

    if (
      typeof globalThis.send_cm === "function" &&
      !globalThis.__AL_BOTS_CM_LOG_WRAP__
    ) {
      runtimeGlobalsState.originalSendCm = globalThis.send_cm;
      runtimeGlobalsState.wrappedSendCm = async (to, message) => {
        logCmOnce(`cm_out:${String(to)}:${String(message?.cmd || "none")}`, [
          "[CM->]",
          {
            to: safePreview(to),
            cmd: message?.cmd ?? null,
            message: safePreview(message),
          },
        ]);

        try {
          const result = await runtimeGlobalsState.originalSendCm(to, message);
          logCmOnce(
            `cm_out_ack:${String(to)}:${String(message?.cmd || "none")}`,
            ["[CM->ack]", safePreview(result)],
          );
          return result;
        } catch (e) {
          logCmOnce(
            `cm_out_err:${String(to)}:${String(message?.cmd || "none")}`,
            ["[CM->error]", String(e?.message || e)],
          );
          throw e;
        }
      };

      globalThis.send_cm = runtimeGlobalsState.wrappedSendCm;
      globalThis.__AL_BOTS_CM_LOG_WRAP__ = true;
    }

    runtimeGlobalsState.offCmLog = onCharacter("cm", (m) => {
      const from = String(m?.name || "unknown");
      const cmd = String(m?.message?.cmd || "none");
      logCmOnce(`cm_in:${from}:${cmd}`, [
        "[CM]",
        {
          from: m?.name ?? null,
          cmd: m?.message?.cmd ?? null,
          local: Boolean(m?.local),
          date: m?.date ?? null,
          message: safePreview(m?.message),
        },
      ]);
    });

    runtimeGlobalsState.offDeath = onCharacter("death", () => {
      console.log("We Died! Starting 15 second delay timer...");
      if (runtimeGlobalsState.deathDelayTimer) {
        clearTimeout(runtimeGlobalsState.deathDelayTimer);
      }
      runtimeGlobalsState.deathDelayTimer = setTimeout(() => {
        runtimeGlobalsState.deathDelayTimer = null;
        console.log("Death handler triggered after 15 seconds.");
        respawn();
      }, 15000);
    });

    runtimeGlobalsState.installed = true;
  } catch {
    // Ignore if character isn't available in this context
  }

  return createRuntimeGlobalsDisposable();
};

// Backward-compatible default behavior: install side-effects on module load.
try {
  installGlobalRuntimeListeners();
} catch {
  // ignore
}

module.exports = {
  onCharacter,
  onGame,
  waitForCharacterEvent,
  waitForCm,
  waitForCmBatch,
  installGlobalRuntimeListeners,
  stopGlobalRuntimeListeners,
};
