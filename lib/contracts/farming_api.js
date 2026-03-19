// Farming service contract helpers.
// Purpose: keep stable API shapes while farming implementation migrates.

const REQUIRED_NO_EVENT_METHODS = Object.freeze(["stopRoutine"]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateNoEventFarmingService = (service) => {
  if (hasMethods(service, REQUIRED_NO_EVENT_METHODS)) return service;
  throw new TypeError(
    "No-event farming service contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_NO_EVENT_METHODS,
  hasMethods,
  validateNoEventFarmingService,
};
