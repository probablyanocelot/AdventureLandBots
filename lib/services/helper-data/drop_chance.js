const DEFAULT_ITEM = "goldenegg";

function isDropArray(drop) {
  return Array.isArray(drop) && drop.length >= 2;
}

function getDropWeight(drop) {
  return isDropArray(drop) ? Number(drop[0]) || 0 : 0;
}

function getDropType(drop) {
  return isDropArray(drop) ? drop[1] : undefined;
}

function isItemDrop(drop, item) {
  return getDropType(drop) === item;
}

function isOpenDrop(drop) {
  return getDropType(drop) === "open" && typeof drop[2] === "string";
}

function getDropTableWeight(dropTable) {
  if (!Array.isArray(dropTable)) return 0;
  return dropTable.reduce((sum, drop) => sum + getDropWeight(drop), 0);
}

function getNestedDropName(drop) {
  return isOpenDrop(drop) ? drop[2] : undefined;
}

function getNestedDropTable(dropName) {
  return (G.drops || {})[dropName] || [];
}

function getItemDropChance(
  dropTable,
  item = DEFAULT_ITEM,
  { includeOpen = false, visited = new Set() } = {},
) {
  if (!Array.isArray(dropTable)) return 0;

  const totalWeight = getDropTableWeight(dropTable);
  if (totalWeight <= 0) return 0;

  return dropTable.reduce((chance, drop) => {
    if (!isDropArray(drop)) return chance;

    const weight = getDropWeight(drop);
    const probability = Math.min(1, weight / totalWeight);

    if (isItemDrop(drop, item)) {
      return chance + probability;
    }

    if (includeOpen && isOpenDrop(drop)) {
      const nestedName = getNestedDropName(drop);
      if (nestedName && !visited.has(nestedName)) {
        visited.add(nestedName);
        const nestedTable = getNestedDropTable(nestedName);
        return (
          chance +
          probability *
            getItemDropChance(nestedTable, item, { includeOpen, visited })
        );
      }
    }

    return chance;
  }, 0);
}

module.exports = {
  DEFAULT_ITEM,
  isDropArray,
  getDropWeight,
  getDropType,
  isItemDrop,
  isOpenDrop,
  getDropTableWeight,
  getNestedDropName,
  getNestedDropTable,
  getItemDropChance,
};
