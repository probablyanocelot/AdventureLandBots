// Geometry helpers for coordinate math, boundaries, and spatial calculations.

/**
 * Returns the nearest point in an array to the origin entity.
 * @param {Array<{x:number,y:number}>} points
 * @param {object} origin
 * @returns {object|null}
 */
function getNearestPoint(points = [], origin = null) {
  try {
    if (!Array.isArray(points) || !points.length) return null;
    const from = origin || character;
    let best = null;
    let bestDistance = Infinity;
    for (const p of points) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const d = Number.isFinite(distance?.(from, p))
        ? distance(from, p)
        : Infinity;
      if (d < bestDistance) {
        bestDistance = d;
        best = p;
      }
    }
    return best;
  } catch {
    return null;
  }
}

/**
 * Returns the center point of a boundary array.
 * @param {Array<number>} boundary
 * @returns {{x:number,y:number}|null}
 */
function getBoundaryCenter(boundary) {
  try {
    if (!Array.isArray(boundary) || !boundary.length) return null;
    if (boundary.length >= 4) {
      const x1 = Number(boundary[0]);
      const y1 = Number(boundary[1]);
      const x2 = Number(boundary[2]);
      const y2 = Number(boundary[3]);
      if (
        Number.isFinite(x1) &&
        Number.isFinite(y1) &&
        Number.isFinite(x2) &&
        Number.isFinite(y2)
      ) {
        return {
          x: (x1 + x2) / 2,
          y: (y1 + y2) / 2,
        };
      }
    }
    if (boundary.length >= 2) {
      const x = Number(boundary[0]);
      const y = Number(boundary[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns the corners of a boundary array.
 * @param {Array<number>} boundary
 * @returns {Array<{x:number,y:number}>}
 */
function getBoundaryCorners(boundary) {
  try {
    if (!Array.isArray(boundary) || !boundary.length) return [];
    if (boundary.length >= 4) {
      const x1 = Number(boundary[0]);
      const y1 = Number(boundary[1]);
      const x2 = Number(boundary[2]);
      const y2 = Number(boundary[3]);
      if (
        Number.isFinite(x1) &&
        Number.isFinite(y1) &&
        Number.isFinite(x2) &&
        Number.isFinite(y2)
      ) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return [
          { x: minX, y: minY },
          { x: minX, y: maxY },
          { x: maxX, y: minY },
          { x: maxX, y: maxY },
        ];
      }
    }
    const center = getBoundaryCenter(boundary);
    return center ? [center] : [];
  } catch {
    return [];
  }
}

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

function moveInCircle(center, radius = 30, angle = Math.PI / 2) {
  //\
  if (can_move_to(center.x, center.y)) {
    const angleFromCenterToCurrent = Math.atan2(
      character.y - center.y,
      character.x - center.x,
    );
    const endGoalAngle = angleFromCenterToCurrent + angle;
    const endGoal = {
      x: center.x + radius * Math.cos(endGoalAngle),
      y: center.y + radius * Math.sin(endGoalAngle),
    };
    move(endGoal.x, endGoal.y);
  } else {
    // Move to where we want to start walking in a circle
    xmove(center);
  }
}

module.exports = {
  getNearestPoint,
  getBoundaryCenter,
  getBoundaryCorners,
  drawLine,
  moveInCircle,
};
