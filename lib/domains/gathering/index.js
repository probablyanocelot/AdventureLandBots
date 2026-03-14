const merchantBehavior = await require("./merchant_behavior.js");
const merchantGatherFsm = await require("./merchant_gather_fsm.js");

module.exports = Object.assign({}, merchantBehavior, merchantGatherFsm);
