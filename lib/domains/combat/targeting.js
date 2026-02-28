const { getNearestMonsterOfType: getNearestMonsterOfTypeBase } =
  await require("../../fn_game.js");
const { logCatch } = await require("../../al_debug_log.js");
const { useFarmerSkills } = await require("./skills.js");

const GOOBRAWL_PRIORITY_TARGETS = ["rgoo", "bgoo"];

const SEASONAL_PRIORITY_TARGETS = [
  "dragold",
  "pinkgoo",
  "mrpumpkin",
  "mrgreen",
  "grinch",
  "snowman",
  "goldenbat",
  "tinyp",
  "cutebee",
];

const DAILY_PRIORITY_TARGETS = [
  "franky",
  "abtesting",
  "icegolem",
  "greenjr",
  "js",
  "crabxx",
  "phoenix",
];

const PRIORITY_TARGETS = [
  ...GOOBRAWL_PRIORITY_TARGETS,
  ...SEASONAL_PRIORITY_TARGETS,
  ...DAILY_PRIORITY_TARGETS,
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
