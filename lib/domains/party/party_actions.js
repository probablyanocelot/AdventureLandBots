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

module.exports = {
  setCharacterAction,
  clearCharacterAction,
  partyInvite,
  partyAccept,
  partyLeave,
};
