const merchantRoleService = await require("./merchant_role_service.js");
const toolProvisioning = await require("./tool_provisioning.js");
const bankCrafting = await require("./bank_crafting.js");
const unpackSupport = await require("./unpack_support.js");

module.exports = Object.assign(
  {},
  merchantRoleService,
  toolProvisioning,
  bankCrafting,
  unpackSupport,
);
