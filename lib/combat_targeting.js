const { getNearestMonsterOfType } = require("./fn_game.js");
const { logCatch } = await require("./al_debug_log.js");
const { useFarmerSkills } = await require("./combat_skills.js");

const engageMonster = (monster, { rangeSkill = "attack" } = {}) => {
  try {
    if (!monster || monster?.dead) return false;
    if (typeof change_target === "function") change_target(monster);

    try {
      useFarmerSkills(monster);
    } catch {
      // ignore skill errors; keep attack loop alive
    }

    if (typeof can_attack === "function" && can_attack(monster)) {
      attack(monster);
      return true;
    }
    if (
      typeof is_in_range === "function" &&
      !is_in_range(monster, rangeSkill)
    ) {
      if (typeof xmove === "function") xmove(monster.x, monster.y);
    }
  } catch (e) {
    logCatch("engageMonster failed", e);
  }
  return false;
};

module.exports = {
  getNearestMonsterOfType,
  engageMonster,
};
