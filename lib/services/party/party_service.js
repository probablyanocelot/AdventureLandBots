// Party service wrapper.
// Purpose: expose a stable service API while legacy party domain remains in place.

const { installAutoParty } = await require("./auto_party_runtime.js");
const { installPriestSwap } = await require("../../domains/party/swap.js");
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
