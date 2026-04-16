const { buyFromPonty } = await require("./ponty_buy.js");
const { isGathering } = await require("../../state/flags.js");
const { smartMove } = await require("../../../infra/game_api.js");
const { createMluckSupport } = await require("../mluck.js");
const { applyMassExchangeBuffs } = await require("../mass_exchange.js");
const { createEmotionEmitter } = await require("../emotion_emitter.js");
const { installMerchantKeybinds } = await require("../keybinds.js");
const { createTelegramNotifier } = await require("../telegram_notifier.js");
const { createRareMobScanner } =
  await require("../../server-events/rare_mob_scanner.js");
const { createDiscountBuyer } = await require("../discount_buyer.js");
const { installBankOverview } = await require("../bank_overview_loader.js");
const { createBankHanoi } = await require("../bank_hanoi.js");
const { createMerchantCompounder } = await require("../compounder.js");
const { handleKaneCrabRoutine } = await require("../../farming/kane.js");

const createMerchantBehavior = ({ idle, gatherFsm, home, cfg } = {}) => {
  const merchantRuntimeCfg =
    cfg && typeof cfg === "object" ? cfg.merchantRuntime || {} : {};

  const mluckCfg =
    merchantRuntimeCfg.mluck && typeof merchantRuntimeCfg.mluck === "object"
      ? merchantRuntimeCfg.mluck
      : {};
  const massExchangeCfg =
    merchantRuntimeCfg.massExchange &&
    typeof merchantRuntimeCfg.massExchange === "object"
      ? merchantRuntimeCfg.massExchange
      : {};
  const emotionsCfg =
    merchantRuntimeCfg.emotions &&
    typeof merchantRuntimeCfg.emotions === "object"
      ? merchantRuntimeCfg.emotions
      : {};
  const keybindsCfg =
    merchantRuntimeCfg.keybinds &&
    typeof merchantRuntimeCfg.keybinds === "object"
      ? merchantRuntimeCfg.keybinds
      : {};
  const telegramCfg =
    merchantRuntimeCfg.telegram &&
    typeof merchantRuntimeCfg.telegram === "object"
      ? merchantRuntimeCfg.telegram
      : {};
  const rareMobScanCfg =
    merchantRuntimeCfg.rareMobScan &&
    typeof merchantRuntimeCfg.rareMobScan === "object"
      ? merchantRuntimeCfg.rareMobScan
      : {};
  const discountBuyCfg =
    merchantRuntimeCfg.discountBuy &&
    typeof merchantRuntimeCfg.discountBuy === "object"
      ? merchantRuntimeCfg.discountBuy
      : {};
  const bankOverviewCfg =
    merchantRuntimeCfg.bankOverview &&
    typeof merchantRuntimeCfg.bankOverview === "object"
      ? merchantRuntimeCfg.bankOverview
      : {};
  const bankHanoiCfg =
    merchantRuntimeCfg.bankHanoi &&
    typeof merchantRuntimeCfg.bankHanoi === "object"
      ? merchantRuntimeCfg.bankHanoi
      : {};
  const compoundCfg =
    merchantRuntimeCfg.compound &&
    typeof merchantRuntimeCfg.compound === "object"
      ? merchantRuntimeCfg.compound
      : {};
  const citizen0Cfg =
    merchantRuntimeCfg.citizen0Lure &&
    typeof merchantRuntimeCfg.citizen0Lure === "object"
      ? merchantRuntimeCfg.citizen0Lure
      : {};

  const mluckSupport = createMluckSupport(mluckCfg);
  const emotionEmitter = createEmotionEmitter(emotionsCfg);
  const telegramNotifier = createTelegramNotifier(telegramCfg);
  const rareMobScanner = createRareMobScanner({
    ...rareMobScanCfg,
    notify: telegramNotifier.notify,
  });
  const discountBuyer = createDiscountBuyer({
    ...discountBuyCfg,
    notify: telegramNotifier.notify,
  });
  const bankHanoi = createBankHanoi(bankHanoiCfg);
  const compounder = createMerchantCompounder(compoundCfg);

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

  const goHomeIfIdle = async () => {
    if (character?.ctype !== "merchant") return false;
    if (smart.moving || character.moving || isGathering()) return false;

    if (
      character.map === home.map &&
      Number(character.x) === Number(home.x) &&
      Number(character.y) === Number(home.y)
    ) {
      return false;
    }

    try {
      await smartMove(home);
      return true;
    } catch {
      return false;
    }
  };

  const fullSell = () => {
    // may not implement
    if (!Array.isArray(character?.items) || character.esize > 0) return false;

    const sellItemNames = new Set(
      Array.isArray(merchantRuntimeCfg.fullSell?.sellNames)
        ? merchantRuntimeCfg.fullSell.sellNames.map((n) =>
            String(n).toLowerCase(),
          )
        : [],
    );
    if (sellItemNames.size === 0) return false;

    let soldAny = false;

    for (let i = 0; i < character.items.length; i += 1) {
      const item = character.items[i];
      if (!item || !item.name) continue;
      if (item.p || item.acc) continue;
      if (typeof item.level === "number" && item.level > 2) continue;

      const itemName = String(item.name).toLowerCase();
      if (!sellItemNames.has(itemName)) continue;

      try {
        sell(i, item.q || 1);
        soldAny = true;
      } catch {
        // ignore failures and continue
      }
    }

    return soldAny;
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

    applyMassExchangeBuffs(massExchangeCfg);
    mluckSupport.apply();
    emotionEmitter.tick();
    rareMobScanner.scan();
    discountBuyer.scanAndBuy();
    compounder.tick();
    await bankHanoi.tick();

    const kaneHandled = await handleKaneCrabRoutine({
      cfg,
      st,
      mover: null,
      effectiveIsTinyForKane: citizen0Cfg.enabled === true,
    });

    if (!kaneHandled) {
      await goGather();
      await doVendorRuns();
    }

    if (!st.running || st.disposed) return;
    st.botLoopTimer = setTimeout(() => void loop(), 250);
  };

  const start = () => {
    if (!st.running || st.disposed) return;

    installMerchantKeybinds(keybindsCfg);
    void installBankOverview(bankOverviewCfg);

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

  const stopRoutine = () => {
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

    try {
      mluckSupport.stopRoutine();
    } catch {
      // ignore
    }

    try {
      emotionEmitter.stopRoutine();
    } catch {
      // ignore
    }

    try {
      telegramNotifier.stopRoutine();
    } catch {
      // ignore
    }

    try {
      rareMobScanner.stopRoutine();
    } catch {
      // ignore
    }

    try {
      discountBuyer.stopRoutine();
    } catch {
      // ignore
    }

    try {
      bankHanoi.stopRoutine();
    } catch {
      // ignore
    }

    try {
      compounder.stopRoutine();
    } catch {
      // ignore
    }
  };

  return {
    start,
    stopRoutine,
    stander,
    goGather,
    doVendorRuns,
    goHomeIfIdle,
    fullSell,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  createMerchantBehavior,
};
