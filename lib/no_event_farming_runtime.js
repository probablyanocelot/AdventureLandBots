// No-event farming runtime adapter (phase-11 transition).
// Purpose: decouple farming service bridge from direct al_farming_config import.

const { installNoEventFarming } = await require("./al_farming_config.js");

module.exports = {
  installNoEventFarming,
};
