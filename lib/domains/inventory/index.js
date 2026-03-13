const chestLooter = await require("./chest_looter.js");
const inventoryState = await require("./inventory_state.js");

module.exports = {
  ...chestLooter,
  ...inventoryState,
};
