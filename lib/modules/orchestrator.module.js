const { warn } = await require("../al_debug_log.js");

const installOrchestratorModule = async ({ cfg } = {}) => {
  try {
    const runOn = cfg?.orchestrator?.runOnCtype || "merchant";
    if (!cfg?.orchestrator?.enabled) return null;
    if (character.ctype !== runOn) return null;

    const { Orchestrator } = await require("../class_orchestrator.js");
    const orchestrator = new Orchestrator();
    if (typeof orchestrator.init === "function") await orchestrator.init();
    return orchestrator;
  } catch (e) {
    warn("Failed to install orchestrator module", e);
    return null;
  }
};

module.exports = {
  installOrchestratorModule,
};
