// Telemetry service wrapper.
// Purpose: expose telemetry runtime through service boundary for module callers.

const { installTelemetry } = await require("../../telemetry/client.js");

const createTelemetryModuleService = ({ cfg } = {}) => {
  return installTelemetry({ cfg });
};

module.exports = {
  createTelemetryModuleService,
};
