const { itemsToBuy, shinyBuyBlackList } = require("./npc_buy_list");
const { sellList } = require("./npc_sell_list");
const {
  noUpgradeList,
  upgradeList,
  highUpgradeList,
  compoundList,
} = require("./upgrade_list");
const { noExchange } = require("./exchange_list");

module.exports = Object.assign(
  {},
  itemsToBuy,
  shinyBuyBlackList,
  sellList,
  noUpgradeList,
  upgradeList,
  highUpgradeList,
  compoundList,
  noExchange,
);
