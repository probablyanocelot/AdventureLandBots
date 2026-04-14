// Bank data helpers for the enhanced bank overview UI.
// This module is intentionally imported by the legacy bundle via Node-style require.

const getBankSource = (context) => {
  if (character.bank) {
    return { bank: character.bank, usingCachedBank: false };
  }
  if (context && context.cachedBankData) {
    return { bank: context.cachedBankData, usingCachedBank: true };
  }
  return { bank: {}, usingCachedBank: false };
};

const captureBankSnapshot = (context) => {
  if (!character.bank) {
    return;
  }
  try {
    context.cachedBankData = JSON.parse(JSON.stringify(character.bank));
  } catch (_err) {
    const fallback = {};
    for (const packName in character.bank) {
      const packItems = character.bank[packName];
      fallback[packName] = Array.isArray(packItems)
        ? packItems.map((item) => (item ? Object.assign({}, item) : null))
        : packItems;
    }
    context.cachedBankData = fallback;
  }
};

const getFirstEmptyInventorySlot = () => {
  if (!Array.isArray(character.items)) {
    return null;
  }
  for (let i = 0; i < character.items.length; i++) {
    if (!character.items[i]) {
      return i;
    }
  }
  return null;
};

const retrieveFromBank = (packName, index, inventoryIndex = -1) => {
  if (typeof bank_retrieve === "function") {
    return bank_retrieve(packName, index, inventoryIndex);
  }
  parent.socket.emit("bank", {
    operation: "swap",
    pack: packName,
    str: index,
    inv: inventoryIndex,
  });
};

const getRetrieveInventorySlot = (itemInfo) => {
  if (!itemInfo || !itemInfo.name || !Array.isArray(character.items)) {
    return null;
  }
  const candidateItem = {
    name: itemInfo.name,
    q: itemInfo.q || 1,
  };
  if (itemInfo.level !== undefined) {
    candidateItem.level = itemInfo.level;
  }
  if (
    typeof can_add_item === "function" &&
    !can_add_item(character, candidateItem)
  ) {
    return null;
  }
  const gItem = G.items[itemInfo.name] || {};
  if (gItem.s && typeof can_stack === "function") {
    for (let i = 0; i < character.items.length; i++) {
      if (
        can_stack(character.items[i], candidateItem, null, {
          ignore_pvp: true,
        })
      ) {
        return i;
      }
    }
  }
  if (character.esize > 0) {
    return -1;
  }
  for (let i = 0; i < character.items.length; i++) {
    if (!character.items[i]) {
      return i;
    }
  }
  return null;
};

const getPackMeta = (packName) => {
  if (typeof bank_packs === "undefined" || !bank_packs[packName]) {
    return null;
  }
  const info = bank_packs[packName];
  if (!Array.isArray(info) || info.length < 1) {
    return null;
  }
  return {
    map: info[0],
    goldCost: info[1] || 0,
    shellCost: info[2] || 0,
  };
};

const getSortedKnownPackNames = (bank) => {
  const knownPackNames = new Set();
  if (typeof bank_packs !== "undefined" && bank_packs) {
    for (const packName in bank_packs) {
      if (/^items\d+$/i.test(packName)) {
        knownPackNames.add(packName);
      }
    }
  }
  if (bank) {
    for (const packName in bank) {
      if (/^items\d+$/i.test(packName)) {
        knownPackNames.add(packName);
      }
    }
  }
  return Array.from(knownPackNames).sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
};

const isPackUnlocked = (packName, bank) => {
  return !!(bank && Array.isArray(bank[packName]));
};

module.exports = {
  getBankSource,
  captureBankSnapshot,
  getFirstEmptyInventorySlot,
  retrieveFromBank,
  getRetrieveInventorySlot,
  getPackMeta,
  getSortedKnownPackNames,
  isPackUnlocked,
};
