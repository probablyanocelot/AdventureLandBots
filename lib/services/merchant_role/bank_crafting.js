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

const tryWithdrawCraftInputs = (recipe) => {
  if (!recipe?.items) return false;
  let withdrew = false;
  for (const [qty, name] of recipe.items) {
    if (hasItemInInventory(name, qty)) continue;
    const slot = findBankItemByName(name);
    if (!slot) continue;
    const ok = retrieveBankItem({
      itemName: name,
      pack: slot.pack,
      index: slot.index,
    });
    withdrew = withdrew || ok;
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
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  createBankCrafting,
};
