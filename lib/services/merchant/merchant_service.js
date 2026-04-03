const { validateMerchantService } =
  await require("../../contracts/merchant_api.js");
const { getConfig } = await require("../../config/index.js");
const { Idle } = await require("../state/index.js");
const { MerchantGatherFsm, createMerchantBehavior } =
  await require("./gathering/index.js");
const {
  createToolProvisioningService,
  createBankCraftingService,
  createUnpackSupportService,
} = await require("../merchant_role/index.js");

const DEFAULT_HOME = Object.freeze({ map: "main", x: -202, y: -50 });
const DEFAULT_GATHER_LOC = Object.freeze({
  fishing: { map: "main", x: -1368, y: -216 },
  mining: { map: "woffice", x: -153.15, y: -177 },
});

const createMerchantService = ({
  home = DEFAULT_HOME,
  gatherLoc = DEFAULT_GATHER_LOC,
  gatherOrder = ["fishing", "mining"],
  gatherRepeatMs = 15000,
  cfg,
} = {}) => {
  const resolvedCfg = cfg || getConfig();
  const idle = new Idle();
  const gatherFsm = new MerchantGatherFsm({
    gatherLoc,
    order: gatherOrder,
    repeatMs: gatherRepeatMs,
  });
  const behavior = createMerchantBehavior({
    idle,
    gatherFsm,
    home,
    cfg: resolvedCfg,
  });
  const inventory = createToolProvisioningService({ cfg: resolvedCfg });
  const bankCrafting = createBankCraftingService({ cfg: resolvedCfg });
  const unpackSupport = createUnpackSupportService({ cfg: resolvedCfg });

  const st = {
    started: false,
    disposed: false,
  };

  const start = () => {
    if (st.disposed || st.started) return;
    st.started = true;

    idle.startIdle().catch(() => {
      // ignore
    });
    behavior.start();
  };

  const botLoop = async () => {
    start();
  };

  const stander = async () => behavior.stander();

  const goGather = async (strGatherType) => behavior.goGather(strGatherType);

  const doVendorRuns = async () => behavior.doVendorRuns();

  const goHomeIfIdle = async () => behavior.goHomeIfIdle?.();

  //const fullSell = () => behavior.fullSell?.();

  const checkForTools = () => inventory.checkForTools();

  const stopRoutine = () => {
    st.disposed = true;
    st.started = false;

    try {
      behavior.stopRoutine();
    } catch {
      // ignore
    }

    try {
      idle.stopRoutine();
    } catch {
      // ignore
    }

    try {
      inventory.stopRoutine();
    } catch {
      // ignore
    }

    try {
      bankCrafting.stopRoutine?.();
    } catch {
      // ignore
    }

    try {
      unpackSupport.stopRoutine?.();
    } catch {
      // ignore
    }
  };

  return validateMerchantService({
    botLoop,
    start,
    stander,
    goGather,
    doVendorRuns,
    goHomeIfIdle,
   // fullSell,
    checkForTools,
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  });
};

module.exports = {
  DEFAULT_HOME,
  DEFAULT_GATHER_LOC,
  createMerchantService,
};
