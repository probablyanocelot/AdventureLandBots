const { pickPullerName, isPriestBackupReady } =
  await require("./hunt_support.js");
const { isTargetDifficult } = await require("./hunt_destination.js");

const resolveHuntMoveState = ({
  target,
  cfg,
  huntGroupNames,
  destinationAnchor,
  isPorcupineTarget,
  getTeammateAtDestination,
  disableHuntBlockers,
} = {}) => {
  const teammateAtDestination =
    destinationAnchor && !isPorcupineTarget && character?.ctype !== "ranger"
      ? getTeammateAtDestination({
          huntGroupNames,
          destination: destinationAnchor,
        })
      : null;

  const huntMoveDest = teammateAtDestination
    ? {
        map: teammateAtDestination.map,
        x: teammateAtDestination.x,
        y: teammateAtDestination.y,
      }
    : destinationAnchor;

  const pullerName = pickPullerName(huntGroupNames);
  const iAmPuller = pullerName === character?.name;
  const hardByDefinition = isTargetDifficult(target, cfg);
  const priestPresent = isPriestBackupReady({
    huntGroupNames,
    anchor: null,
  });

  const requirePriestForWarriorHardPull =
    cfg?.farming?.requirePriestForWarriorHardPull !== false;
  const priestRequiredForWarriorPull =
    !disableHuntBlockers &&
    requirePriestForWarriorHardPull &&
    iAmPuller &&
    character?.ctype === "warrior";

  return {
    teammateAtDestination,
    huntMoveDest,
    pullerName,
    iAmPuller,
    hardByDefinition,
    priestPresent,
    priestRequiredForWarriorPull,
  };
};

module.exports = {
  resolveHuntMoveState,
};
