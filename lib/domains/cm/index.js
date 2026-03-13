const baseCm = await require("./base_cm_commands.js");
const mageMagiportService = await require("./mage_magiport_service.js");
const magiport = await require("./magiport.js");
const unpackRequester = await require("./unpack_requester.js");
const upkeep = await require("./upkeep.js");

module.exports = {
  ...baseCm,
  ...mageMagiportService,
  ...magiport,
  ...unpackRequester,
  ...upkeep,
};
