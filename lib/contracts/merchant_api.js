// Merchant service contract helpers.
// Purpose: enforce stable merchant boundary consumed by characters/runtime.

const REQUIRED_METHODS = Object.freeze([
  "botLoop",
  "start",
  "stander",
  "goGather",
  "doVendorRuns",
  "checkForTools",
  "stopRoutine",
]);

const hasRequiredMethods = (service) => {
  if (!service || typeof service !== "object") return false;
  return REQUIRED_METHODS.every((m) => typeof service[m] === "function");
};

const validateMerchantService = (service) => {
  if (hasRequiredMethods(service)) return service;

  throw new TypeError(
    "Merchant service contract violation: expected methods botLoop(), start(), stander(), goGather(), doVendorRuns(), checkForTools(), and stopRoutine()",
  );
};

module.exports = {
  REQUIRED_METHODS,
  hasRequiredMethods,
  validateMerchantService,
};
