// Farming role sync requester.
// Purpose: let non-warrior clients request a role sync from configured warrior.

const createRoleSyncRequesterService = ({ cfg, ownerName, reason } = {}) => {
  const st = {
    stopped: false,
    timers: [],
  };

  const stopRoutine = () => {
    st.stopped = true;
    try {
      for (const timer of st.timers) clearTimeout(timer);
    } catch {
      // ignore
    }
    st.timers.length = 0;
  };

  const ctype = character?.ctype || null;
  if (ctype !== "mage") {
    return {
      stopRoutine,
      dispose: () => stopRoutine(),
      [Symbol.dispose]: () => stopRoutine(),
      [Symbol.asyncDispose]: async () => stopRoutine(),
    };
  }

  const warriorName = cfg?.noEventFarming?.aggroLockChain?.warriorName || null;

  if (
    !warriorName ||
    warriorName === ownerName ||
    warriorName === character?.name
  ) {
    return {
      stopRoutine,
      dispose: () => stopRoutine(),
      [Symbol.dispose]: () => stopRoutine(),
      [Symbol.asyncDispose]: async () => stopRoutine(),
    };
  }

  const sendRequest = () => {
    if (st.stopped) return;
    try {
      const fromName = ownerName || character?.name || null;
      if (!fromName) return;
      if (typeof send_cm !== "function") return;
      send_cm(warriorName, {
        cmd: "farm:role_sync_request",
        from: fromName,
        reason: reason || "code_loaded",
        at: Date.now(),
      });
    } catch {
      // ignore
    }
  };

  sendRequest();

  for (const delay of [1200, 3000]) {
    try {
      st.timers.push(setTimeout(sendRequest, delay));
    } catch {
      // ignore
    }
  }

  return {
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  createRoleSyncRequesterService,
};
