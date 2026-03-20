const inventoryService = await require("./inventory_service.js");
const chestLooter = await require("./chest_looter.js");
const inventoryState = await require("./inventory_state.js");
const consumables = await require("./consumables.js");

module.exports = Object.assign(
  {},
  inventoryService,
  chestLooter,
  inventoryState,
  consumables,
);
