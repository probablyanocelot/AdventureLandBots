// Farming service wrapper.
// Purpose: expose stable service APIs via service-local runtime bridge.

const { installNoEventFarming } =
  await require("./no_event_farming_runtime.js");
const { validateNoEventFarmingService } =
  await require("../../contracts/farming_api.js");

const createNoEventFarmingService = ({ cfg } = {}) => {
  const inner = installNoEventFarming({ cfg });
  return validateNoEventFarmingService(inner);
};

const createNoEventFarmingModuleService = ({ cfg } = {}) => {
  return createNoEventFarmingService({ cfg });
};

module.exports = {
  createNoEventFarmingService,
  createNoEventFarmingModuleService,
};
