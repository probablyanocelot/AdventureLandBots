// Inventory service contract helpers.
// Purpose: keep stable API shapes while inventory implementation migrates.

const REQUIRED_CHEST_LOOTING_METHODS = Object.freeze(["stopRoutine"]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateChestLootingService = (service) => {
  if (hasMethods(service, REQUIRED_CHEST_LOOTING_METHODS)) return service;
  throw new TypeError(
    "Chest looting service contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_CHEST_LOOTING_METHODS,
  hasMethods,
  validateChestLootingService,
};
