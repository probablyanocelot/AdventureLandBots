const farmingService = await require("./farming_service.js");
const characterRegistry = await require("./character_registry.js");
const monsterhuntState = await require("./monsterhunt_state.js");
const chainMage = await require("./chain_mage.js");
const signature = await require("./signature.js");
const selection = await require("./selection.js");

module.exports = Object.assign(
  {},
  farmingService,
  characterRegistry,
  monsterhuntState,
  chainMage,
  signature,
  selection,
);
