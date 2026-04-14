/* eslint-disable no-unused-vars */
let DEFAULT_ATTACK_FREQUENCY = 0;

function getRatio(numerator, denominator, { fallback = Infinity } = {}) {
  const num = Number(numerator) || 0;
  const den = Number(denominator) || 0;
  return den > 0 ? num / den : fallback;
}

function getMonsterValue(monster, statKey) {
  if (!monster || typeof monster !== "object") return 0;
  return Number(monster[statKey] ?? 0);
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeFrequency(value, fallback = DEFAULT_ATTACK_FREQUENCY) {
  const normalized = normalizeNumber(value, fallback);
  return normalized > 0 ? normalized : fallback;
}

function getCharacterAttack(attack = 1) {
  return Math.max(1, normalizeNumber(attack, 1));
}

function getCharacterFrequency(frequency = 1) {
  return Math.max(1, normalizeFrequency(frequency, DEFAULT_ATTACK_FREQUENCY));
}

function getMonsterArmor(monster) {
  return Math.max(0, normalizeNumber(monster?.armor ?? monster?.resistance, 0));
}

function getMonsterXp(monster) {
  return Math.max(0, normalizeNumber(monster?.xp, 0));
}

function getMonsterHp(monster) {
  return Math.max(0, normalizeNumber(monster?.hp ?? monster?.max_hp, 0));
}

function getMonsterTimeToKillSeconds(
  monster,
  characterAttack = 1,
  characterFrequency = 1,
) {
  const hp = getMonsterHp(monster);
  const armor = getMonsterArmor(monster);
  const damagePerHit = Math.max(1, getCharacterAttack(characterAttack) - armor);
  const hitsToKill = hp > 0 ? Math.ceil(hp / damagePerHit) : Infinity;
  return hitsToKill === Infinity
    ? Infinity
    : hitsToKill / getCharacterFrequency(characterFrequency);
}

function getMonsterXpPerSecond(
  monster,
  characterAttack = 1,
  characterFrequency = 1,
) {
  const xp = getMonsterXp(monster);
  const seconds = getMonsterTimeToKillSeconds(
    monster,
    characterAttack,
    characterFrequency,
  );
  return seconds > 0 && Number.isFinite(seconds) ? xp / seconds : 0;
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

function buildMonsterXpRow(
  mtype,
  characterAttack = 1,
  characterFrequency = DEFAULT_ATTACK_FREQUENCY,
) {
  const monster = G.monsters?.[mtype] || {};
  const hp = getMonsterHp(monster);
  const xp = getMonsterXp(monster);
  const armor = getMonsterArmor(monster);
  const damagePerHit = Math.max(1, getCharacterAttack(characterAttack) - armor);
  const hitsToKill = hp > 0 ? Math.ceil(hp / damagePerHit) : Infinity;
  const timeToKillSeconds =
    hitsToKill === Infinity
      ? Infinity
      : hitsToKill / getCharacterFrequency(characterFrequency);
  const xpPerSecond =
    timeToKillSeconds > 0 && Number.isFinite(timeToKillSeconds)
      ? xp / timeToKillSeconds
      : 0;

  return {
    mtype,
    name: monster.name || mtype,
    hp,
    xp,
    armor,
    characterAttack: getCharacterAttack(characterAttack),
    characterFrequency: getCharacterFrequency(characterFrequency),
    damagePerHit,
    hitsToKill,
    timeToKillSeconds,
    xpPerSecond,
  };
}

function filterValidXpRows(rows) {
  return rows.filter(
    (entry) =>
      entry.hp > 0 &&
      entry.xp > 0 &&
      Number.isFinite(entry.timeToKillSeconds) &&
      entry.timeToKillSeconds > 0,
  );
}

function sortRowsByXpPerSecond(rows) {
  return rows.slice().sort((a, b) => b.xpPerSecond - a.xpPerSecond);
}

function getCollectedMonsterXpRows(
  characterAttack = 1,
  characterFrequency = DEFAULT_ATTACK_FREQUENCY,
) {
  const monsters = Object.keys(G.monsters || {});
  return monsters.map((mtype) =>
    buildMonsterXpRow(mtype, characterAttack, characterFrequency),
  );
}

function printTopXpRows({
  attack = 1,
  frequency = DEFAULT_ATTACK_FREQUENCY,
  limit = 20,
} = {}) {
  const rows = sortRowsByXpPerSecond(
    filterValidXpRows(getCollectedMonsterXpRows(attack, frequency)),
  );
  console.table(rows.slice(0, limit));
}

(async () => {
  const attack = Number(character?.attack || 1);
  const frequency = Number(character?.frequency || 1);

  const xpRows = getCollectedMonsterXpRows(attack, frequency)
    .filter((row) => row.xpPerSecond > 0)
    .slice(0, 30);

  show_json(xpRows, [
    "mtype",
    "name",
    "hp",
    "xp",
    "armor",
    "damagePerHit",
    "hitsToKill",
    "timeToKillSeconds",
    "xpPerSecond",
  ]);
})();
