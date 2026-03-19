// CM service contract helpers.
// Purpose: keep stable API shapes while CM implementation migrates.

const REQUIRED_UPKEEP_METHODS = Object.freeze(["stopRoutine"]);
const REQUIRED_UNPACK_METHODS = Object.freeze(["stopRoutine"]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateUpkeepService = (service) => {
  if (hasMethods(service, REQUIRED_UPKEEP_METHODS)) return service;
  throw new TypeError(
    "CM upkeep service contract violation: expected method stopRoutine()",
  );
};

const validateUnpackRequesterService = (service) => {
  if (hasMethods(service, REQUIRED_UNPACK_METHODS)) return service;
  throw new TypeError(
    "CM unpack requester service contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_UPKEEP_METHODS,
  REQUIRED_UNPACK_METHODS,
  hasMethods,
  validateUpkeepService,
  validateUnpackRequesterService,
};
