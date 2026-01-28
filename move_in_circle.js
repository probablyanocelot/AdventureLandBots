export function moveInCircle(center, radius = 30, angle = Math.PI / 2) {
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
