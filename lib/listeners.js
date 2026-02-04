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
    onCharacter("death", () => {
      console.log("We Died! Starting 15 second delay timer...");
      if (deathDelayTimer) clearTimeout(deathDelayTimer);
      deathDelayTimer = setTimeout(() => {
        console.log("Death handler triggered after 15 seconds.");
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
