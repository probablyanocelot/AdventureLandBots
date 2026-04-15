const { normalizeNumber } = await require("./combat_shared.js");
const { getNearestPoint, getBoundaryCenter, getBoundaryCorners } =
  await require("../geometry/geometry.js");

const isDeniedHuntSpot = (target, spot, cfg) => {
  try {
    if (!target || !spot?.map) return false;
    const allowByTarget = cfg?.noEventFarming?.huntMapAllowByTarget;
    if (allowByTarget && typeof allowByTarget === "object") {
      const allowedMaps = Array.isArray(allowByTarget[target])
        ? allowByTarget[target]
        : [];
      if (allowedMaps.length && !allowedMaps.includes(spot.map)) return true;
    }

    const denyByTarget = cfg?.noEventFarming?.huntMapDenyByTarget;
    if (!denyByTarget || typeof denyByTarget !== "object") return false;

    const deniedMaps = Array.isArray(denyByTarget[target])
      ? denyByTarget[target]
      : [];
    if (!deniedMaps.length) return false;

    return deniedMaps.includes(spot.map);
  } catch {
    return false;
  }
};

const isPreferredHuntSpot = (target, spot, cfg) => {
  try {
    if (!target || !spot?.map) return false;
    const preferByTarget = cfg?.noEventFarming?.huntMapPreferByTarget;
    if (!preferByTarget || typeof preferByTarget !== "object") return false;

    const preferredMaps = Array.isArray(preferByTarget[target])
      ? preferByTarget[target]
      : [];
    if (!preferredMaps.length) return false;

    return preferredMaps.includes(spot.map);
  } catch {
    return false;
  }
};

const isTargetDifficult = (target, cfg) => {
  try {
    if (!target) return false;
    const def = G?.monsters?.[target];
    if (!def) return false;

    const nf = cfg?.noEventFarming || {};
    const hp = normalizeNumber(def.hp, 0);
    const attack = normalizeNumber(def.attack, 0);

    const weak = hp <= nf.weakMaxHp && attack <= nf.weakMaxAttack;
    const highAttack = attack >= nf.highAttack;
    const highHp = hp >= nf.highHp;
    const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;
    const difficult = highAttack || highHp || longFight;

    return difficult && !weak;
  } catch {
    return false;
  }
};

const getMapBoundingBox = (mapName) => {
  try {
    if (
      !mapName ||
      !G?.maps?.[mapName] ||
      !Array.isArray(G.maps[mapName].monsters)
    )
      return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const spawn of G.maps[mapName].monsters) {
      if (!spawn || !Array.isArray(spawn.boundary) || spawn.boundary.length < 4)
        continue;

      const x1 = Number(spawn.boundary[0]);
      const y1 = Number(spawn.boundary[1]);
      const x2 = Number(spawn.boundary[2]);
      const y2 = Number(spawn.boundary[3]);

      if (
        !Number.isFinite(x1) ||
        !Number.isFinite(y1) ||
        !Number.isFinite(x2) ||
        !Number.isFinite(y2)
      )
        continue;

      minX = Math.min(minX, x1, x2);
      minY = Math.min(minY, y1, y2);
      maxX = Math.max(maxX, x1, x2);
      maxY = Math.max(maxY, y1, y2);
    }

    if (
      minX === Infinity ||
      minY === Infinity ||
      maxX === -Infinity ||
      maxY === -Infinity
    )
      return null;

    return { minX, minY, maxX, maxY };
  } catch {
    return null;
  }
};

const getMapSidePoint = (mapName, sideIndex, fallbackCenter, nf = {}) => {
  try {
    const bbox = getMapBoundingBox(mapName);
    if (!bbox) {
      if (
        fallbackCenter &&
        typeof fallbackCenter.x === "number" &&
        typeof fallbackCenter.y === "number"
      ) {
        return { map: mapName, x: fallbackCenter.x, y: fallbackCenter.y };
      }
      return null;
    }

    const pad = Number(nf.mvampireSweepPadPx || 20);
    const x1 = bbox.minX + pad;
    const y1 = bbox.minY + pad;
    const x2 = bbox.maxX - pad;
    const y2 = bbox.maxY - pad;

    switch (sideIndex % 4) {
      case 0:
        return { map: mapName, x: (x1 + x2) / 2, y: y1 };
      case 1:
        return { map: mapName, x: x2, y: (y1 + y2) / 2 };
      case 2:
        return { map: mapName, x: (x1 + x2) / 2, y: y2 };
      case 3:
      default:
        return { map: mapName, x: x1, y: (y1 + y2) / 2 };
    }
  } catch {
    return null;
  }
};

