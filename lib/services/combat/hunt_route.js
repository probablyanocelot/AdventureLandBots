const { dbg } = await require("./combat_shared.js");

const queueHuntRally = ({ mover, rallyPoint, target, cfg } = {}) => {
  if (!rallyPoint) {
    return false;
  }

  if (mover) {
    const requested = mover.request({
      dest: { map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y },
      key: `hunt:rally:${target}`,
      priority: 2,
      cooldownMs: 2500,
    });
    dbg(
      cfg,
      `hunt_rally:${target}`,
      "queued hunt rally move",
      { target, rallyPoint, via: "mover", requested },
      1200,
    );
    return requested;
  }

  try {
    smart_move({ map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y });
    dbg(
      cfg,
      `hunt_rally:${target}`,
      "queued hunt rally move",
      { target, rallyPoint, via: "smart_move" },
      1200,
    );
    return true;
  } catch {
    return false;
  }
};

const queueHuntMove = ({
  mover,
  huntMoveDest,
  target,
  cfg,
  destMap,
  sameTargetRecently,
  nowMs,
} = {}) => {
  if (sameTargetRecently || !huntMoveDest) {
    return false;
  }

  let requested = false;
  if (mover) {
    requested = mover.request({
      dest: huntMoveDest,
      key: `hunt:${target}`,
      priority: 2,
    });
  } else {
    try {
      smart_move(huntMoveDest);
      requested = true;
    } catch {
      requested = false;
    }
  }

  if (requested) {
    cfg._lastHuntMove = nowMs;
    cfg._lastHuntMoveTarget = target;
    cfg._lastHuntMoveMap = destMap;
  }

  return requested;
};

module.exports = {
  queueHuntRally,
  queueHuntMove,
};
