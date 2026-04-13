const movement = await require("../helper-movement/index.js");
const targeting = await require("../helper-targeting/index.js");
const combat = await require("../helper-combat/index.js");
const data = await require("../helper-data/index.js");
const dataStructures = await require("../helper-data-structures/index.js");
const time = await require("../helper-time/index.js");
const roster = await require("../helper-roster/index.js");

module.exports = {
  movement,
  targeting,
  combat,
  data,
  dataStructures,
  time,
  roster,
};
