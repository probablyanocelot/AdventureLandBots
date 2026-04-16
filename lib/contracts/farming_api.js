// Farming service contract helpers.
// Purpose: keep stable API shapes while farming implementation migrates.

const REQUIRED_FARMING_METHODS = Object.freeze(["stopRoutine"]);
const REQUIRED_ROLE_SYNC_METHODS = Object.freeze(["stopRoutine"]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateFarmingService = (service) => {
  if (hasMethods(service, REQUIRED_FARMING_METHODS)) return service;
  throw new TypeError(
    "Farming service contract violation: expected method stopRoutine()",
  );
};

const validateRoleSyncRequesterService = (service) => {
  if (hasMethods(service, REQUIRED_ROLE_SYNC_METHODS)) return service;
  throw new TypeError(
    "Role sync requester service contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_FARMING_METHODS,
  REQUIRED_ROLE_SYNC_METHODS,
  hasMethods,
  validateFarmingService,
  validateRoleSyncRequesterService,
};
