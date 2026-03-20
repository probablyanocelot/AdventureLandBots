const chestLooter = await require("./chest_looter.js");
const { validateChestLootingService } =
  await require("../../contracts/inventory_api.js");

const createChestLootingService = ({ intervalMs = 250 } = {}) => {
  const inner = chestLooter.installChestLooter({ intervalMs });
  return validateChestLootingService(inner);
};

module.exports = {
  ...chestLooter,
  createChestLootingService,
};
