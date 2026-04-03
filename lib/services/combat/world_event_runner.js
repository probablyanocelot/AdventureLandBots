const { isBusyMoving } = await require("../state/flags.js");
const { getNearestMonsterOfType, engageMonster } =
  await require("./targeting.js");
const { now } = await require("../shared/index.js");
const { dbg, stopSmartMove, isNearPoint, spreadFromPartyIfStacked } =
  await require("./combat_shared.js");
const { createRareMobScanner } = await require("../events/rare_mob_scanner.js");

let _worldEventRareScanner = null;
let _worldEventRareScannerTarget = null;

const clearRareMobScanner = () => {
  try {
    if (_worldEventRareScanner && typeof _worldEventRareScanner.stopRoutine === "function") {
      _worldEventRareScanner.stopRoutine();
    }
  } catch {
    // ignore.
  }
  _worldEventRareScanner = null;
  _worldEventRareScannerTarget = null;
};

const ensureRareMobScanner = (event, cfg) => {
  if (!event || !event.name) return;

  const target = String(event.name).toLowerCase();
  if (_worldEventRareScannerTarget === target && _worldEventRareScanner) return;

  clearRareMobScanner();

  _worldEventRareScannerTarget = target;
  _worldEventRareScanner = createRareMobScanner({
    enabled: true,
    names: [target],
    scanIntervalMs: Number(cfg?.eventSearch?.scanIntervalMs) || 1300,
    alertRepeatMs: Number(cfg?.eventSearch?.alertRepeatMs) || 60 * 1000,
    announceToGameLog: false,
    notify: ({ text, key, entity }) => {
      try {
        dbg(cfg, "rare_mob_scanner_detected", "rare mob scanner spotted entity", {
          target,
          key,
          entity,
        }, 1000);
        if (typeof game_log === "function") game_log(text);
      } catch {
        // ignore
      }
    },
  });
};

const getEventSearchPoints = (event) => {
  if (!event || !event.map) return [];

  const mapInfo = G?.maps?.[event.map];
  const points = [];

  if (mapInfo?.monsters && Array.isArray(mapInfo.monsters)) {
    mapInfo.monsters.forEach((pack) => {
      if (pack.type !== event.name) return;

      if (pack.boundaries && pack.boundaries.length) {
        const boundary = pack.boundaries[0];
        points.push({
          map: event.map,
          x: Math.round((boundary[0] + boundary[2]) / 2),
          y: Math.round((boundary[1] + boundary[3]) / 2),
        });
      } else if (pack.boundary) {
        points.push({
          map: event.map,
          x: Math.round((pack.boundary[0] + pack.boundary[2]) / 2),
          y: Math.round((pack.boundary[1] + pack.boundary[3]) / 2),
        });
      }
    });
  }

  if (!points.length && mapInfo?.spawns && Array.isArray(mapInfo.spawns)) {
    const spawn = mapInfo.spawns[0];
    if (Array.isArray(spawn) && spawn.length >= 2) {
      points.push({ map: event.map, x: spawn[0], y: spawn[1] });
    }
  }

  if (!points.length) {
    points.push({ map: event.map });
  }

  return points;
};

const selectNextSearchPoint = (cfg, event) => {
  const key = `worldEvent:${event.name}:${event.map}`;
  const points = getEventSearchPoints(event);
  if (!points.length) return null;

  if (!cfg._worldEventSearchPointers) cfg._worldEventSearchPointers = new Map();
  const existing = cfg._worldEventSearchPointers.get(key) ?? {
    index: 0,
    points,
  };

  // if map or name changed, reset pointer.
  if (
    existing.points.length !== points.length ||
    existing.points.some(
      (p, i) =>
        p.map !== points[i]?.map ||
        p.x !== points[i]?.x ||
        p.y !== points[i]?.y,
    )
  ) {
    existing.index = 0;
    existing.points = points;
  }

  const result =
    existing.points[Math.min(existing.index, existing.points.length - 1)];
  if (!result) return null;

  cfg._worldEventSearchPointers.set(key, existing);
  return result;
};

const consumeSearchPoint = (cfg, event) => {
  const key = `worldEvent:${event.name}:${event.map}`;
  if (!cfg._worldEventSearchPointers) return;
  const existing = cfg._worldEventSearchPointers.get(key);
  if (!existing) return;
  existing.index = Math.min(existing.index + 1, existing.points.length - 1);
  cfg._worldEventSearchPointers.set(key, existing);
};

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
    clearRareMobScanner();

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

  const hasCoords = Number.isFinite(event?.x) && Number.isFinite(event?.y);
  const mapOnly = Boolean(event?.map && !hasCoords);

  if (mapOnly) {
    ensureRareMobScanner(event, cfg);
    try {
      _worldEventRareScanner?.scan?.();
    } catch {
      // ignore scan failure
    }
  } else {
    clearRareMobScanner();
  }

  dbg(
    cfg,
    `world_no_target:${event.name}`,
    mapOnly
      ? "world event: no target visible; map-only event; cycling map search points"
      : "world event: no target visible; moving to event point",
    {
      event: event.name,
      map: event.map,
      x: event.x,
      y: event.y,
      mapOnly,
    },
    2000,
  );

  cfg._lastWorldMove = nowMs;

  let destination = null;

  if (mapOnly) {
    if (character?.map !== event.map) {
      destination = { map: event.map };
    } else {
      const candidate = selectNextSearchPoint(cfg, event);
      if (candidate && !isNearPoint(candidate, 70)) {
        destination = candidate;
      } else {
        consumeSearchPoint(cfg, event);
        const nextCandidate = selectNextSearchPoint(cfg, event);
        destination = nextCandidate || { map: event.map };
      }
    }
  } else {
    destination = { map: event.map, x: event.x, y: event.y };
  }

  if (!destination) return;

  if (mover) {
    const requested = mover.request({
      dest: destination,
      key: `world:${event.name}`,
      priority: 3,
    });
    dbg(
      cfg,
      `world_move:${event.name}`,
      "queued world-event move",
      { event: event.name, via: "mover", requested, destination },
      1500,
    );
  } else {
    try {
      smart_move(destination);
      dbg(
        cfg,
        `world_move:${event.name}`,
        "queued world-event move",
        { event: event.name, via: "smart_move", destination },
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
