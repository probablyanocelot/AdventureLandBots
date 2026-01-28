const { attack } = await require("combat.js");
const { moveTo } = await require("movement.js");

async function start() {
  await moveTo("main");
  await attack("goo");
}

module.exports = { start };
