const { dbg } = await require("./combat_shared.js");
const { pickHuntDestination, getMapSidePoint } =
  await require("./hunt_destination.js");

const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

const createMvampireSweep = ({ cfg, st, target, nowMs }) => {
  const nf = cfg?.noEventFarming || {};
  const mvampireCheckIntervalMs = Math.max(
    0,
    Number(nf.mvampireCheckIntervalMs || DEFAULT_SWEEP_INTERVAL_MS),
  );
  const lastMvampireCheckAt = Number(cfg?._lastMvampireCheckAt || 0);
  const hasMvampireBuff = Boolean(
    character?.s?.mlifesteal || character?.s?.lifesteal || false,
  );
  const isBatTarget = String(target || "").toLowerCase() === "bat";

  if (
    !st ||
    st.mvampireSweep?.active ||
    mvampireCheckIntervalMs <= 0 ||
    !isBatTarget ||
    !hasMvampireBuff ||
    nowMs - lastMvampireCheckAt < mvampireCheckIntervalMs
  ) {
    return { target, sweepStarted: false };
  }

  const batAnchor = pickHuntDestination("bat", cfg) || {
    map: character?.map,
    x: Number(character?.x || 0),
    y: Number(character?.y || 0),
  };
  const mapName = batAnchor.map || character?.map || "main";
  const sideBase = Number(st.mvampireSweepSideBase || 0) % 4;
  const sideA = getMapSidePoint(mapName, sideBase, batAnchor, nf);
  const sideB = getMapSidePoint(mapName, (sideBase + 1) % 4, batAnchor, nf);
  const batHome = {
    map: batAnchor.map || character?.map || "main",
    x: Number(batAnchor.x || character?.x || 0),
    y: Number(batAnchor.y || character?.y || 0),
  };

  const waypoints = [sideA, sideB, batHome].filter(Boolean);
  if (waypoints.length < 2) {
    return { target, sweepStarted: false };
  }

  st.mvampireSweep = {
    active: true,
    map: mapName,
    batHome,
    sideBase,
    currentStep: 0,
    waypoints,
    startedAt: nowMs,
  };

  if (cfg?.debug?.combat) {
    dbg(cfg, "hunt_mvampire_sweep_start", "starting mvampire spawn sweep", {
      targets: waypoints,
    });
  }

  return { target, sweepStarted: true };
};

const getMvampireOverrideTarget = ({ st, hasGoldenbat }) => {
  if (st?.mvampireSweep?.active && !hasGoldenbat) {
    return "mvampire";
  }
  return null;
};

const advanceMvampireSweep = ({ cfg, st, destinationAnchor, nowMs }) => {
  if (!st?.mvampireSweep?.active || !destinationAnchor) return false;

  const sweep = st.mvampireSweep;
  if (sweep.currentStep < sweep.waypoints.length - 1) {
    sweep.currentStep += 1;
    if (cfg?.debug?.combat) {
      dbg(
        cfg,
        "hunt_mvampire_sweep_step",
        "mvampire sweep advanced to next waypoint",
        {
          currentStep: sweep.currentStep,
          nextWaypoint: sweep.waypoints[sweep.currentStep],
        },
      );
    }
    return true;
  }

  cfg._lastMvampireCheckAt = nowMs;
  st.mvampireSweepSideBase = (Number(sweep.sideBase || 0) + 2) % 4;
  st.mvampireSweep = null;
  if (cfg?.debug?.combat) {
    dbg(
      cfg,
      "hunt_mvampire_sweep_complete",
      "mvampire sweep complete, returning to bat route",
      {
        lastMvampireCheckAt: cfg._lastMvampireCheckAt,
      },
    );
  }
  return true;
};

module.exports = {
  createMvampireSweep,
  getMvampireOverrideTarget,
  advanceMvampireSweep,
};
