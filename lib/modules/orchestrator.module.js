const { warn } = await require("../al_debug_log.js");

const install = async ({ cfg } = {}) => {
  try {
    const runOn = cfg?.orchestrator?.runOnCtype || "merchant";
    if (!cfg?.orchestrator?.enabled) return null;
    if (character.ctype !== runOn) return null;

    const { createOrchestratorService } =
      await require("../services/orchestrator/index.js");
    const orchestratorService = createOrchestratorService();
    if (typeof orchestratorService.init === "function") {
      await orchestratorService.init();
    }
    return orchestratorService;
  } catch (e) {
    warn("Failed to install orchestrator module", e);
    return null;
  }
};

module.exports = {
  install,
};
