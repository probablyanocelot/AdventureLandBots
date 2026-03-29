const { shinyBuyBlackList } = require("../data/npc_buy_list");

function upgrade_replacement() {
  const { noUpgradeList } = require("../data");
  const sellList = require("../data");
  let TIMEOUT = 1000;
  let maxLevel = 8;
  for (let level = 0; level <= maxLevel; level++) {
    for (let itemIndex in character.items) {
      let item = character.items[itemIndex];
      if (!item || item.level != level) continue;

      let itemName = item.name;
      if (noUpgradeList.includes(itemName)) continue;
      if (sellList.includes(itemName)) continue;
      if (itemName == "rod" || itemName == "pickaxe") continue;

      if (!isUpgradable(itemName)) continue;

      let grade = item_grade(item);
      if (item.p && item.p != "shiny") continue;
      if (item.ps || item.acc || item.ach) continue;
      if (item.p && grade >= 1) continue;
      if (grade == 0) {
        if (!item.p && !item.ps && shinyBuyBlackList.includes(itemName)) {
          sell(itemIndex);
          continue;
        }
        doUpgrade("scroll0", itemIndex);
      }
      if (
        itemName === ("wingedboots" || "pinkie") &&
        [6, 7].includes(item.level)
      ) {
        doUpgrade("scroll2", itemIndex);
        continue;
      }
      if (
        itemName === ("wingedboots" || "pinkie") &&
        [4, 5].includes(item.level)
      ) {
        doUpgrade("scroll1", itemIndex);
        continue;
      }
      if (grade == 1 && item.level < 7) {
        doUpgrade("scroll1", itemIndex);
        continue;
      }
      if (grade == 1 && item.level < 8) {
        doUpgrade("scroll2", itemIndex);
        continue;
      }
      if (grade == 2 && item.level < 3) {
        doUpgrade("scroll2", itemIndex);
        continue;
      }
      if (grade == 2 && item.level >= 8) continue;
      continue;
    }
  }
  setTimeout(upgrade_replacement, TIMEOUT);
}
