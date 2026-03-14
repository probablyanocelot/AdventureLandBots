const flags = await require("./flags.js");
const idle = await require("./idle.js");

module.exports = {
  ...flags,
  ...idle,
};
