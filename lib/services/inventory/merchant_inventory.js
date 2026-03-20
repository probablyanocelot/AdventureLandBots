const { createToolProvisioningService } =
  await require("../merchant_role/index.js");

const createMerchantInventoryService = ({ cfg } = {}) =>
  createToolProvisioningService({ cfg });

let defaultService = null;

const getDefaultService = () => {
  if (!defaultService) {
    defaultService = createMerchantInventoryService();
  }
  return defaultService;
};

const checkForTools = () => getDefaultService().checkForTools();

const stopRoutine = () => {
  try {
    getDefaultService().stopRoutine();
  } finally {
    defaultService = null;
  }
};

module.exports = {
  createMerchantInventoryService,
  checkForTools,
  stopRoutine,
  dispose: () => stopRoutine(),
  [Symbol.dispose]: () => stopRoutine(),
  [Symbol.asyncDispose]: async () => stopRoutine(),
};
