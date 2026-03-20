const TOOL_NAMES = Object.freeze({
  fishing: "rod",
  mining: "pickaxe",
});

const hasItemInInventory = (itemName) => {
  try {
    for (const item of character?.items || []) {
      if (item?.name === itemName) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const hasItemEquipped = (itemName) => {
  try {
    for (const slot of Object.keys(character?.slots || {})) {
      if (character?.slots?.[slot]?.name === itemName) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const ensureToolPresent = (itemName) => {
  if (!itemName) return false;
  const hasTool = hasItemInInventory(itemName) || hasItemEquipped(itemName);
  if (hasTool) return false;

  try {
    buy_tool(itemName);
    return true;
  } catch {
    // ignore
  }

  return false;
};

const createToolProvisioning = () => {
  const checkForTools = () => {
    const boughtRod = ensureToolPresent(TOOL_NAMES.fishing);
    const boughtPickaxe = ensureToolPresent(TOOL_NAMES.mining);
    return {
      boughtRod,
      boughtPickaxe,
    };
  };

  const stopRoutine = () => {
    // No background timers yet. Keep lifecycle shape for boundary stability.
  };

  return {
    checkForTools,
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  TOOL_NAMES,
  createToolProvisioning,
};
