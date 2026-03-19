// Combat service contract helpers.
// Purpose: keep stable API shapes while combat implementation migrates.

const REQUIRED_EVENT_COMBAT_METHODS = Object.freeze(["stopRoutine"]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateEventCombatService = (service) => {
  if (hasMethods(service, REQUIRED_EVENT_COMBAT_METHODS)) return service;
  throw new TypeError(
    "Combat event service contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_EVENT_COMBAT_METHODS,
  hasMethods,
  validateEventCombatService,
};