const pickHuntDestination = (target, cfg) => {
  try {
    if (!target || !G?.maps) return target;

    const difficult = isTargetDifficult(target, cfg);
    let spots = [];

    const cfgSpots = cfg?.noEventFarming?.huntSpotsByTarget?.[target];
    if (Array.isArray(cfgSpots)) {
      for (const s of cfgSpots) {
        if (!s || !s.map || typeof s.x !== "number" || typeof s.y !== "number")
          continue;
        spots.push({
          map: s.map,
          x: s.x,
          y: s.y,
          count: undefined,
          boundary: [],
          _cfgPreferred: true,
          _cfgX: s.x,
          _cfgY: s.y,
        });
      }
    }

    for (const [mapName, mapDef] of Object.entries(G.maps)) {
      const monsters = Array.isArray(mapDef?.monsters) ? mapDef.monsters : [];
      for (const spawn of monsters) {
        if (!spawn || spawn.type !== target) continue;
        const center = getBoundaryCenter(spawn.boundary);
        if (!center) continue;

        const spot = {
          map: mapName,
          x: center.x,
          y: center.y,
          count: normalizeNumber(spawn.count, 0),
          boundary: Array.isArray(spawn.boundary) ? [...spawn.boundary] : [],
        };

        if (isDeniedHuntSpot(target, spot, cfg)) continue;
        spots.push(spot);
      }
    }

    if (!spots.length) return target;

    spots.sort((a, b) => {
      const aCfg = a._cfgPreferred ? 1 : 0;
      const bCfg = b._cfgPreferred ? 1 : 0;
      if (aCfg !== bCfg) return bCfg - aCfg;

      const aPreferred = isPreferredHuntSpot(target, a, cfg) ? 1 : 0;
      const bPreferred = isPreferredHuntSpot(target, b, cfg) ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;

      const aHasCfgXY =
        a._cfgPreferred &&
        typeof a._cfgX === "number" &&
        typeof a._cfgY === "number";
      const bHasCfgXY =
        b._cfgPreferred &&
        typeof b._cfgX === "number" &&
        typeof b._cfgY === "number";
      if (!(aHasCfgXY && bHasCfgXY)) {
        if (a.count !== b.count) {
          return difficult ? a.count - b.count : b.count - a.count;
        }
      }

      const aSameMap = a.map === character?.map ? 1 : 0;
      const bSameMap = b.map === character?.map ? 1 : 0;
      if (aSameMap !== bSameMap) return bSameMap - aSameMap;

      const da = Number.isFinite(distance?.(character, a))
        ? distance(character, a)
        : Infinity;
      const db = Number.isFinite(distance?.(character, b))
        ? distance(character, b)
        : Infinity;
      return da - db;
    });

    const best = spots[0];
    if (!best) return target;

    if (
      best._cfgPreferred &&
      typeof best._cfgX === "number" &&
      typeof best._cfgY === "number"
    ) {
      if (cfg.debug.pickHuntDestination)
        console.log("pickHuntDestination-configSpot", {
          target,
          cfgSpot: best,
          chosen: { x: best._cfgX, y: best._cfgY },
        });
      return {
        map: best.map,
        x: best._cfgX,
        y: best._cfgY,
        count: best.count,
        boundary: [],
        center: { x: best._cfgX, y: best._cfgY },
        corner: { x: best._cfgX, y: best._cfgY },
      };
    }

    const corners = getBoundaryCorners(best.boundary);
    const center = getBoundaryCenter(best.boundary) || best;
    const isStrong = isTargetDifficult(target, cfg);
    const chosen =
      isStrong && corners.length
        ? getNearestPoint(corners, character) || corners[0]
        : center;

    if (cfg.debug.pickHuntDestination)
      console.log("pickHuntDestination-end", { target, cfgSpot: best, chosen });
    return {
      map: best.map,
      x: chosen.x,
      y: chosen.y,
      count: best.count,
      boundary: best.boundary,
      center: { x: center.x, y: center.y },
      corner: corners.length
        ? { x: corners[0].x, y: corners[0].y }
        : { x: center.x, y: center.y },
    };
  } catch {
    return target;
  }
};

const pickPullerName = (huntGroupNames = []) => {
  try {
    if (!Array.isArray(huntGroupNames) || !huntGroupNames.length)
      return character?.name || null;
    const sorted = huntGroupNames.filter(Boolean).slice().sort();
    return sorted[0] || character?.name || null;
  } catch {
    return character?.name || null;
  }
};

