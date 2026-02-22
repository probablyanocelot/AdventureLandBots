const { getNearestMonsterOfType: getNearestMonsterOfTypeBase } =
  await require("./fn_game.js");
const { logCatch } = await require("./al_debug_log.js");
const { useFarmerSkills } = await require("./combat_skills.js");

const PRIORITY_TARGETS = [
  "snowman",
  "cutebee",
  "grinch",
  "rgoo",
  "bgoo",
  "goldenbat",
  "tinyp",
  "greenjr",
  "phoenix",
  "franky",
  "mrpumpkin",
  "mrgreen",
  "icegolem",
  "crabxx",
  "dragold",
];

const getNearestVisiblePriorityMonster = () => {
  try {
    const entities = parent?.entities;
    if (!entities || !character) return null;

    const hasRgoo = Object.values(entities).some(
      (e) => e?.type === "monster" && e?.mtype === "rgoo" && !e?.dead,
    );

    const list = hasRgoo
      ? PRIORITY_TARGETS.filter((m) => m !== "bgoo")
      : PRIORITY_TARGETS;

    let bestMonster = null;
    let bestPriorityIndex = Infinity;
    let bestDistance = Infinity;

    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster" || entity.dead) continue;

      const idx = list.indexOf(entity.mtype);
      if (idx === -1) continue;

      const d = parent.distance?.(character, entity);
      const distance = Number.isFinite(d) ? d : Infinity;

      if (
        idx < bestPriorityIndex ||
        (idx === bestPriorityIndex && distance < bestDistance)
      ) {
        bestMonster = entity;
        bestPriorityIndex = idx;
        bestDistance = distance;
      }
    }

    return bestMonster;
  } catch (e) {
    logCatch("getNearestVisiblePriorityMonster failed", e);
    return null;
  }
};

const getNearestMonsterOfType = (mtype) => {
  try {
    const priorityTarget = getNearestVisiblePriorityMonster();
    if (priorityTarget) return priorityTarget;
  } catch {
    // ignore and fall back
  }
  return getNearestMonsterOfTypeBase(mtype);
};

const engageMonster = (
  monster,
  { rangeSkill = "attack", skillOptions = {} } = {},
) => {
  try {
    if (!monster || monster?.dead) return false;
    if (typeof change_target === "function") change_target(monster);

    try {
      useFarmerSkills(monster, skillOptions);
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
  PRIORITY_TARGETS,
  getNearestVisiblePriorityMonster,
  getNearestMonsterOfType,
  engageMonster,
};
