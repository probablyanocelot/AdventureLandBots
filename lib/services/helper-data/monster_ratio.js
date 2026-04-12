const DEFAULT_STAT_KEY = "max_hp";

const { getItemDropChance } = require("./drop_chance.js");

function getRatio(numerator, denominator, { fallback = Infinity } = {}) {
  const num = Number(numerator) || 0;
  const den = Number(denominator) || 0;
  return den > 0 ? num / den : fallback;
}

function getMonsterValue(monster, statKey) {
  if (!monster || typeof monster !== "object") return 0;
  return Number(monster[statKey] ?? 0);
}

function getMonsterStat(monster, statKey = DEFAULT_STAT_KEY) {
  if (!monster || typeof monster !== "object") return 0;
  if (statKey in monster) {
    return Number(monster[statKey]) || 0;
  }
  return Number(monster.max_hp ?? monster.hp ?? 0);
}

function getMonsterStatRatio(
  monster,
  numeratorKey,
  denominatorKey,
  options = {},
) {
  const numerator = getMonsterValue(monster, numeratorKey);
  const denominator = getMonsterValue(monster, denominatorKey);
  return getRatio(numerator, denominator, options);
}

function buildMonsterRow(mtype, dropTable, item, statKey, options) {
  const monster = G.monsters?.[mtype] || {};
  const stat = getMonsterStat(monster, statKey);
  const chance = getItemDropChance(dropTable, item, options);
  const ratio = getRatio(stat, chance, { fallback: Infinity });

  return {
    mtype,
    name: monster.name || mtype,
    stat,
    chance,
    ratio,
  };
}

function filterValidRows(rows) {
  return rows.filter((entry) => entry.chance > 0 && entry.stat > 0);
}

function sortRowsByRatio(rows) {
  return rows.slice().sort((a, b) => a.ratio - b.ratio);
}

function getCollectedMonsterRows(item, statKey, options = {}) {
  const monsters = Object.entries((G.drops || {}).monsters || {});

  return monsters.map(([mtype, dropTable]) =>
    buildMonsterRow(mtype, dropTable, item, statKey, options),
  );
}

function printTopRows({
  item = "goldenegg",
  statKey = DEFAULT_STAT_KEY,
  limit = 20,
  options = {},
} = {}) {
  const rows = sortRowsByRatio(
    filterValidRows(getCollectedMonsterRows(item, statKey, options)),
  );
  console.table(rows.slice(0, limit));
}

module.exports = {
  DEFAULT_STAT_KEY,
  getRatio,
  getMonsterValue,
  getMonsterStat,
  getMonsterStatRatio,
  buildMonsterRow,
  filterValidRows,
  sortRowsByRatio,
  getCollectedMonsterRows,
  printTopRows,
};
