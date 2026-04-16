const { PartyCommand, PartyEvent } = require("../../contracts/party");

function setup({ eventBus }, config = {}) {
  const cooldownMs = config.cooldownMs || 1000;
  let lastJoin = 0;

  eventBus.on(PartyCommand.name, (payload) => {
    const now = Date.now();
    if (now - lastJoin < cooldownMs) return;
    lastJoin = now;

    const memberIds = [payload.characterId];
    eventBus.emit(PartyEvent.name, {
      partyId: payload.partyId,
      memberIds,
    });
  });
}

function teardown() {
  // If listeners were attached with a named reference, remove them here.
}

module.exports = { setup, teardown };
