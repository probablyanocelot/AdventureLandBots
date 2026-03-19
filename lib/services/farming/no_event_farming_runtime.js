// Farming no-event runtime bridge (phase 1).
// Purpose: keep feature ownership in service layer while legacy runtime extraction is in progress.

const { installNoEventFarming } =
  await require("../../no_event_farming_runtime.js");

module.exports = {
  installNoEventFarming,
};
