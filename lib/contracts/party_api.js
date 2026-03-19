// Party service contract helpers.
// Purpose: keep a stable API shape while party implementation migrates.

const REQUIRED_AUTO_PARTY_METHODS = Object.freeze(["stopRoutine"]);
const REQUIRED_PRIEST_SWAP_METHODS = Object.freeze(["stopRoutine"]);

const hasRequiredMethods = (service, methods = REQUIRED_AUTO_PARTY_METHODS) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validatePartyService = (service) => {
  if (hasRequiredMethods(service, REQUIRED_AUTO_PARTY_METHODS)) return service;

  throw new TypeError(
    "Party service contract violation: expected method stopRoutine()",
  );
};

const validatePriestSwapService = (service) => {
  if (hasRequiredMethods(service, REQUIRED_PRIEST_SWAP_METHODS)) return service;

  throw new TypeError(
    "Party priest-swap service contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_AUTO_PARTY_METHODS,
  REQUIRED_PRIEST_SWAP_METHODS,
  hasRequiredMethods,
  validatePartyService,
  validatePriestSwapService,
};
