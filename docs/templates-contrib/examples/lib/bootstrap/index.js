const partyService = require("../services/party");
const partyModule = require("../modules/party");

function main(runtime, config = {}) {
  const container = {
    eventBus: runtime.eventBus,
    storage: runtime.storage,
  };

  partyService.setup(container, { cooldownMs: 1000 });
  partyModule.attach(runtime);

  return Promise.resolve();
}

module.exports = { main };