const getMonsterTargetingName = (name, preferredMtype = null) => {
  try {
    if (!name) return null;
    const entities = parent?.entities;
    if (!entities || !character) return null;

    let best = null;
    let bestDistance = Infinity;
    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster" || entity.dead) continue;
      if (entity.target !== name) continue;
      if (preferredMtype && entity.mtype !== preferredMtype) continue;

      const d = parent.distance?.(character, entity);
      const dist = Number.isFinite(d) ? d : Infinity;
      if (dist < bestDistance) {
        best = entity;
        bestDistance = dist;
      }
    }

    return best;
  } catch {
    return null;
  }
};

const isHuntGroupArrived = ({
  huntGroupNames = [],
  anchor,
  radius = 220,
} = {}) => {
  try {
    if (!anchor) return false;
    if (!Array.isArray(huntGroupNames) || !huntGroupNames.length) return true;

    for (const name of huntGroupNames) {
      const p = getPlayerEntitySafe(name);
      if (!p || p.rip) return false;
      if (p.map && character?.map && p.map !== character.map) return false;
      const d = distance?.(p, anchor);
      if (!Number.isFinite(d) || d > radius) return false;
    }

    return true;
  } catch {
    return false;
  }
};

const isValidHuntDestination = (dest) => {
  try {
    return (
      dest &&
      typeof dest === "object" &&
      typeof dest.map === "string" &&
      dest.map.trim() &&
      Number.isFinite(dest.x) &&
      Number.isFinite(dest.y)
    );
  } catch {
    return false;
  }
};

const normalizeHuntDestination = (huntDest, rallyPoint) => {
  if (isValidHuntDestination(huntDest))
    return {
      map: huntDest.map,
      x: Number(huntDest.x),
      y: Number(huntDest.y),
    };

  if (isValidHuntDestination(rallyPoint)) {
    return {
      map: rallyPoint.map,
      x: Number(rallyPoint.x),
      y: Number(rallyPoint.y),
    };
  }

  return null;
};

const isPriestBackupReady = ({
  huntGroupNames = [],
  anchor,
  radius = 420,
} = {}) => {
  try {
    const names = Array.isArray(huntGroupNames)
      ? huntGroupNames.filter(Boolean).slice()
      : [];

    if (!names.length) {
      const partyNames = Object.keys(parent?.party || {});
      for (const name of partyNames) {
        if (name) names.push(name);
      }
    }

    if (character?.name && !names.includes(character.name)) {
      names.push(character.name);
    }

    for (const name of names) {
      const p = getPlayerEntitySafe(name);
      if (!p || p.rip) continue;
      if (p.map && character?.map && p.map !== character.map) continue;

      const ctype = p?.ctype || p?.type || p?.class || null;
      if (ctype !== "priest") continue;

      if (!anchor) return true;
      const d = distance?.(p, anchor);
      if (Number.isFinite(d) && d <= radius) return true;
    }

    return false;
  } catch {
    return false;
  }
};

const maybeDrawAggroAsPuller = ({
  cfg,
  activeTarget,
  huntGroupNames = [],
} = {}) => {
  try {
    if (!activeTarget || activeTarget.dead) return false;
    if (activeTarget.target === character?.name) return false;

    const allySet = new Set(
      Array.isArray(huntGroupNames) ? huntGroupNames.filter(Boolean) : [],
    );
    if (!allySet.has(activeTarget.target)) return false;

    const tauntDef = G?.skills?.taunt;
    if (!tauntDef) return false;
    if (typeof is_on_cooldown === "function" && is_on_cooldown("taunt"))
      return false;

    const dist = normalizeNumber(distance?.(character, activeTarget), Infinity);
    const tauntRange = normalizeNumber(tauntDef?.range, 120);
    if (!Number.isFinite(dist) || dist > tauntRange) return false;

    const mpCost = normalizeNumber(tauntDef?.mp, 0);
    if (normalizeNumber(character?.mp, 0) < mpCost) return false;

    use_skill("taunt", activeTarget);
    dbg(
      cfg,
      `hunt_taunt:${activeTarget?.id || "unknown"}`,
      "puller taunting monster off ally",
      {
        targetId: activeTarget?.id,
        ally: activeTarget?.target,
      },
      650,
    );
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  isDeniedHuntSpot,
  isPreferredHuntSpot,
  isTargetDifficult,
  getMapBoundingBox,
  getMapSidePoint,
  pickHuntDestination,
  pickPullerName,
  getMonsterTargetingName,
  isHuntGroupArrived,
  isValidHuntDestination,
  normalizeHuntDestination,
  isPriestBackupReady,
  maybeDrawAggroAsPuller,
};
