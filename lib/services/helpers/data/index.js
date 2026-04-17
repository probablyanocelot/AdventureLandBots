const dropChance = await require("./drop_chance.js");
const monsterRatio = await require("./monster_ratio.js");

module.exports = {
  ...dropChance,
  ...monsterRatio,
};
