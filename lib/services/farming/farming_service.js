// Farming service wrapper.
// Purpose: expose stable service APIs while legacy farming implementation remains in place.

const { installNoEventFarming } = await require("../../al_farming_config.js");
const { validateNoEventFarmingService } =
  await require("../../contracts/farming_api.js");

const createNoEventFarmingService = ({ cfg } = {}) => {
  const inner = installNoEventFarming({ cfg });
  return validateNoEventFarmingService(inner);
};

module.exports = {
  createNoEventFarmingService,
};
