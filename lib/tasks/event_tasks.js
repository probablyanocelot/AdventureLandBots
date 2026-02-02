// Event task emitter for joinable server events.
//
// Uses two signals:
// - game.on("event") announcements for fast reaction
// - parent.S / G.events polling for liveness + end detection

const { info, warn } = await require("util/logger.js");

const isJoinableEvent = (name) => {
  try {
    return Boolean(name && G?.events?.[name]?.join);
  } catch {
    return false;
  }
};

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
      game.on("event", (data) => {
        const name = data?.name;
        if (!name) return;

        // De-bounce noisy announcements.
        const now = Date.now();
        const last = state.lastAnnouncedAt.get(name) || 0;
        if (now - last < 2000) return;
        state.lastAnnouncedAt.set(name, now);

        emitStart(name, "announcement");
      });
    } catch (e) {
      warn("Failed to subscribe to game.on('event')", e);
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
    try {
      if (state.pollId) clearInterval(state.pollId);
    } catch {
      // ignore
    }
    state.pollId = null;
    state.active.clear();
  };

  return { install, stop };
};

module.exports = {
  createEventTaskEmitter,
  isJoinableEvent,
  isEventLive,
};
