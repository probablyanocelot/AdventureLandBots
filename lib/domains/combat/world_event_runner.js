const { isBusyMoving } = await require("../state/flags.js");
const { getNearestMonsterOfType, engageMonster } =
  await require("./targeting.js");
const { now } = await require("../shared/time.js");
const { dbg, stopSmartMove, isNearPoint, spreadFromPartyIfStacked } =
  await require("./combat_shared.js");

const runWorldEvent = ({ cfg, event, mover } = {}) => {
  if (!event) return;

  if (spreadFromPartyIfStacked({ cfg })) return;

  // If we've arrived at event coordinates, stop smart pathing so combat can take over.
  if (smart?.moving && isNearPoint(event, 75)) {
    stopSmartMove({
      cfg,
      reason: "world_arrival_radius",
      data: { event: event.name, map: event.map },
    });
  }

  const monster = getNearestMonsterOfType(event.name);

  // If event mob is visible, stop smart movement and engage immediately.
  if (monster && smart?.moving) {
    stopSmartMove({
      cfg,
      reason: "world_target_visible",
      data: { event: event.name, id: monster?.id },
    });
  }

  if (isBusyMoving()) return;

  const nowMs = now();
  if (cfg._lastWorldMove && nowMs - cfg._lastWorldMove < 5000) return;

  if (monster) {
    dbg(
      cfg,
      `world_engage:${event.name}`,
      "engaging world target",
      { event: event.name, id: monster?.id },
      1000,
    );
    engageMonster(monster);
    return;
  }

  dbg(
    cfg,
    `world_no_target:${event.name}`,
    "world event: no target visible; moving to event point",
    { event: event.name, map: event.map, x: event.x, y: event.y },
    2000,
  );

  cfg._lastWorldMove = nowMs;
  if (mover) {
    const requested = mover.request({
      dest: { map: event.map, x: event.x, y: event.y },
      key: `world:${event.name}`,
      priority: 3,
    });
    dbg(
      cfg,
      `world_move:${event.name}`,
      "queued world-event move",
      { event: event.name, via: "mover", requested },
      1500,
    );
  } else {
    try {
      smart_move({ map: event.map, x: event.x, y: event.y });
      dbg(
        cfg,
        `world_move:${event.name}`,
        "queued world-event move",
        { event: event.name, via: "smart_move" },
        1500,
      );
    } catch {
      // ignore
    }
  }
};

module.exports = {
  runWorldEvent,
};
