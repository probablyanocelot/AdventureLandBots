// Party service wrapper.
// Purpose: expose a stable service API while legacy party domain remains in place.

const { installAutoParty, installPriestSwap } =
  await require("../../domains/party/index.js");
const { validatePartyService, validatePriestSwapService } =
  await require("../../contracts/party_api.js");

const createPartyService = ({ cfg } = {}) => {
  const inner = installAutoParty({ cfg });
  return validatePartyService(inner);
};

const createPriestSwapService = ({ cfg } = {}) => {
  const inner = installPriestSwap({ cfg });
  return validatePriestSwapService(inner);
};

module.exports = {
  createPartyService,
  createPriestSwapService,
};
