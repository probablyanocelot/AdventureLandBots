const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    if (cfg?.telemetry?.enabled === false) return null;
    const { createTelemetryService } =
      await require("../services/telemetry/index.js");
    return createTelemetryService({ cfg });
  } catch (e) {
    warn("Failed to install telemetry module", e);
    return null;
  }
};

module.exports = {
  install,
};
