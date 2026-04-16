const farmingService = await require("./farming_service.js");
const characterRegistry = await require("./character_registry.js");
const monsterhuntState = await require("./monsterhunt_state.js");
const farmingRunner = await require("./farming_runner.js");
const chainMage = await require("./chain_mage.js");
const roleSyncRequester = await require("./role_sync_requester.js");
const signature = await require("./signature.js");
const selection = await require("./selection.js");
const { getFarmingConfig } = await require("./farming_config.js");

module.exports = Object.assign(
  {},
  farmingService,
  characterRegistry,
  monsterhuntState,
  farmingRunner,
  chainMage,
  roleSyncRequester,
  signature,
  selection,
  {
    getFarmingConfig,
  },
);
