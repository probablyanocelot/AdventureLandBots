// Farming no-event runtime service entrypoint.
// Purpose: keep no-event farming runtime ownership in service layer.

const { installNoEventFarming } =
  await require("./no_event_farming_runtime_impl.js");

module.exports = {
  installNoEventFarming,
};
