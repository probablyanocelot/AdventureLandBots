const { warn } = await require("../al_debug_log.js");

const installTelemetryModule = async ({ cfg } = {}) => {
  try {
    if (cfg?.telemetry?.enabled === false) return null;
    const { installTelemetry } = await require("../telemetry/client.js");
    return installTelemetry({ cfg });
  } catch (e) {
    warn("Failed to install telemetry module", e);
    return null;
  }
};

module.exports = {
  installTelemetryModule,
};
