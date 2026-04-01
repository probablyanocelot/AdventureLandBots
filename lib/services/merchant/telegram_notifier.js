const DEFAULT_MIN_INTERVAL_MS = 5000;

const readTelegramToken = (cfg = {}) => {
  if (typeof cfg.token === "string" && cfg.token.trim())
    return cfg.token.trim();
  try {
    if (typeof globalThis?.TELEGRAM_TOKEN === "string") {
      const token = globalThis.TELEGRAM_TOKEN.trim();
      if (token) return token;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window?.TELEGRAM_TOKEN === "string") {
      const token = window.TELEGRAM_TOKEN.trim();
      if (token) return token;
    }
  } catch {
    // ignore
  }
  try {
    const token = window?.AL_BOTS_CONFIG?.telegram?.token;
    if (typeof token === "string" && token.trim()) return token.trim();
  } catch {
    // ignore
  }
  return null;
};

const readTelegramChatId = (cfg = {}) => {
  if (typeof cfg.chatId === "string" && cfg.chatId.trim()) {
    return cfg.chatId.trim();
  }
  try {
    if (typeof globalThis?.TELEGRAM_CHAT_ID === "string") {
      const chatId = globalThis.TELEGRAM_CHAT_ID.trim();
      if (chatId) return chatId;
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window?.TELEGRAM_CHAT_ID === "string") {
      const chatId = window.TELEGRAM_CHAT_ID.trim();
      if (chatId) return chatId;
    }
  } catch {
    // ignore
  }
  try {
    const chatId = window?.AL_BOTS_CONFIG?.telegram?.chatId;
    if (typeof chatId === "string" && chatId.trim()) return chatId.trim();
  } catch {
    // ignore
  }
  return null;
};

const createTelegramNotifier = ({
  enabled = false,
  token,
  chatId,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
} = {}) => {
  const st = {
    enabled: Boolean(enabled),
    token: readTelegramToken({ token }),
    chatId: readTelegramChatId({ chatId }),
    minIntervalMs: Math.max(
      250,
      Number(minIntervalMs || DEFAULT_MIN_INTERVAL_MS),
    ),
    lastSentAtByKey: new Map(),
  };

  const notify = ({ text, key = "default" } = {}) => {
    try {
      if (!st.enabled) return false;
      if (!text || typeof text !== "string") return false;
      if (!st.token || !st.chatId) return false;

      const now = Date.now();
      const bucket = String(key || "default");
      const lastSentAt = Number(st.lastSentAtByKey.get(bucket) || 0);
      if (now - lastSentAt < st.minIntervalMs) return false;

      const sender =
        typeof character?.name === "string" ? character.name : "bot";
      const message = `[${sender}] ${text}`;
      const url = `https://api.telegram.org/bot${encodeURIComponent(
        st.token,
      )}/sendMessage?chat_id=${encodeURIComponent(st.chatId)}&text=${encodeURIComponent(message)}`;

      if (typeof fetch_url === "function") {
        fetch_url(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{}",
        });
      } else if (typeof fetch === "function") {
        fetch(url, { method: "POST" }).catch(() => {});
      } else {
        return false;
      }

      st.lastSentAtByKey.set(bucket, now);
      return true;
    } catch {
      return false;
    }
  };

  const stopRoutine = () => {
    st.lastSentAtByKey.clear();
  };

  return {
    notify,
    stopRoutine,
  };
};

module.exports = {
  createTelegramNotifier,
};
