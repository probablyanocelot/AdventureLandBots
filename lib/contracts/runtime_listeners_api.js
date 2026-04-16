// Runtime listeners service contract helpers.
// Purpose: keep stable listener API shape while runtime listener implementation migrates.

const REQUIRED_RUNTIME_LISTENER_METHODS = Object.freeze([
  "onCharacter",
  "onGame",
  "waitForCharacterEvent",
  "waitForCm",
  "waitForCmBatch",
  "installGlobalRuntimeListeners",
  "stopGlobalRuntimeListeners",
]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateRuntimeListenersService = (service) => {
  if (hasMethods(service, REQUIRED_RUNTIME_LISTENER_METHODS)) return service;
  throw new TypeError(
    "Runtime listeners service contract violation: expected public listener methods",
  );
};

module.exports = {
  REQUIRED_RUNTIME_LISTENER_METHODS,
  hasMethods,
  validateRuntimeListenersService,
};
