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

const getPackLabel = (packName) => {
  const match = /^items(\d+)$/i.exec(packName);
  if (!match) {
    return packName;
  }
  const tellerNumber = Number(match[1]) + 1;
  return `Teller ${tellerNumber} (${packName})`;
};

const types = {
  helmet: "Helmets",
  chest: "Armors",
  pants: "Pants",
  gloves: "Gloves",
  shoes: "Shoes",
  cape: "Capes",
  ring: "Rings",
  earring: "Earrings",
  amulet: "Amulets",
  belt: "Belts",
  orb: "Orbs",
  weapon: "Weapons",
  shield: "Shields",
  source: "Offhands",
  quiver: "Offhands",
  misc_offhand: "Offhands",
  elixir: "Elixirs",
  pot: "Potions",
  cscroll: "Scrolls",
  uscroll: "Scrolls",
  pscroll: "Scrolls",
  offering: "Scrolls",
  material: "Crafting and Collecting",
  exchange: "Exchangeables",
  dungeon_key: "Keys",
  token: "Tokens",
  other: "Others",
};

const getSortedItemKeys = (context, itemsByType) => {
  const keys = Object.keys((itemsByType && itemsByType.items) || {});
  if (context.sortMode === "amount_desc") {
    return keys.sort((a, b) => {
      const aItem = itemsByType.items[a] || { levels: {} };
      const bItem = itemsByType.items[b] || { levels: {} };
      const sumLevels = (item) =>
        Object.values(item.levels || {}).reduce(
          (sum, levelData) => sum + (levelData.amount || 0),
          0,
        );
      const diff = sumLevels(bItem) - sumLevels(aItem);
      if (diff !== 0) return diff;
      return a.localeCompare(b);
    });
  }
  if (context.sortMode === "name_desc") {
    return keys.sort((a, b) => b.localeCompare(a));
  }
  return keys.sort((a, b) => a.localeCompare(b));
};

const getSortedGroupKeys = (context, groups) => {
  if (context.groupMode === "teller_pack") {
    return Object.keys(groups).sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }
  if (context.groupMode === "item_group") {
    return Object.keys(groups).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }
  const preferredKeys = [...new Set(Object.values(types))];
  const preferredExisting = preferredKeys.filter((key) => groups[key]);
  const extraKeys = Object.keys(groups)
    .filter((key) => !preferredKeys.includes(key))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return preferredExisting.concat(extraKeys);
};

const getDisplayGroupLabel = (context, groupKey) => {
  if (context.groupMode === "teller_pack" && /^items\d+$/i.test(groupKey)) {
    return getPackLabel(groupKey);
  }
  return groupKey;
};

const getGroupLabelForItem = (context, gItem, packName = "") => {
  if (context.groupMode === "teller_pack") {
    return packName || "unknown_pack";
  }
  if (context.groupMode === "item_group") {
    const rawGroup =
      (gItem && (gItem.group || gItem.set || gItem.category)) ||
      (gItem && gItem.type) ||
      "misc";
    return `Group: ${rawGroup}`;
  }
  let type = types[(gItem && gItem.type) || "other"] || "Others";
  if (gItem && gItem.e) {
    type = types.exchange || "Others";
  }
  return type;
};

const abbreviateNumber = (number) => {
  const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
  if (!number) {
    return number;
  }
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;
  if (tier === 0) return number;
  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = number / scale;
  return (
    scaled.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + suffix
  );
};

