// Function to get the nearest monster of a specific type
function getNearestMonsterOfType(mtype) {
  let nearestMonster = null;
  let nearestDistance = Infinity;
  for (let id in parent.entities) {
    let entity = parent.entities[id];
    if (entity.type == "monster") {
      // if it's of our target type
      if (entity.mtype == mtype) {
        let distance = parent.distance(parent.character, entity);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestMonster = entity;
        }
      }
    }
  }
  return nearestMonster;
}

// const getNearestMonsterOfType = (type) => {
//   try {
//     if (!type) return null;
//     return get_nearest_monster?.({ type }) || null;
//   } catch {
//     return null;
//   }
// };

const getPlayerSafe = (name) => {
  try {
    return get_player(name);
  } catch {
    return null;
  }
};

module.exports = {
  getNearestMonsterOfType,
  getPlayerSafe,
};
