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

// Delayed death handler (resets on each death)
let deathDelayTimer = null;
try {
  if (typeof character !== "undefined") {
    onCharacter("cm", (m) => {
      try {
        const payload = {
          from: m?.name ?? null,
          cmd: m?.message?.cmd ?? null,
          local: Boolean(m?.local),
          date: m?.date ?? null,
          message: safePreview(m?.message),
        };
        console.log("[CM]", payload);
      } catch {
        // ignore
      }
    });

    onCharacter("death", () => {
      console.log("We Died! Starting 15 second delay timer...");
      if (deathDelayTimer) clearTimeout(deathDelayTimer);
      deathDelayTimer = setTimeout(() => {
        console.log("Death handler triggered after 15 seconds.");
        respawn();
      }, 15000);
    });
  }
} catch {
  // Ignore if character isn't available in this context
}

module.exports = {
  onCharacter,
  onGame,
  waitForCharacterEvent,
  waitForCm,
  waitForCmBatch,
};