const getPackStatusLabel = (
  context,
  packName,
  bank,
  usingCachedBank = false,
) => {
  if (isPackUnlocked(packName, bank)) {
    return "Unlocked";
  }
  const meta = getPackMeta(packName);
  if (!meta) {
    return "Unknown";
  }
  if (meta.goldCost <= 0 && meta.shellCost <= 0) {
    return "Base";
  }
  if (usingCachedBank) {
    return "Unknown (cached)";
  }
  return `Locked · ${abbreviateNumber(meta.goldCost) || 0}g / ${
    meta.shellCost || 0
  } shell`;
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

const parseSearchQuery = (search) => {
  const normalized = (search || "").toLowerCase().trim();
  if (!normalized) {
    return { text: "", property: "" };
  }
  const match = normalized.match(
    /(?:^|\s)(?:prop|property|p)\s*:\s*([a-z0-9_.-]+)/,
  );
  if (!match) {
    return { text: normalized, property: "" };
  }
  const property = (match[1] || "").trim();
  const text = normalized.replace(match[0], " ").replace(/\s+/g, " ").trim();
  return { text, property };
};

const itemMatchesPropertyFilter = (itemInfo, propertyFilter) => {
  if (!propertyFilter) {
    return true;
  }
  if (!itemInfo || typeof itemInfo !== "object") {
    return false;
  }
  if (propertyFilter === "any") {
    for (const key in itemInfo) {
      if (
        key !== "name" &&
        key !== "q" &&
        key !== "level" &&
        key !== "p" &&
        itemInfo[key] !== undefined &&
        itemInfo[key] !== null
      ) {
        return true;
      }
    }
    if (typeof itemInfo.p === "string") {
      return itemInfo.p !== "shiny" && itemInfo.p !== "glitched";
    }
    if (itemInfo.p && typeof itemInfo.p === "object") {
      return Object.keys(itemInfo.p).length > 0;
    }
    return false;
  }
  if (propertyFilter === "p") {
    if (typeof itemInfo.p === "string") {
      return itemInfo.p !== "shiny" && itemInfo.p !== "glitched";
    }
    return !!(itemInfo.p && typeof itemInfo.p === "object");
  }
  if (propertyFilter.startsWith("p.")) {
    const pKey = propertyFilter.slice(2);
    return !!(
      itemInfo.p &&
      typeof itemInfo.p === "object" &&
      pKey &&
      itemInfo.p[pKey] !== undefined &&
      itemInfo.p[pKey] !== null
    );
  }
  return (
    itemInfo[propertyFilter] !== undefined && itemInfo[propertyFilter] !== null
  );
};

const groupedItemMatchesPropertyFilter = (
  context,
  groupedItem,
  propertyFilter,
) => {
  if (!propertyFilter) {
    return true;
  }
  if (!groupedItem || !groupedItem.levels) {
    return false;
  }
  for (const levelKey in groupedItem.levels) {
    const levelData = groupedItem.levels[levelKey];
    if (!levelData || !Array.isArray(levelData.indexes)) {
      continue;
    }
    for (const [packName, index] of levelData.indexes) {
      const itemInfo = context.getBankItem(packName, index);
      if (itemMatchesPropertyFilter(itemInfo, propertyFilter)) {
        return true;
      }
    }
  }
  return false;
};

const doesItemMatchSearch = (context, itemInfo, searchQuery) => {
  const query =
    typeof searchQuery === "string"
      ? parseSearchQuery(searchQuery)
      : searchQuery || { text: "", property: "" };
  const normalizedSearch = query.text || "";
  if (!itemInfo || !itemInfo.name) {
    return false;
  }
  if (!itemMatchesPropertyFilter(itemInfo, query.property || "")) {
    return false;
  }
  if (!normalizedSearch) {
    return true;
  }
  if (!itemInfo || !itemInfo.name) {
    return false;
  }
  const itemName = (itemInfo.name || "").toLowerCase();
  const itemDef = G.items[itemInfo.name] || {};
  const itemDisplayName = (itemDef.name || "").toLowerCase();
  return (
    itemName.indexOf(normalizedSearch) !== -1 ||
    itemDisplayName.indexOf(normalizedSearch) !== -1
  );
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

const filter = (context, search) => {
  const result = {};
  const searchQuery = context.parseSearchQuery(search);
  for (const groupName in context.groups) {
    const group = context.groups[groupName];
    let itemKey;
    for (itemKey in group.items) {
      const gItem = G.items[itemKey];
      const item = group.items[itemKey];
      let shouldAdd = false;
      const propertyMatches = context.groupedItemMatchesPropertyFilter(
        item,
        searchQuery.property,
      );
      if (searchQuery.text) {
        const normalizedItemKey = (itemKey || "").toLowerCase();
        const normalizedName = (
          gItem && gItem.name ? gItem.name : ""
        ).toLowerCase();
        const itemKeyMatches = normalizedItemKey.indexOf(searchQuery.text) > -1;
        const itemNameMatches = normalizedName.indexOf(searchQuery.text) > -1;
        if ((itemKeyMatches || itemNameMatches) && propertyMatches) {
          shouldAdd = true;
        }
      } else if (propertyMatches) {
        shouldAdd = true;
      }
      if (shouldAdd) {
        if (!result[groupName]) {
          result[groupName] = { amount: 0, items: {} };
        }
        result[groupName].items[itemKey] = item;
      }
    }
  }
  return result;
};

const groupBankByItem = (context) => {
  let totalBankSlots = 0;
  let totalUsedBankSlots = 0;
  let totalUnusedBankSlots = 0;
  const groups = {};
  const { bank, usingCachedBank } = context.getBankSource();
  for (const packName in bank) {
    const packItems = bank[packName];
    if (!/^items\d+$/i.test(packName) || !Array.isArray(packItems)) {
      continue;
    }
    totalBankSlots += packItems.length || 0;
    for (let index = 0; index < packItems.length; index++) {
      const itemInfo = packItems[index];
      if (!itemInfo) {
        totalUnusedBankSlots++;
        continue;
      }
      const gItem = G.items[itemInfo.name] || {};
      const level = itemInfo.level || 0;
      const groupLabel = context.getGroupLabelForItem(gItem, packName);
      let itemByType = groups[groupLabel];
      if (!itemByType) {
        itemByType = { amount: 0, items: {} };
        groups[groupLabel] = itemByType;
      }
      let itemData = itemByType.items[itemInfo.name];
      if (!itemData) {
        itemData = { amount: 0, levels: {} };
        itemByType.items[itemInfo.name] = itemData;
      }
      let levels = itemData.levels[level];
      if (!levels) {
        levels = {
          amount: itemInfo.q || 1,
          indexes: [[packName, index]],
          shinyCount: itemInfo.p === "shiny" ? 1 : 0,
          glitchedCount: itemInfo.p === "glitched" ? 1 : 0,
        };
        itemData.levels[level] = levels;
      } else {
        itemData.amount += itemInfo.q || 1;
        levels.amount += itemInfo.q || 1;
        levels.indexes.push([packName, index]);
        if (itemInfo.p === "shiny") {
          levels.shinyCount = (levels.shinyCount || 0) + 1;
        }
        if (itemInfo.p === "glitched") {
          levels.glitchedCount = (levels.glitchedCount || 0) + 1;
        }
      }
      totalUsedBankSlots++;
    }
  }
  return {
    totalBankSlots,
    totalUsedBankSlots,
    totalUnusedBankSlots,
    groups,
    usingCachedBank,
  };
};

module.exports = {
  getBankSource,
  captureBankSnapshot,
  getFirstEmptyInventorySlot,
  retrieveFromBank,
  getRetrieveInventorySlot,
  getPackLabel,
  getSortedItemKeys,
  getSortedGroupKeys,
  getDisplayGroupLabel,
  getGroupLabelForItem,
  getPackStatusLabel,
  parseSearchQuery,
  itemMatchesPropertyFilter,
  groupedItemMatchesPropertyFilter,
  doesItemMatchSearch,
  getPackMeta,
  getSortedKnownPackNames,
  isPackUnlocked,
  filter,
  groupBankByItem,
};
