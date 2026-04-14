// Item Upgrade Service (repo-architecture compliant)
const {
  shinyBuyBlackList,
  sellList,
  noUpgradeList,
} = require("../data/index.js");

function createItemUpgradeService({ cfg: _cfg } = {}) {
  let stopped = false;
  const TIMEOUT = 1000;
  const maxLevel = 8;
  let timer = null;

  // Main upgrade logic, called by upkeep loop
  function tryAutoUpgrade() {
    if (stopped) return;
    for (let level = 0; level <= maxLevel; level++) {
      for (let itemIndex in character?.items || []) {
        const item = character.items[itemIndex];
        if (!item || item.level !== level) continue;

        const itemName = item.name;
        if (noUpgradeList.includes(itemName)) continue;
        if (sellList.has ? sellList.has(itemName) : sellList.includes(itemName))
          continue;
        if (itemName === "rod" || itemName === "pickaxe") continue;

        if (typeof isUpgradable === "function" && !isUpgradable(itemName))
          continue;

        const grade = typeof item_grade === "function" ? item_grade(item) : 0;
        if (item.p && item.p !== "shiny") continue;
        if (item.ps || item.acc || item.ach) continue;
        if (item.p && grade >= 1) continue;

        if (grade === 0) {
          if (
            !item.p &&
            !item.ps &&
            shinyBuyBlackList.includes &&
            shinyBuyBlackList.includes(itemName)
          ) {
            if (typeof sell === "function") sell(itemIndex);
            continue;
          }
          if (typeof doUpgrade === "function") doUpgrade("scroll0", itemIndex);
        }

        // Special handling for wingedboots/pinkie
        if (
          (itemName === "wingedboots" || itemName === "pinkie") &&
          [6, 7].includes(item.level)
        ) {
          if (typeof doUpgrade === "function") doUpgrade("scroll2", itemIndex);
          continue;
        }
        if (
          (itemName === "wingedboots" || itemName === "pinkie") &&
          [4, 5].includes(item.level)
        ) {
          if (typeof doUpgrade === "function") doUpgrade("scroll1", itemIndex);
          continue;
        }

        if (grade === 1 && item.level < 7) {
          if (typeof doUpgrade === "function") doUpgrade("scroll1", itemIndex);
          continue;
        }
        if (grade === 1 && item.level < 8) {
          if (typeof doUpgrade === "function") doUpgrade("scroll2", itemIndex);
          continue;
        }
        if (grade === 2 && item.level < 3) {
          if (typeof doUpgrade === "function") doUpgrade("scroll2", itemIndex);
          continue;
        }
        if (grade === 2 && item.level >= 8) continue;
      }
    }
  }

  // Optional: auto-looping routine (if needed)
  function startRoutine() {
    if (stopped) return;
    tryAutoUpgrade();
    timer = setTimeout(startRoutine, TIMEOUT);
  }

  function stopRoutine() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  return {
    tryAutoUpgrade,
    startRoutine,
    stopRoutine,
    dispose: stopRoutine,
    [Symbol.dispose]: stopRoutine,
    [Symbol.asyncDispose]: async () => stopRoutine(),
  };
}

module.exports = {
  createItemUpgradeService,
};
