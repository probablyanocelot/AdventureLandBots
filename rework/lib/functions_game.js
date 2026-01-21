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
// export { getNearestMonsterOfType };
