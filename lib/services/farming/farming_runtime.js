// Farming runtime service entrypoint.
// Purpose: keep farming runtime ownership in service layer.

const { installNoEventFarming } = await require("./farming_runtime_impl.js");

module.exports = {
  installNoEventFarming,
};
