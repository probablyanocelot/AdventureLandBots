// CM service wrapper.
// Purpose: expose stable service APIs via service-owned implementation.

const { installUpkeep } = await require("./upkeep_runtime.js");
const { installUnpackRequester } =
  await require("./unpack_requester_runtime.js");
const { validateUpkeepService, validateUnpackRequesterService } =
  await require("../../contracts/cm_api.js");

const createUpkeepService = ({ cfg } = {}) => {
  const inner = installUpkeep({ cfg });
  return validateUpkeepService(inner);
};

const createUnpackRequesterService = ({ cfg } = {}) => {
  const inner = installUnpackRequester({ cfg });
  return validateUnpackRequesterService(inner);
};

module.exports = {
  createUpkeepService,
  createUnpackRequesterService,
};
