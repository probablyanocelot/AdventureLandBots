// Party service wrapper.
// Purpose: expose stable party APIs via service-owned implementation.

const { installAutoParty } = await require("./auto_party_runtime.js");
const { installPriestSwap } = await require("./priest_swap_runtime.js");
const { is_friendly, getActiveNames } =
  await require("./auto_party_runtime.js");
const { ensureCharacterRunningBySwap } =
  await require("./priest_swap_runtime.js");
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
  is_friendly,
  getActiveNames,
  ensureCharacterRunningBySwap,
};
