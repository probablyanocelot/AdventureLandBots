const { warn } = await require("../al_debug_log.js");

const createServiceModuleInstaller = ({
  moduleLabel,
  shouldInstall,
  installService,
} = {}) => {
  if (typeof installService !== "function") {
    throw new TypeError("installService must be a function");
  }

  return async (ctx = {}) => {
    try {
      if (typeof shouldInstall === "function") {
        const allowed = await shouldInstall(ctx);
        if (!allowed) return null;
      }

      return (await installService(ctx)) ?? null;
    } catch (e) {
      const label = moduleLabel || "unknown";
      warn(`Failed to install ${label} module`, e);
      return null;
    }
  };
};

module.exports = {
  createServiceModuleInstaller,
};
