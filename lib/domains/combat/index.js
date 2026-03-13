const eventCombat = await require("./event_combat.js");
const skills = await require("./skills.js");
const standardCombat = await require("./standard_combat.js");
const targeting = await require("./targeting.js");

module.exports = {
  ...eventCombat,
  ...skills,
  ...standardCombat,
  ...targeting,
};
