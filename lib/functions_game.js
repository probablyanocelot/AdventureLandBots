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

function drawLine(xOne, yOne, xTwo, yTwo, direction) {
  let x;
  // let y = y

  let mag = Math.sqrt((xTwo - xOne) ** 2 + (yTwo - yOne) ** 2);
  let xThree = xTwo + (d * (xTwo - xOne)) / mag;
  let yThree = yTwo + (d * (yTwo - yOne)) / mag;

  let pointOne = [xOne, yOne];
  let pointTwo = [xTwo, yTwo];

  log([xThree, yThree]);
  return [xThree, yThree];

  switch (direction) {
    case "right":
      x = Math.max(xOne, xTwo) + 5; // TODO: abstract the 5
    case "left":
      x = Math.min(xOne, xTwo) - 5; // TODO: abstract the 5
  }

  // y-yOne == (yTwo - yOne / xTwo - xOne) * (x - xOne)
  let y = (yTwo - yOne / xTwo - xOne) * (x - xOne) + yOne;

  log([x, y]);
  return [x, y];
}

module.exports = {
  getNearestMonsterOfType,
  drawLine,
};
