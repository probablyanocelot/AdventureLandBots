const merchantBehavior = await require("./merchant_behavior.js");
const merchantGatherFsm = await require("./merchant_gather_fsm.js");
const gatherFsm = await require("./gather_fsm.js");
const pontyBuy = await require("./ponty_buy.js");
const buyingRules = await require("./buying_rules.js");

module.exports = Object.assign(
  {},
  merchantBehavior,
  merchantGatherFsm,
  gatherFsm,
  pontyBuy,
  buyingRules,
);
