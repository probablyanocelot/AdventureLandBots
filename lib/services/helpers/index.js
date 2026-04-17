const movement = await require("../movement/index.js");
const targeting = await require("../targeting/index.js");
const combat = await require("../combat/index.js");
const data = await require("../data/index.js");
const dataStructures = await require("../data-structures/index.js");
const time = await require("../time/index.js");
const roster = await require("../roster/index.js");

module.exports = {
  movement,
  targeting,
  combat,
  data,
  dataStructures,
  time,
  roster,
};
