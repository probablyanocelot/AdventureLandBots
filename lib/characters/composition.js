const { Idle } = await require("../class_idle.js");

const trySetMessage = (message) => {
  if (!message) return;
  try {
    if (typeof set_message === "function") set_message(message);
  } catch {
    // ignore
  }
};

const createRecurringLoop = ({ intervalMs = 1000, onTick } = {}) => {
  const st = {
    started: false,
    stopped: false,
    timer: null,
  };

  const tick = async () => {
    if (st.stopped) return;
    try {
      if (typeof onTick === "function") await onTick();
    } catch {
      // ignore
    } finally {
      if (st.stopped) return;
      st.timer = setTimeout(() => void tick(), Math.max(50, intervalMs));
    }
  };

  const start = () => {
    if (st.started || st.stopped) return;
    st.started = true;
    void tick();
  };

  const stop = () => {
    st.stopped = true;
    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  return {
    start,
    stop,
    dispose: () => stop(),
    [Symbol.dispose]: () => stop(),
    [Symbol.asyncDispose]: async () => stop(),
  };
};

const createIdleStatusShell = ({
  label,
  intervalMs = 1000,
  onTick,
  messageBuilder,
} = {}) => {
  const idle = new Idle();
  idle.startIdle();

  const loop = createRecurringLoop({
    intervalMs,
    onTick: async () => {
      const message =
        typeof messageBuilder === "function"
          ? messageBuilder({ idleCounter: idle.counter, label })
          : `${label} ready | idle: ${idle.counter}s`;
      trySetMessage(message);
      if (typeof onTick === "function") await onTick();
    },
  });

  const stop = () => {
    loop.stop();
    try {
      idle.stop();
    } catch {
      // ignore
    }
  };

  return {
    idle,
    start: () => loop.start(),
    stop,
    dispose: () => stop(),
    [Symbol.dispose]: () => stop(),
    [Symbol.asyncDispose]: async () => stop(),
  };
};

module.exports = {
  createRecurringLoop,
  createIdleStatusShell,
};
