// Farming no-event runtime bridge (phase 1).
// Purpose: keep feature ownership in service layer while legacy runtime extraction is in progress.

const { installNoEventFarming } = await require("../../al_farming_config.js");

module.exports = {
  installNoEventFarming,
};
