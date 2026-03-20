// Merchant-role service contract helpers.
// Purpose: keep stable API shapes for merchant-role utilities.

const REQUIRED_TOOL_PROVISIONING_METHODS = Object.freeze([
  "checkForTools",
  "stopRoutine",
]);
const REQUIRED_BANK_CRAFTING_METHODS = Object.freeze(["stopRoutine"]);
const REQUIRED_UNPACK_SUPPORT_METHODS = Object.freeze(["stopRoutine"]);

const hasMethods = (service, methods = []) => {
  if (!service || typeof service !== "object") return false;
  return methods.every((m) => typeof service[m] === "function");
};

const validateToolProvisioningService = (service) => {
  if (hasMethods(service, REQUIRED_TOOL_PROVISIONING_METHODS)) return service;
  throw new TypeError(
    "Merchant-role tool provisioning contract violation: expected methods checkForTools() and stopRoutine()",
  );
};

const validateBankCraftingService = (service) => {
  if (hasMethods(service, REQUIRED_BANK_CRAFTING_METHODS)) return service;
  throw new TypeError(
    "Merchant-role bank crafting contract violation: expected method stopRoutine()",
  );
};

const validateUnpackSupportService = (service) => {
  if (hasMethods(service, REQUIRED_UNPACK_SUPPORT_METHODS)) return service;
  throw new TypeError(
    "Merchant-role unpack support contract violation: expected method stopRoutine()",
  );
};

module.exports = {
  REQUIRED_TOOL_PROVISIONING_METHODS,
  REQUIRED_BANK_CRAFTING_METHODS,
  REQUIRED_UNPACK_SUPPORT_METHODS,
  hasMethods,
  validateToolProvisioningService,
  validateBankCraftingService,
  validateUnpackSupportService,
};
