// Farming service wrapper.
// Purpose: expose stable service APIs via service-local runtime bridge.

const { installFarming } = await require("./farming_runtime.js");
const { createRoleSyncRequesterService: createRoleSyncRequester } =
  await require("./role_sync_requester.js");
const { validateFarmingService } =
  await require("../../contracts/farming_api.js");
const { validateRoleSyncRequesterService } =
  await require("../../contracts/farming_api.js");

const createFarmingModuleService = ({ cfg } = {}) => {
  const inner = installFarming({ cfg });
  return validateFarmingService(inner);
};

const createNoEventFarmingModuleService = createFarmingModuleService;

const createRoleSyncRequesterService = ({ cfg, ownerName, reason } = {}) => {
  const inner = createRoleSyncRequester({ cfg, ownerName, reason });
  return validateRoleSyncRequesterService(inner);
};

module.exports = {
  createFarmingModuleService,
  createNoEventFarmingModuleService,
  createRoleSyncRequesterService,
};
