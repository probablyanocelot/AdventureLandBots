const getNearestMonsterOfType = (type) => {
  try {
    if (!type) return null;
    return get_nearest_monster?.({ type }) || null;
  } catch {
    return null;
  }
};

const engageMonster = (monster, { rangeSkill = "attack" } = {}) => {
  try {
    if (!monster || monster?.dead) return false;
    if (typeof change_target === "function") change_target(monster);
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
  } catch {
    // ignore
  }
  return false;
};

module.exports = {
  getNearestMonsterOfType,
  engageMonster,
};
