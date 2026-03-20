const { validateToolProvisioningService } =
  await require("../../contracts/merchant_role_api.js");
const { createToolProvisioning } = await require("./tool_provisioning.js");
const { createBankCrafting } = await require("./bank_crafting.js");
const { createUnpackSupport } = await require("./unpack_support.js");
const { validateBankCraftingService, validateUnpackSupportService } =
  await require("../../contracts/merchant_role_api.js");

const createToolProvisioningService = ({ cfg } = {}) =>
  validateToolProvisioningService(createToolProvisioning({ cfg }));

const createBankCraftingService = ({ cfg } = {}) =>
  validateBankCraftingService(createBankCrafting({ cfg }));

const createUnpackSupportService = ({ cfg } = {}) =>
  validateUnpackSupportService(createUnpackSupport({ cfg }));

module.exports = {
  createToolProvisioningService,
  createBankCraftingService,
  createUnpackSupportService,
};
