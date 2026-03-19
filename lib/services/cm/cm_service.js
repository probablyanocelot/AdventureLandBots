// CM service wrapper.
// Purpose: expose stable service APIs via service-owned implementation.

const { installUpkeep } = await require("./upkeep_runtime.js");
const { installUnpackRequester } =
  await require("./unpack_requester_runtime.js");
const { installBaseCmCommands } =
  await require("./base_character_cm_runtime.js");
const { installMagiportAutoAccept } =
  await require("./magiport_accept_runtime.js");
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

const createUpkeepModuleService = ({ cfg } = {}) => {
  return createUpkeepService({ cfg });
};

const createUnpackRequesterModuleService = ({ cfg } = {}) => {
  return createUnpackRequesterService({ cfg });
};

module.exports = {
  createUpkeepService,
  createUnpackRequesterService,
  createUpkeepModuleService,
  createUnpackRequesterModuleService,
  installBaseCmCommands,
  installMagiportAutoAccept,
};
