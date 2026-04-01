const DEFAULT_EMOTION_NAME = "hearts_single";
const DEFAULT_EMOTION_INTERVAL_MS = 2000;

const createEmotionEmitter = ({
  enabled = false,
  emotionName = DEFAULT_EMOTION_NAME,
  intervalMs = DEFAULT_EMOTION_INTERVAL_MS,
} = {}) => {
  const st = {
    enabled: Boolean(enabled),
    emotionName:
      typeof emotionName === "string" && emotionName.trim()
        ? emotionName.trim()
        : DEFAULT_EMOTION_NAME,
    intervalMs: Math.max(
      250,
      Number(intervalMs || DEFAULT_EMOTION_INTERVAL_MS),
    ),
    lastEmittedAtMs: 0,
  };

  const tick = () => {
    try {
      if (!st.enabled) return;
      if (!parent?.socket || typeof parent.socket.emit !== "function") return;

      const now = Date.now();
      if (now - st.lastEmittedAtMs < st.intervalMs) return;

      parent.socket.emit("emotion", { name: st.emotionName });
      st.lastEmittedAtMs = now;
    } catch {
      // ignore runtime failures so merchant loop keeps running
    }
  };

  const stopRoutine = () => {
    st.lastEmittedAtMs = 0;
  };

  return {
    tick,
    stopRoutine,
  };
};

module.exports = {
  createEmotionEmitter,
};
