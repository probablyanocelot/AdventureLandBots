const combatService = await require("./combat_service.js");
const huntRunner = await require("./hunt_runner.js");
const worldEventRunner = await require("./world_event_runner.js");
const positionStore = await require("./position_store.js");
const targeting = await require("./targeting.js");
const skills = await require("./skills.js");

module.exports = Object.assign(
  {},
  combatService,
  huntRunner,
  worldEventRunner,
  positionStore,
  targeting,
  skills,
);
