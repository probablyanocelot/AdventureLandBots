module.exports = {
  PartyCommand: {
    name: "party.join",
    schema: {
      characterId: "string",
      partyId: "string",
    },
  },
  PartyEvent: {
    name: "party.joined",
    schema: {
      partyId: "string",
      memberIds: "string[]",
    },
  },
};
