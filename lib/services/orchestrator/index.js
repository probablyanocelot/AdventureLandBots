const orchestratorService = await require("./orchestrator_service.js");
const orchestrator = await require("./orchestrator.js");

module.exports = Object.assign({}, orchestratorService, orchestrator);
