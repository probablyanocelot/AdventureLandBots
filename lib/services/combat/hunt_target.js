const { normalizeNumber, dbg, isNearPoint } =
  await require("./combat_shared.js");
const { pickHuntDestination } = await require("./hunt_destination.js");
const { createMvampireSweep, getMvampireOverrideTarget, advanceMvampireSweep } =
  await require("./hunt_sweep.js");
const { normalizeHuntDestination } = await require("./hunt_support.js");

const resolveHuntTarget = ({
  cfg,
  st,
  targetOverride,
  getTarget,
  rallyPoint,
  nowMs,
} = {}) => {
  let target =
    targetOverride != null
      ? targetOverride
      : typeof getTarget === "function"
        ? getTarget()
        : null;

  const goldenbat = Object.values(parent?.entities || {}).find(
    (entity) =>
      entity &&
      entity.type === "monster" &&
      !entity.dead &&
      String(entity.mtype || "").toLowerCase() === "goldenbat",
  );

  const hasGoldenbat = Boolean(goldenbat);
  if (hasGoldenbat) {
    target = "goldenbat";
    if (cfg?.debug?.combat) {
      dbg(
        cfg,
        "hunt_priority:goldenbat",
        "goldenbat sighted, overriding target",
        {
          goldenbatId: goldenbat.id,
          map: goldenbat.map,
          x: goldenbat.x,
          y: goldenbat.y,
        },
      );
    }
  }

  const { target: sweepTarget } = createMvampireSweep({
    cfg,
    st,
    target,
    nowMs,
  });
  target = sweepTarget;

  const overrideTarget = getMvampireOverrideTarget({
    st,
    hasGoldenbat,
  });
  if (overrideTarget) {
    target = overrideTarget;
  }

  if (!target) {
    return { target: null };
  }

  let huntDest = pickHuntDestination(target, cfg);
  if (st?.mvampireSweep?.active) {
    const sweep = st.mvampireSweep;
    const waypoint = sweep.waypoints[sweep.currentStep];
    if (waypoint) {
      huntDest = waypoint;
    }
  }

  const normalizedHuntDest = normalizeHuntDestination(huntDest, rallyPoint);
  if (!normalizedHuntDest && cfg?.debug?.combat) {
    dbg(
      cfg,
      `hunt_dest_missing:${target}`,
      "hunt destination missing or invalid, falling back to rally point",
      { target, huntDest, rallyPoint },
    );
  }

  const destinationAnchor = normalizedHuntDest;
  const huntArrivalRadius = Math.max(
    55,
    normalizeNumber(cfg?.farming?.huntArrivalRadius, 85),
  );
  const nearDestinationAnchor = Boolean(
    destinationAnchor && isNearPoint(destinationAnchor, huntArrivalRadius),
  );

  return {
    target,
    huntDest,
    normalizedHuntDest,
    destinationAnchor,
    nearDestinationAnchor,
    hasGoldenbat,
  };
};

const maybeAdvanceMvampireSweep = ({
  cfg,
  st,
  destinationAnchor,
  nearDestinationAnchor,
  nowMs,
} = {}) => {
  if (
    !st?.mvampireSweep?.active ||
    !destinationAnchor ||
    !nearDestinationAnchor
  ) {
    return false;
  }

  return advanceMvampireSweep({ cfg, st, destinationAnchor, nowMs });
};

module.exports = {
  resolveHuntTarget,
  maybeAdvanceMvampireSweep,
};
