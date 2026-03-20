const DEFAULT_TOOL_NAMES = Object.freeze(["rod", "pickaxe"]);

const hasItemInInventory = (itemName, qty = 1) => {
  if (!itemName) return false;
  try {
    let count = 0;
    for (const item of character?.items || []) {
      if (item?.name !== itemName) continue;
      count += item.q ? Number(item.q) : 1;
      if (count >= qty) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const getInventoryItemQty = (itemName) => {
  if (!itemName) return 0;
  let count = 0;
  try {
    for (const item of character?.items || []) {
      if (item?.name !== itemName) continue;
      count += item.q ? Number(item.q) : 1;
    }
  } catch {
    // ignore
  }
  return Math.max(0, Number(count || 0));
};

const hasItemEquipped = (itemName) => {
  if (!itemName) return false;
  try {
    for (const slot of Object.keys(character?.slots || {})) {
      if (character?.slots?.[slot]?.name === itemName) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const getEquippedItemQty = (itemName) => {
  if (!itemName) return 0;
  let count = 0;
  try {
    for (const slot of Object.keys(character?.slots || {})) {
      if (character?.slots?.[slot]?.name === itemName) count += 1;
    }
  } catch {
    // ignore
  }
  return count;
};

const getBankItemSlots = () => {
  const out = [];
  try {
    const bank = character?.bank;
    if (!bank || typeof bank !== "object") return out;
    for (const [pack, items] of Object.entries(bank)) {
      if (!Array.isArray(items)) continue;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        out.push({ pack, index: i, item });
      }
    }
  } catch {
    // ignore
  }
  return out;
};

const findBankItemByName = (itemName) => {
  if (!itemName) return null;
  const slots = getBankItemSlots();
  for (const slot of slots) {
    if (slot?.item?.name === itemName) return slot;
  }
  return null;
};

const getBankItemQty = (itemName) => {
  if (!itemName) return 0;
  let count = 0;
  for (const slot of getBankItemSlots()) {
    if (slot?.item?.name !== itemName) continue;
    count += slot?.item?.q ? Number(slot.item.q) : 1;
  }
  return Math.max(0, Number(count || 0));
};

const getOwnedItemQty = (itemName, { includeBank = true } = {}) => {
  const inInventory = getInventoryItemQty(itemName);
  const equipped = getEquippedItemQty(itemName);
  const inBank = includeBank ? getBankItemQty(itemName) : 0;
  return inInventory + equipped + inBank;
};

const retrieveBankItem = ({ itemName, pack, index }) => {
  if (!itemName) return false;
  try {
    if (typeof bank_retrieve === "function" && pack && index !== undefined) {
      bank_retrieve(pack, index);
      return true;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof bank_withdraw === "function") {
      bank_withdraw(itemName, 1);
      return true;
    }
  } catch {
    // ignore
  }

  try {
    if (typeof bankWithdraw === "function") {
      bankWithdraw(itemName, 1);
      return true;
    }
  } catch {
    // ignore
  }

  return false;
};

const toRecipeName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const getCraftRecipe = (itemName) => {
  try {
    return G?.craft?.[itemName] || null;
  } catch {
    return null;
  }
};

const hasCraftInputs = (recipe) => {
  if (!recipe?.items) return false;
  return recipe.items.every(([qty, name]) => hasItemInInventory(name, qty));
};

const getCraftability = (
  recipe,
  { includeBank = true, includeEquipped = true } = {},
) => {
  if (!recipe?.items || !Array.isArray(recipe.items)) {
    return {
      canCraft: false,
      craftableTimes: 0,
      inputs: [],
    };
  }

  const inputs = [];
  let craftableTimes = Infinity;

  for (const input of recipe.items) {
    if (!Array.isArray(input) || input.length < 2) continue;
    const needed = Math.max(1, Number(input[0] || 1));
    const name = toRecipeName(input[1]);
    if (!name) continue;

    const inInventory = getInventoryItemQty(name);
    const equipped = includeEquipped ? getEquippedItemQty(name) : 0;
    const inBank = includeBank ? getBankItemQty(name) : 0;
    const available = inInventory + equipped + inBank;
    const missing = Math.max(0, needed - available);
    const timesFromInput = Math.floor(available / needed);
    craftableTimes = Math.min(craftableTimes, timesFromInput);

    inputs.push({
      name,
      needed,
      available,
      missing,
      inInventory,
      equipped,
      inBank,
    });
  }

  if (!inputs.length) {
    return {
      canCraft: false,
      craftableTimes: 0,
      inputs,
    };
  }

  const cappedCraftableTimes = Number.isFinite(craftableTimes)
    ? Math.max(0, craftableTimes)
    : 0;
  return {
    canCraft: cappedCraftableTimes > 0,
    craftableTimes: cappedCraftableTimes,
    inputs,
  };
};

const tryWithdrawCraftInputs = (recipe) => {
  if (!recipe?.items) return false;
  let withdrew = false;
  for (const [qty, name] of recipe.items) {
    if (hasItemInInventory(name, qty)) continue;
    const needed = Math.max(1, Number(qty || 1));
    let missing = Math.max(0, needed - getInventoryItemQty(name));
    if (!missing) continue;

    const matchingSlots = getBankItemSlots().filter(
      (s) => s?.item?.name === name,
    );
    for (const slot of matchingSlots) {
      if (missing <= 0) break;
      const ok = retrieveBankItem({
        itemName: name,
        pack: slot.pack,
        index: slot.index,
      });
      if (!ok) continue;
      withdrew = true;
      missing -= slot?.item?.q ? Number(slot.item.q) : 1;
    }
  }
  return withdrew;
};

const createBankCrafting = ({
  cfg,
  toolNames = DEFAULT_TOOL_NAMES,
  intervalMs = 5000,
} = {}) => {
  const st = {
    stopped: false,
    timer: null,
    lastAttemptAt: 0,
  };

  const enabled = cfg?.merchantRole?.bankCraftingEnabled !== false;
  const craftingCfg = cfg?.merchantRole?.crafting || {};
  const craftingEnabled = craftingCfg.enabled !== false;
  const includeAllGameRecipes = Boolean(craftingCfg.includeAllGameRecipes);
  const includeBankInCraftability =
    craftingCfg.includeBankInCraftability !== false;
  const configuredRecipeNames = Array.from(
    new Set(
      (Array.isArray(craftingCfg.recipeNames) ? craftingCfg.recipeNames : [])
        .map(toRecipeName)
        .filter(Boolean),
    ),
  );
  const configuredRecipeTargets = (
    Array.isArray(craftingCfg.recipeTargets) ? craftingCfg.recipeTargets : []
  )
    .map((target) => {
      if (typeof target === "string") {
        const name = toRecipeName(target);
        return name ? { name, minHave: 1 } : null;
      }
      if (!target || typeof target !== "object") return null;
      const name = toRecipeName(target.name);
      if (!name) return null;
      return {
        name,
        minHave: Math.max(1, Number(target.minHave || 1)),
      };
    })
    .filter(Boolean);

  const getKnownRecipeNames = ({ includeConfiguredOnly = false } = {}) => {
    const names = new Set();

    for (const toolName of toolNames) {
      if (!toolName) continue;
      if (getCraftRecipe(toolName)) names.add(toolName);
    }

    for (const name of configuredRecipeNames) {
      if (getCraftRecipe(name)) names.add(name);
    }

    for (const target of configuredRecipeTargets) {
      if (getCraftRecipe(target.name)) names.add(target.name);
    }

    if (includeAllGameRecipes && !includeConfiguredOnly) {
      for (const name of Object.keys(G?.craft || {})) {
        if (getCraftRecipe(name)) names.add(name);
      }
    }

    if (includeConfiguredOnly) {
      return Array.from(
        new Set([
          ...configuredRecipeNames,
          ...configuredRecipeTargets.map((t) => t.name),
        ]),
      ).filter((name) => getCraftRecipe(name));
    }

    return Array.from(names);
  };

  const getKnownRecipes = ({ includeConfiguredOnly = false } = {}) =>
    getKnownRecipeNames({ includeConfiguredOnly }).map((name) => ({
      name,
      recipe: getCraftRecipe(name),
      isConfigured:
        configuredRecipeNames.includes(name) ||
        configuredRecipeTargets.some((t) => t.name === name),
      isToolRecipe: toolNames.includes(name),
    }));

  const getCraftableRecipes = ({
    includeConfiguredOnly = false,
    includeBank = includeBankInCraftability,
  } = {}) => {
    const out = [];
    for (const name of getKnownRecipeNames({ includeConfiguredOnly })) {
      const recipe = getCraftRecipe(name);
      if (!recipe) continue;
      const craftability = getCraftability(recipe, {
        includeBank,
        includeEquipped: true,
      });
      out.push({
        name,
        recipe,
        ...craftability,
      });
    }
    return out;
  };

  const getConfiguredRecipeTargets = () =>
    configuredRecipeTargets.map((target) => ({ ...target }));

  const ensureToolFromBank = (itemName) => {
    if (!itemName) return false;
    if (hasItemEquipped(itemName) || hasItemInInventory(itemName)) return false;
    const slot = findBankItemByName(itemName);
    if (!slot) return false;
    return retrieveBankItem({
      itemName,
      pack: slot.pack,
      index: slot.index,
    });
  };

  const tryCraftTool = (itemName) => {
    if (!itemName) return false;
    const recipe = getCraftRecipe(itemName);
    if (!recipe) return false;

    if (character?.bank) {
      tryWithdrawCraftInputs(recipe);
    }

    if (!hasCraftInputs(recipe)) return false;
    if (typeof auto_craft !== "function") return false;

    try {
      auto_craft(itemName);
      return true;
    } catch {
      return false;
    }
  };

  const tryCraftConfiguredTargets = () => {
    if (!craftingEnabled) return false;
    for (const target of configuredRecipeTargets) {
      if (!target?.name) continue;
      const owned = getOwnedItemQty(target.name, { includeBank: true });
      if (owned >= target.minHave) continue;
      const crafted = tryCraftTool(target.name);
      if (crafted) return true;
    }
    return false;
  };

  const runOnce = () => {
    if (st.stopped || !enabled) return;
    const now = Date.now();
    if (now - st.lastAttemptAt < Math.max(1000, Number(intervalMs || 5000))) {
      return;
    }
    st.lastAttemptAt = now;

    for (const toolName of toolNames) {
      if (!toolName) continue;
      if (hasItemEquipped(toolName) || hasItemInInventory(toolName)) continue;
      const withdrew = ensureToolFromBank(toolName);
      if (withdrew) return;
      const crafted = tryCraftTool(toolName);
      if (crafted) return;
    }

    tryCraftConfiguredTargets();
  };

  const loop = () => {
    if (st.stopped) return;
    runOnce();
    st.timer = setTimeout(loop, Math.max(1000, Number(intervalMs || 5000)));
  };

  const start = () => {
    if (st.stopped || st.timer || !enabled) return;
    loop();
  };

  const stopRoutine = () => {
    st.stopped = true;
    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  start();

  return {
    start,
    runOnce,
    getKnownRecipes,
    getCraftableRecipes,
    getConfiguredRecipeTargets,
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  createBankCrafting,
};
