// CM service wrapper.
// Purpose: expose stable service APIs while legacy CM domain remains in place.

const { installUpkeep, installUnpackRequester } =
  await require("../../domains/cm/index.js");
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
