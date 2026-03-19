const merchantBehavior = await require("./merchant_behavior.js");
const merchantGatherFsm = await require("./merchant_gather_fsm.js");
const pontyBuy = await require("./ponty_buy.js");

module.exports = Object.assign(
  {},
  merchantBehavior,
  merchantGatherFsm,
  pontyBuy,
);
