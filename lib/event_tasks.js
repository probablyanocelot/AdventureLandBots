// Event task emitter for joinable server events.
//
// Uses two signals:
// - onGame("event") announcements for fast reaction
// - parent.S / G.events polling for liveness + end detection

const { info, warn } = await require("./al_debug_log.js");
const { onGame } = await require("./event_listeners.js");
const { isJoinableEvent } = await require("./fn_server_events.js");
const { now } = await require("./fn_time.js");

const isEventLive = (name) => {
  try {
    // Some events use {live:true}; others just exist in parent.S.
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

    // Announcement hook
    try {
      state.offGameEvent = onGame("event", (data) => {
        const name = data?.name;
        if (!name) return;

        // De-bounce noisy announcements.
        const nowMs = now();
        const last = state.lastAnnouncedAt.get(name) || 0;
        if (nowMs - last < 2000) return;
        state.lastAnnouncedAt.set(name, nowMs);

        emitStart(name, "announcement");
      });
    } catch (e) {
      warn("Failed to subscribe to onGame('event')", e);
    }

    // Poll for event ends (and missed starts)
    state.pollId = setInterval(
      () => {
        try {
          // First: detect ends
          for (const name of Array.from(state.active)) {
            if (!isEventLive(name)) emitEnd(name, "poll");
          }

          // Second: detect starts we may have missed
          if (parent?.S) {
            for (const name of Object.keys(parent.S)) {
              if (filterJoinableOnly && !isJoinableEvent(name)) continue;
              if (!state.active.has(name) && isEventLive(name))
                emitStart(name, "poll");
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

  const stop = () => {
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
    stop,
    dispose: () => {
      stop();
    },
    [Symbol.dispose]: () => {
      stop();
    },
    [Symbol.asyncDispose]: async () => {
      stop();
    },
  };
};

module.exports = {
  createEventTaskEmitter,
  isJoinableEvent,
  isEventLive,
};
