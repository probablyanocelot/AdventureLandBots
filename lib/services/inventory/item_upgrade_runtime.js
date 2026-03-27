const { warn } = await require("../../al_debug_log.js");

const DEFAULT_EXCLUDED_ITEM_NAMES = Object.freeze(["rod", "pickaxe"]);

const hasComputer = () => {
  try {
    return locate_item("computer") >= 0 || locate_item("supercomputer") >= 0;
  } catch {
    return false;
  }
};

const isUpgradeableItemName = (itemName) => {
  if (!itemName) return false;
  try {
    return Boolean(G?.items?.[itemName]?.upgrade);
  } catch {
    return false;
  }
};

const isCompoundableItemName = (itemName) => {
  if (!itemName) return false;
  try {
    return Boolean(G?.items?.[itemName]?.compound);
  } catch {
    return false;
  }
};

const getItemGradeSafe = (item) => {
  try {
    if (typeof item_grade === "function") return Number(item_grade(item) || 0);
  } catch {
    // ignore
  }
  return 0;
};

const isProtectedFromUpgrade = (item) => {
  if (!item) return true;
  const grade = getItemGradeSafe(item);
  if (item.p && item.p !== "shiny") return true;
  if (item.ps || item.acc || item.ach) return true;
  if (item.p && grade >= 1) return true;
  return false;
};

const chooseScrollName = ({ item, maxLevel }) => {
  if (!item?.name) return null;
  const itemLevel = Number(item.level || 0);
  const grade = getItemGradeSafe(item);

  if (item.name === "wingedboots" && [6, 7].includes(itemLevel)) {
    return itemLevel < maxLevel ? "scroll2" : null;
  }
  if (item.name === "wingedboots" && [4, 5].includes(itemLevel)) {
    return itemLevel < maxLevel ? "scroll1" : null;
  }

  if (grade === 0) return itemLevel < maxLevel ? "scroll0" : null;
  if (grade === 1 && itemLevel < Math.min(7, maxLevel)) return "scroll1";
  if (grade === 1 && itemLevel < maxLevel) return "scroll2";
  if (grade === 2 && itemLevel < Math.min(3, maxLevel)) return "scroll2";
  return null;
};

const createItemUpgradeService = ({ cfg } = {}) => {
  const upgradeCfg =
    cfg?.upkeep?.upgrade && typeof cfg.upkeep.upgrade === "object"
      ? cfg.upkeep.upgrade
      : {};

  const st = {
    stopped: false,
    lastAttemptAt: 0,
  };

  const enabled = upgradeCfg.enabled !== false;
  const requireComputer = upgradeCfg.requireComputer !== false;
  const maxLevelAnyClass = Math.max(
    0,
    Number(upgradeCfg.maxLevelAnyClass || 2),
  );
  const maxLevelMerchant = Math.max(
    maxLevelAnyClass,
    Number(upgradeCfg.maxLevelMerchant || 8),
  );
  const attemptCooldownMs = Math.max(
    200,
    Number(upgradeCfg.attemptCooldownMs || 1000),
  );
  const excludedItemNames = new Set(
    (Array.isArray(upgradeCfg.excludeItemNames)
      ? upgradeCfg.excludeItemNames
      : DEFAULT_EXCLUDED_ITEM_NAMES
    )
      .map((name) => (typeof name === "string" ? name.trim() : ""))
      .filter(Boolean),
  );

  const ensureScrollSlot = (scrollName) => {
    if (!scrollName) return -1;
    let slot = -1;
    try {
      slot = locate_item(scrollName);
    } catch {
      slot = -1;
    }
    if (slot >= 0) return slot;

    try {
      buy(scrollName, 1);
    } catch (e) {
      warn("Failed to buy upgrade scroll", scrollName, e);
      return -1;
    }

    try {
      return locate_item(scrollName);
    } catch {
      return -1;
    }
  };

  const canUpgradeNow = () => {
    if (!enabled || st.stopped) return false;
    if (character?.rip) return false;
    if (requireComputer && !hasComputer()) return false;
    if (typeof upgrade !== "function") return false;

    const nowMs = Date.now();
    if (nowMs - st.lastAttemptAt < attemptCooldownMs) return false;

    try {
      if (is_on_cooldown("upgrade")) return false;
    } catch {
      // ignore
    }

    if (character?.q?.upgrade || parent?.character?.q?.upgrade) return false;
    return true;
  };

  const tryAutoUpgrade = () => {
    if (!canUpgradeNow()) return false;

    const isMerchant = String(character?.ctype || "") === "merchant";
    const maxLevel = isMerchant ? maxLevelMerchant : maxLevelAnyClass;
    if (maxLevel <= 0) return false;

    const items = character?.items;
    if (!Array.isArray(items)) return false;

    for (let level = 0; level < maxLevel; level++) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.l || item.locked) continue;
        if (Number(item.level || 0) !== level) continue;
        if (!item.name) continue;
        if (excludedItemNames.has(item.name)) continue;
        if (!isUpgradeableItemName(item.name)) continue;
        if (isCompoundableItemName(item.name)) continue;
        if (isProtectedFromUpgrade(item)) continue;

        const scrollName = chooseScrollName({ item, maxLevel });
        if (!scrollName) continue;

        const scrollSlot = ensureScrollSlot(scrollName);
        if (scrollSlot < 0) return false;

        try {
          upgrade(i, scrollSlot);
          st.lastAttemptAt = Date.now();
          return true;
        } catch (e) {
          warn("Failed to upgrade item", item?.name, e);
          st.lastAttemptAt = Date.now();
          return false;
        }
      }
    }

    return false;
  };

  const stopRoutine = () => {
    st.stopped = true;
  };

  return {
    tryAutoUpgrade,
    stopRoutine,
    dispose: () => stopRoutine(),
    [Symbol.dispose]: () => stopRoutine(),
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
};

module.exports = {
  createItemUpgradeService,
};
