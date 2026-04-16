const { PartyCommand, PartyEvent } = require("../../contracts/party");

function attach(runtime) {
  runtime.on("ui:join-party", (payload) => {
    runtime.eventBus.emit(PartyCommand.name, payload);
  });

  runtime.eventBus.on(PartyEvent.name, (event) => {
    runtime.ui?.notify?.(`Joined party ${event.partyId}`);
  });
}

module.exports = { attach };
