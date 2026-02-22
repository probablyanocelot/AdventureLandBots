const { buyFromPonty } = await require("../../npc_ponty_buy.js");
const { isGathering } = await require("../state/flags.js");
const { smartMove } = await require("../../infra/game_api.js");

const createMerchantBehavior = ({ idle, gatherFsm, home } = {}) => {
  const st = {
    running: true,
    disposed: false,
    botLoopTimer: null,
    standerInterval: null,
    standerBusy: false,
  };

  const stander = async () => {
    const computer = locate_item("computer");
    const basicStand = locate_item("stand0");

    const stand = computer !== -1 ? computer : basicStand;
    if (stand === -1) return;
    if (character.stand && (character.moving || smart.moving)) {
      await close_stand(stand);
      return;
    }
    if (!character.stand && !character.moving && !smart.moving) {
      open_stand(stand);
    }
  };

  const goGather = async (strGatherType) => {
    if (!gatherFsm || typeof gatherFsm.runOnce !== "function") return;
    await gatherFsm.runOnce(strGatherType);
  };

  const doVendorRuns = async () => {
    if (isGathering()) return;
    if (gatherFsm?.hasPendingTask?.()) return;
    if (Number(idle?.counter || 0) < 180) return;
    await smartMove(home);
    await buyFromPonty();
  };

  const loop = async () => {
    if (!st.running || st.disposed) return;

    try {
      if (typeof set_message === "function") {
        set_message(`Merchant active | idle: ${idle?.counter || 0}s`);
      }
    } catch {
      // ignore
    }

    await goGather();
    await doVendorRuns();

    if (!st.running || st.disposed) return;
    st.botLoopTimer = setTimeout(() => void loop(), 250);
  };

  const start = () => {
    if (!st.running || st.disposed) return;
    if (!st.standerInterval) {
      st.standerInterval = setInterval(() => {
        if (!st.running || st.disposed) return;
        if (st.standerBusy) return;
        st.standerBusy = true;
        stander()
          .catch(() => {})
          .finally(() => {
            st.standerBusy = false;
          });
      }, 250);
    }

    if (!st.botLoopTimer) void loop();
  };

  const stop = () => {
    st.running = false;
    st.disposed = true;

    try {
      if (st.botLoopTimer) clearTimeout(st.botLoopTimer);
    } catch {
      // ignore
    }
    st.botLoopTimer = null;

    try {
      if (st.standerInterval) clearInterval(st.standerInterval);
    } catch {
      // ignore
    }
    st.standerInterval = null;
  };

  return {
    start,
    stop,
    stander,
    goGather,
    doVendorRuns,
    dispose: () => stop(),
    [Symbol.dispose]: () => stop(),
    [Symbol.asyncDispose]: async () => stop(),
  };
};

module.exports = {
  createMerchantBehavior,
};
