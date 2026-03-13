// Sharpshooter Achievement Bot
// This bot will attempt to last-hit crabs from
// a minimum distance of 200 units to earn the Sharpshooter achievement.
// the achievement increases damage on bows by 

const range_min = 210;
const range_max = character.range;

const getTarget = () => {
  let target = get_targeted_monster();
  if (!target || target.hp <= 0) {
    target = get_nearest_monster({ mtype: "crab", min_d: range_min });
    if (!target || target.hp > character.attack) target = null;
  }

  if (!target) return [null, Infinity];

  const distance_to_mob = distance(character, target);
  return [target, distance_to_mob];
};

function get_within_distance(target, range_min, range_max) {
  if (!target) return Infinity;

  const dx = character.x - target.x;
  const dy = character.y - target.y;
  const distance_to_mob = Math.hypot(dx, dy);
  const inRange = distance_to_mob >= range_min && distance_to_mob <= range_max;
  if (inRange) return distance_to_mob;

  const desired_distance = Math.max(
    range_min,
    Math.min(distance_to_mob, range_max),
  );
  const inv = distance_to_mob > 0 ? 1 / distance_to_mob : 0;
  const ux = distance_to_mob > 0 ? dx * inv : 1;
  const uy = distance_to_mob > 0 ? dy * inv : 0;

  const move_x = target.x + ux * desired_distance;
  const move_y = target.y + uy * desired_distance;

  if (typeof can_move_to === "function" && can_move_to(move_x, move_y)) {
    move(move_x, move_y);
  } else if (typeof xmove === "function") {
    xmove(move_x, move_y);
  } else {
    move(move_x, move_y);
  }

  return distance_to_mob;
}

function achievement_sharpshooter() {
  let [target, distance_to_mob] = getTarget();
  if (target) {
    distance_to_mob = get_within_distance(target, range_min, range_max);
    if (distance_to_mob >= range_min && distance_to_mob <= range_max) {
      if (target.hp <= character.attack && can_attack(target)) {
        attack(target);
      }
    }
  }
  setTimeout(achievement_sharpshooter, 1000 / character.frequency);
}

achievement_sharpshooter();
