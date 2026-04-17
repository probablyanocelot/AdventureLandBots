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

const DEFAULT_ITEM = "goldenegg";

function getNestedDropName(drop) {
  return isOpenDrop(drop) ? drop[2] : undefined;
}

function getNestedDropTable(dropName) {
  return (G.drops || {})[dropName] || [];
}

function getItemDropChance(
  dropTable,
  item,
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
        const nestedVisited = new Set(visited);
        nestedVisited.add(nestedName);
        const nestedTable = getNestedDropTable(nestedName);
        return (
          chance +
          probability *
            getItemDropChance(nestedTable, item, {
              includeOpen,
              visited: nestedVisited,
            })
        );
      }
    }

    return chance;
  }, 0);
}

function getItemDropProbability(
  dropTable,
  item,
  { includeOpen = false, visited = new Set() } = {},
) {
  if (!Array.isArray(dropTable)) return 0;

  const noDropProbability = dropTable.reduce((noDrop, drop) => {
    if (!isDropArray(drop)) return noDrop;

    let dropProbability = 0;
    if (isItemDrop(drop, item)) {
      dropProbability = Math.min(1, getDropWeight(drop));
    } else if (includeOpen && isOpenDrop(drop)) {
      const nestedName = getNestedDropName(drop);
      if (nestedName && !visited.has(nestedName)) {
        const nestedVisited = new Set(visited);
        nestedVisited.add(nestedName);
        const nestedTable = getNestedDropTable(nestedName);
        const nestedChance = getItemDropChance(nestedTable, item, {
          includeOpen,
          visited: nestedVisited,
        });
        dropProbability = Math.min(1, getDropWeight(drop)) * nestedChance;
      }
    }

    return noDrop * (1 - dropProbability);
  }, 1);

  return 1 - noDropProbability;
}

function getMapDropTable(mapName) {
  return ((G.drops || {}).maps || {})[mapName] || [];
}

function getGlobalDropTable() {
  return getMapDropTable("global");
}

function getGlobalDropProbability(item, options = {}) {
  return getItemDropProbability(getGlobalDropTable(), item, options);
}

function getMapDropProbability(mapName, item, options = {}) {
  return getItemDropProbability(getMapDropTable(mapName), item, options);
}

function getMapAndGlobalDropProbability(mapName, item, options = {}) {
  const globalChance = getGlobalDropProbability(item, options);
  const mapChance = getMapDropProbability(mapName, item, options);
  return 1 - (1 - globalChance) * (1 - mapChance);
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
  getItemDropProbability,
  getGlobalDropTable,
  getMapDropTable,
  getGlobalDropProbability,
  getMapDropProbability,
  getMapAndGlobalDropProbability,
};
