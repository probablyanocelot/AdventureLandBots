// Orchestrator service contract helpers.
// Purpose: keep a stable API shape while orchestrator implementation migrates.

const REQUIRED_METHODS = Object.freeze(["init", "stopRoutine"]);

const hasRequiredMethods = (service) => {
  if (!service || typeof service !== "object") return false;
  return REQUIRED_METHODS.every((m) => typeof service[m] === "function");
};

const validateOrchestratorService = (service) => {
  if (hasRequiredMethods(service)) return service;

  throw new TypeError(
    "Orchestrator service contract violation: expected methods init() and stopRoutine()",
  );
};

module.exports = {
  REQUIRED_METHODS,
  hasRequiredMethods,
  validateOrchestratorService,
};
