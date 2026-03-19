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

const emitActionLog = (message) => {
  if (!message) return;
  try {
    if (typeof globalThis.log === "function") {
      globalThis.log(message);
      return;
    }
  } catch {
    // ignore
  }

  try {
    console.log(message);
  } catch {
    // ignore
  }
};

const setCharacterAction = ({ owner, action } = {}) => {
  if (!owner || typeof owner !== "object") return null;
  owner.action = action;
  emitActionLog(`Action set to: ${action}`);
  return owner.action;
};

const clearCharacterAction = ({ owner } = {}) => {
  if (!owner || typeof owner !== "object") return null;
  owner.action = null;
  emitActionLog("Action cleared");
  return null;
};

const partyInvite = (playerName) => {
  try {
    parent.party_invite(playerName);
  } catch {
    // ignore
  }
};

const partyAccept = () => {
  try {
    parent.party_accept();
  } catch {
    // ignore
  }
};

const partyLeave = () => {
  try {
    parent.party_leave();
  } catch {
    // ignore
  }
};

const createPartyService = ({ cfg } = {}) => {
  const inner = installAutoParty({ cfg });
  return validatePartyService(inner);
};

const createPriestSwapService = ({ cfg } = {}) => {
  const inner = installPriestSwap({ cfg });
  return validatePriestSwapService(inner);
};

const createPartyModuleService = ({ cfg } = {}) => {
  return createPartyService({ cfg });
};

const createPriestSwapModuleService = ({ cfg } = {}) => {
  return createPriestSwapService({ cfg });
};

module.exports = {
  createPartyService,
  createPriestSwapService,
  createPartyModuleService,
  createPriestSwapModuleService,
  setCharacterAction,
  clearCharacterAction,
  partyInvite,
  partyAccept,
  partyLeave,
  is_friendly,
  getActiveNames,
  ensureCharacterRunningBySwap,
};
