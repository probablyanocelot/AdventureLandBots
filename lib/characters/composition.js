const { Idle } = await require("../class_idle.js");

// Utility functions for character composition, such as creating idle status shells and recurring loops.

const trySetMessage = (message) => {
  // This function attempts to set the message using set_message, but safely ignores any errors if set_message is not available or fails.
  if (!message) return;
  try {
    if (typeof set_message === "function") set_message(message);
  } catch {
    // ignore
  }
};

const createRecurringLoop = ({ intervalMs = 1000, onTick } = {}) => {
  // This function creates a recurring loop that calls the onTick function at specified intervals (intervalMs). It returns an object with start, stop, and dispose methods to control the loop.
  const st = {
    started: false,
    stopped: false,
    timer: null,
  };

  const tick = async () => {
    // This is the function that gets called at each interval. It checks if the loop has been stopped, and if not, it calls the onTick function and then schedules the next tick.
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
    // This function starts the recurring loop. It checks if the loop has already been started or stopped, and if not, it marks it as started and initiates the first tick.
    if (st.started || st.stopped) return;
    st.started = true;
    void tick();
  };

  const stop = () => {
    // This function stops the recurring loop. It marks it as stopped and clears any existing timer to prevent further ticks.
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
