// Event task emitter for joinable server events.
// Purpose: emit start/end task signals for live joinable events.

const { info, warn } = await require("../../al_debug_log.js");
const { onGame } = await require("../runtime-listeners/index.js");
const { isJoinableEvent } = await require("./active_event_catalog.js");

const now = () => Date.now();

const isEventLive = (name) => {
  try {
    const s = parent?.S?.[name];
    if (!s) return false;
    if (typeof s.live === "boolean") return s.live;
    return true;
  } catch {
    return false;
  }
};

const createEventTaskEmitter = ({
  onStart,
  onEnd,
  pollMs = 1000,
  filterJoinableOnly = true,
} = {}) => {
  const state = {
    active: new Set(),
    installed: false,
    pollId: null,
    offGameEvent: null,
    lastAnnouncedAt: new Map(),
  };

  const emitStart = (name, source) => {
    if (!name) return;
    if (filterJoinableOnly && !isJoinableEvent(name)) return;
    if (!isEventLive(name)) return;
    if (state.active.has(name)) return;
    state.active.add(name);
    try {
      onStart && onStart({ type: "event", name, joinEvent: name, source });
    } catch (e) {
      warn("event onStart failed", e);
    }
  };

  const emitEnd = (name, source) => {
    if (!state.active.has(name)) return;
    state.active.delete(name);
    try {
      onEnd && onEnd({ type: "event_end", name, joinEvent: name, source });
    } catch (e) {
      warn("event onEnd failed", e);
    }
  };

  const install = () => {
    if (state.installed) return;
    state.installed = true;

    try {
      state.offGameEvent = onGame("event", (data) => {
        const name = data?.name;
        if (!name) return;

        const nowMs = now();
        const last = state.lastAnnouncedAt.get(name) || 0;
        if (nowMs - last < 2000) return;
        state.lastAnnouncedAt.set(name, nowMs);

        emitStart(name, "announcement");
      });
    } catch (e) {
      warn("Failed to subscribe to onGame('event')", e);
    }

    state.pollId = setInterval(
      () => {
        try {
          for (const name of Array.from(state.active)) {
            if (!isEventLive(name)) emitEnd(name, "poll");
          }

          if (parent?.S) {
            for (const name of Object.keys(parent.S)) {
              if (filterJoinableOnly && !isJoinableEvent(name)) continue;
              if (!state.active.has(name) && isEventLive(name)) {
                emitStart(name, "poll");
              }
            }
          }
        } catch {
          // ignore
        }
      },
      Math.max(250, pollMs),
    );

    info("EventTaskEmitter installed");
  };

  const stopRoutine = () => {
    state.installed = false;

    try {
      if (state.pollId) clearInterval(state.pollId);
    } catch {
      // ignore
    }
    state.pollId = null;

    try {
      if (typeof state.offGameEvent === "function") state.offGameEvent();
    } catch {
      // ignore
    }
    state.offGameEvent = null;

    state.active.clear();
    state.lastAnnouncedAt.clear();
  };

  return {
    install,
    stopRoutine,
    dispose: () => {
      stopRoutine();
    },
    [Symbol.dispose]: () => {
      stopRoutine();
    },
    [Symbol.asyncDispose]: async () => {
      stopRoutine();
    },
  };
};

module.exports = {
  createEventTaskEmitter,
  isJoinableEvent,
  isEventLive,
};
