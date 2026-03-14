const eventCombat = await require("./event_combat.js");
const skills = await require("./skills.js");
const positionStore = await require("./position_store.js");
const huntRunner = await require("./hunt_runner.js");
const worldEventRunner = await require("./world_event_runner.js");
const supportRunner = await require("./support_runner.js");
const targeting = await require("./targeting.js");

module.exports = Object.assign(
  {},
  eventCombat,
  skills,
  positionStore,
  huntRunner,
  worldEventRunner,
  supportRunner,
  targeting,
);
