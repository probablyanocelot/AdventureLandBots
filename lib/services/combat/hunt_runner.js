const { isBusyMoving } = await require("../state/flags.js");
const { getNearestMonsterOfType, engageMonster } =
  await require("./targeting.js");
const { now } = await require("../shared/index.js");
const { BlockerTracker } = await require("./blocker_tracker.js");
const {
  dbg,
  stopSmartMove,
  isNearPoint,
  normalizeNumber,
  normalizeFrequency,
  getPlayerEntitySafe,
  spreadFromPartyIfStacked,
} = await require("./combat_shared.js");
const { savePosition, getTeammateAtDestination } =
  await require("./position_store.js");
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

const pickHuntDestination = (target, cfg) => {
  try {
    if (!target || !G?.maps) return target;

    const difficult = isTargetDifficult(target, cfg);
    let spots = [];

    // 1. Add config-provided spots (preferred)
    const cfgSpots = cfg?.noEventFarming?.huntSpotsByTarget?.[target];
    if (Array.isArray(cfgSpots)) {
      for (const s of cfgSpots) {
        if (!s || !s.map || typeof s.x !== "number" || typeof s.y !== "number")
          continue;
        spots.push({
          map: s.map,
          x: s.x,
          y: s.y,
          count: undefined, // Do not set count when x,y are defined
          boundary: [],
          _cfgPreferred: true,
          _cfgX: s.x,
          _cfgY: s.y,
        });
      }
    }

    // 2. Add all G.maps spawns
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

    // 3. Prefer config spots in sort
    spots.sort((a, b) => {
      // Prefer config-provided spots
      const aCfg = a._cfgPreferred ? 1 : 0;
      const bCfg = b._cfgPreferred ? 1 : 0;
      if (aCfg !== bCfg) return bCfg - aCfg;

      // Then prefer preferred maps
      const aPreferred = isPreferredHuntSpot(target, a, cfg) ? 1 : 0;
      const bPreferred = isPreferredHuntSpot(target, b, cfg) ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;

      // If both have x,y from config, skip count comparison
      const aHasCfgXY =
        a._cfgPreferred &&
        typeof a._cfgX === "number" &&
        typeof a._cfgY === "number";
      const bHasCfgXY =
        b._cfgPreferred &&
        typeof b._cfgX === "number" &&
        typeof b._cfgY === "number";
      if (!(aHasCfgXY && bHasCfgXY)) {
        // Only consider count if at least one is not a config x,y spot
        if (a.count !== b.count) {
          return difficult ? a.count - b.count : b.count - a.count;
        }
      }

      // Then by same map
      const aSameMap = a.map === character?.map ? 1 : 0;
      const bSameMap = b.map === character?.map ? 1 : 0;
      if (aSameMap !== bSameMap) return bSameMap - aSameMap;

      // Then by distance
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

    // Debug logging for troubleshooting hunt destination selection
    if (
      typeof console !== "undefined" &&
      console.log &&
      cfg.debug.pickHuntDestination
    ) {
      const corners = getBoundaryCorners(best.boundary);
      const center = getBoundaryCenter(best.boundary) || best;
      const isStrong = isTargetDifficult(target, cfg);
      console.log("[pickHuntDestination]", {
        target,
        best,
        center,
        corners,
        isStrong,
        boundary: best.boundary,
        configSpot: best._cfgPreferred || false,
      });
    }

    // If config spot, use exact coordinate from config (user anchor point), do not remap to spawn corners.
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

    // Use center for weak monsters, corner for strong monsters
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
    if (!anchor || !Array.isArray(huntGroupNames) || !huntGroupNames.length)
      return false;

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

const getDefinitionStats = (mtype) => {
  try {
    const def = mtype && G?.monsters?.[mtype];
    if (!def) return null;
    return {
      source: "definition",
      hp: normalizeNumber(def.hp, 0),
      attack: normalizeNumber(def.attack, 0),
      armor: normalizeNumber(def.armor || def.resistance, 0),
      frequency: normalizeFrequency(def.frequency || def.attack_speed || 1),
    };
  } catch {
    return null;
  }
};

const getLiveStats = (monster) => {
  try {
    if (!monster) return null;
    return {
      source: "live",
      hp: normalizeNumber(monster.max_hp || monster.hp, 0),
      attack: normalizeNumber(monster.attack, 0),
      armor: normalizeNumber(monster.armor || monster.resistance, 0),
      frequency: normalizeFrequency(
        monster.frequency || monster.attack_speed || 1,
      ),
      level: normalizeNumber(monster.level, null),
    };
  } catch {
    return null;
  }
};

const estimateCombatOutcome = ({ monster, mtype } = {}) => {
  const picked = getLiveStats(monster) || getDefinitionStats(mtype);
  if (!picked) return null;

  const charAttack = Math.max(1, normalizeNumber(character.attack, 1));
  const charArmor = Math.max(0, normalizeNumber(character.armor, 0));
  const charHpPool = Math.max(
    1,
    normalizeNumber(character.max_hp || character.hp, 1),
  );
  const charFreq = normalizeFrequency(character.frequency || 1);

  const targetHp = Math.max(1, picked.hp || 1);
  const targetAttack = Math.max(0, picked.attack || 0);
  const targetArmor = Math.max(0, picked.armor || 0);
  const targetFreq = normalizeFrequency(picked.frequency || 1);

  const damageToMonster = Math.max(1, charAttack - targetArmor);
  const hitsToKill = Math.ceil(targetHp / damageToMonster);
  const timeToKillMs = Math.ceil((hitsToKill / charFreq) * 1000);

  const damageToCharacter =
    targetAttack > 0 ? Math.max(1, targetAttack - charArmor) : 0;
  const hitsToDie = damageToCharacter
    ? Math.ceil(charHpPool / damageToCharacter)
    : Infinity;
  const timeToDieMs =
    hitsToDie === Infinity
      ? Infinity
      : Math.ceil((hitsToDie / targetFreq) * 1000);

  return {
    ...picked,
    damageToMonster,
    damageToCharacter,
    hitsToKill,
    hitsToDie,
    timeToKillMs,
    timeToDieMs,
  };
};

const isDangerousOutcome = (outcome, cfg) => {
  if (!outcome) return false;
  if (!Number.isFinite(outcome.timeToKillMs)) return true;
  if (outcome.hitsToDie !== Infinity && outcome.hitsToDie <= 1) return true;

  const nf = cfg?.noEventFarming || {};
  const minHitBuffer = normalizeNumber(nf.minHuntHitsToDie, 2);
  const marginMs =
    outcome.timeToDieMs === Infinity
      ? Infinity
      : outcome.timeToDieMs - outcome.timeToKillMs;

  if (
    outcome.hitsToDie !== Infinity &&
    outcome.hitsToDie <= minHitBuffer &&
    marginMs < 0
  )
    return true;

  return marginMs < -1200;
};

const isDebugEnabled = (cfg = {}) => {
  try {
    return Boolean(
      cfg?.debug?.combat ||
      globalThis?.AL_BOTS_CONFIG?.debug?.combat ||
      globalThis?.AL_BOTS_DEBUG_COMBAT,
    );
  } catch {
    return false;
  }
};

const broadcastHuntDanger = ({ cfg, target, estimate }) => {
  const nowMs = now();
  if (cfg._lastHuntHelpRequest && nowMs - cfg._lastHuntHelpRequest < 5000)
    return;
  cfg._lastHuntHelpRequest = nowMs;

  try {
    const party = parent?.party;
    if (!party) return;
    for (const name of Object.keys(party)) {
      if (name === character.name) continue;
      try {
        send_cm(name, {
          cmd: "farm:hunt_danger",
          target,
          estimate,
          from: character.name,
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
};

const runCrab = ({ cfg, mover } = {}) => {
  if (isBusyMoving()) return;
  const nowMs = now();
  if (cfg._lastTinyMove && nowMs - cfg._lastTinyMove < 5000) return;

  try {
    const target = getNearestMonsterOfType("crab");
    if (target) {
      engageMonster(target);
      return;
    }
  } catch {
    // ignore
  }

  cfg._lastTinyMove = nowMs;
  if (mover) {
    mover.request({ dest: "crab", key: "crab", priority: 1 });
  } else {
    try {
      smart_move("crab");
    } catch {
      // ignore
    }
  }
};

const runMonsterhunt = ({
  cfg,
  targetOverride,
  getTarget,
  mover,
  rallyPoint,
  focusAllyName,
  huntGroupNames,
  passiveOnly = false,
  trackerEnabled = null,
} = {}) => {
  const tracker =
    trackerEnabled !== false
      ? new BlockerTracker({ target: null, character: character?.name })
      : null;
  try {
    try {
      const nowMs = now();
      const lastAt = Number(cfg?._lastOwnPositionSaveAt || 0);
      const movedSinceSave = normalizeNumber(
        distance?.(character, cfg?._lastOwnPositionSavedPoint),
        Infinity,
      );
      const shouldSave =
        !lastAt ||
        nowMs - lastAt >= 10000 ||
        !Number.isFinite(movedSinceSave) ||
        movedSinceSave >= 60 ||
        cfg?._lastOwnPositionSavedMap !== character?.map;

      if (shouldSave) {
        savePosition();
        cfg._lastOwnPositionSaveAt = nowMs;
        cfg._lastOwnPositionSavedMap = character?.map;
        cfg._lastOwnPositionSavedPoint = {
          x: Number(character?.x || 0),
          y: Number(character?.y || 0),
        };
      }
    } catch {
      // ignore
    }

    const target =
      typeof targetOverride === "string"
        ? targetOverride
        : typeof getTarget === "function"
          ? getTarget()
          : null;
    if (!target) {
      if (tracker) {
        tracker.add({
          reason: "no_target_resolved",
          priority: "critical",
          message: "no target resolved",
        });
      }
      return;
    }
    if (tracker) {
      tracker.target = target;
    }

    if (spreadFromPartyIfStacked({ cfg, huntGroupNames })) {
      if (tracker) {
        tracker.add({
          reason: "party_stacked_spreading",
          priority: "high",
          message: "party stacked: spreading from group",
        });
      }
      return;
    }

    const huntDest = pickHuntDestination(target, cfg);
    const cornerDest =
      typeof huntDest === "object" && Number.isFinite(huntDest?.x)
        ? {
            map: huntDest.map,
            x: Number(huntDest.x),
            y: Number(huntDest.y),
          }
        : null;
    const destinationAnchor = cornerDest;
    const huntArrivalRadius = Math.max(
      55,
      normalizeNumber(cfg?.noEventFarming?.huntArrivalRadius, 85),
    );
    const nearDestinationAnchor = Boolean(
      destinationAnchor && isNearPoint(destinationAnchor, huntArrivalRadius),
    );
    const teammateAtDestination = nearDestinationAnchor
      ? null
      : getTeammateAtDestination({
          huntGroupNames,
          destination: destinationAnchor,
        });
    const huntMoveDest = teammateAtDestination
      ? {
          map: teammateAtDestination.map,
          x: teammateAtDestination.x,
          y: teammateAtDestination.y,
        }
      : huntDest;
    const pullerName = pickPullerName(huntGroupNames);
    const iAmPuller = pullerName === character?.name;
    const hardByDefinition = isTargetDifficult(target, cfg);
    const priestPresent = isPriestBackupReady({
      huntGroupNames,
      anchor: null,
    });
    const disableHuntBlockers = cfg?.noEventFarming?.disableHuntBlockers;
    const requirePriestForWarriorHardPull =
      cfg?.noEventFarming?.requirePriestForWarriorHardPull !== false;
    const priestRequiredForWarriorPull =
      !disableHuntBlockers &&
      requirePriestForWarriorHardPull &&
      iAmPuller &&
      character?.ctype === "warrior";

    const nowMs = now();

    if (
      !disableHuntBlockers &&
      hardByDefinition &&
      priestRequiredForWarriorPull &&
      !priestPresent
    ) {
      if (tracker) {
        tracker.add({
          reason: "warrior_puller_no_priest",
          priority: "critical",
          debugKey: `hunt_wait_priest_puller:${target}`,
          message: "warrior pull blocked: waiting for priest presence",
          data: { target, huntGroupNames },
        });
      }
      dbg(
        cfg,
        `hunt_wait_priest_puller:${target}`,
        "warrior pull blocked: waiting for priest presence",
        {
          target,
          huntGroupNames,
        },
        2000,
      );

      if (rallyPoint && !isNearPoint(rallyPoint, 90)) {
        if (mover) {
          mover.request({
            dest: { map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y },
            key: `hunt:rally_wait_priest:${target}`,
            priority: 2,
            cooldownMs: 2500,
          });
        } else {
          try {
            smart_move({
              map: rallyPoint.map,
              x: rallyPoint.x,
              y: rallyPoint.y,
            });
          } catch {
            // ignore
          }
        }
      }

      return;
    }

    if (!passiveOnly) {
      const focusMonster =
        getMonsterTargetingName(focusAllyName, target) ||
        getMonsterTargetingName(focusAllyName);
      if (focusMonster) {
        if (smart?.moving) {
          stopSmartMove({
            cfg,
            reason: "hunt_assist_target_visible",
            data: { target, focusAllyName, id: focusMonster?.id },
          });
        }
        engageMonster(focusMonster);
        return;
      }
    }

    // Pre-emptive estimate using static data (may be inaccurate if monster leveled).
    const defEstimate = estimateCombatOutcome({ mtype: target });
    if (defEstimate) {
      cfg._lastHuntEstimate = { target, ...defEstimate, at: nowMs };
      const dangerousByDefinition = isDangerousOutcome(defEstimate, cfg);
      // For hard hunts, do not block; coordinate pull + same-target focus instead.
      if (dangerousByDefinition) {
        cfg._lastHuntDanger = { target, estimate: defEstimate, at: nowMs };
        dbg(cfg, `hunt_danger:def:${target}`, "hunt danger by definition", {
          target,
          hardByDefinition,
          hitsToDie: defEstimate.hitsToDie,
          hitsToKill: defEstimate.hitsToKill,
        });
        broadcastHuntDanger({ cfg, target, estimate: defEstimate });
        if (!hardByDefinition) return;
      }
    }

    const dangerRecent =
      cfg._lastHuntDanger &&
      cfg._lastHuntDanger.target === target &&
      nowMs - cfg._lastHuntDanger.at < 30000;

    // Hard hunts should continue in coordinated mode even in danger windows.
    if (!disableHuntBlockers && dangerRecent && !hardByDefinition) {
      dbg(
        cfg,
        `hunt_danger:recent:${target}`,
        "hunt paused: recent danger window",
        { target },
        2500,
      );
      return;
    }

    // Throttle path requests to avoid spamming smart_move/mover.
    const sameTarget = cfg._lastHuntMoveTarget === target;
    const destMap =
      typeof huntMoveDest === "object" && huntMoveDest?.map
        ? huntMoveDest.map
        : character?.map;
    const sameMap = cfg._lastHuntMoveMap === destMap;
    const recentWindow = sameMap ? 20000 : 8000;
    const sameTargetRecently =
      sameTarget && nowMs - (cfg._lastHuntMove || 0) < recentWindow;

    const monster = getNearestMonsterOfType(target);
    const pullerTargetMonster =
      getMonsterTargetingName(pullerName, target) ||
      getMonsterTargetingName(pullerName);

    if (smart?.moving && nearDestinationAnchor) {
      stopSmartMove({
        cfg,
        reason: "hunt_arrival_radius",
        data: { target, destinationAnchor },
      });
    }

    // We reached/arrived enough to see the target pack: stop pathing and engage.
    if (monster && smart?.moving) {
      stopSmartMove({ cfg, reason: "hunt_target_visible", data: { target } });
    }

    // If already moving toward something (or gathering), don't queue more.
    if (isBusyMoving()) {
      if (tracker) {
        tracker.add({
          reason: "busy_moving_or_gathering",
          priority: "high",
          message: "character busy moving or gathering",
          data: {
            smart_moving: smart?.moving,
            gathering: character?.c?.fishing || character?.c?.mining,
          },
        });
      }
      return;
    }

    if (
      !monster &&
      rallyPoint &&
      !nearDestinationAnchor &&
      !isNearPoint(rallyPoint, 90)
    ) {
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
      } else {
        try {
          smart_move({ map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y });
          dbg(
            cfg,
            `hunt_rally:${target}`,
            "queued hunt rally move",
            { target, rallyPoint, via: "smart_move" },
            1200,
          );
        } catch {
          // ignore
        }
      }
      return;
    }

    if (!sameTargetRecently) {
      cfg._lastHuntMove = nowMs;
      cfg._lastHuntMoveTarget = target;
      cfg._lastHuntMoveMap = destMap;

      if (mover) {
        const requested = mover.request({
          dest: huntMoveDest,
          key: `hunt:${target}`,
          priority: 2,
        });
        dbg(
          cfg,
          `hunt_move:${target}`,
          "queued hunt move",
          {
            target,
            huntDest: huntMoveDest,
            via: "mover",
            requested,
            teammateAtDestination: teammateAtDestination?.name || null,
          },
          1500,
        );
      } else {
        try {
          smart_move(huntMoveDest);
          dbg(
            cfg,
            `hunt_move:${target}`,
            "queued hunt move",
            {
              target,
              huntDest: huntMoveDest,
              via: "smart_move",
              teammateAtDestination: teammateAtDestination?.name || null,
            },
            1500,
          );
        } catch {
          // ignore
        }
      }
    }

    if (!monster && !pullerTargetMonster) {
      if (tracker) {
        tracker.add({
          reason: "no_visible_monster",
          priority: "medium",
          message: "no visible monster or puller target",
          data: { target },
        });
      }
      return;
    }

    if (passiveOnly) {
      if (tracker) {
        tracker.add({
          reason: "passive_mode_enabled",
          priority: "high",
          message: "hunt passive mode: positioned without engaging",
          data: { target, character: character?.name },
        });
      }
      dbg(
        cfg,
        `hunt_passive:${target}:${character?.name || "self"}`,
        "hunt passive mode: positioned without engaging",
        {
          target,
          huntMoveDest,
          monsterVisible: Boolean(monster),
          pullerTargetVisible: Boolean(pullerTargetMonster),
        },
        1200,
      );
      return;
    }

    const targetAttack = normalizeNumber(
      monster?.attack,
      normalizeNumber(G?.monsters?.[target]?.attack, 0),
    );
    const lowAttackThreshold = normalizeNumber(
      cfg?.noEventFarming?.lowAttack,
      0,
    );
    const groupArrivalRadius = Math.max(
      80,
      normalizeNumber(cfg?.noEventFarming?.huntGroupArrivalRadius, 220),
    );
    const groupArrived = isHuntGroupArrived({
      huntGroupNames,
      anchor: monster || pullerTargetMonster,
      radius: groupArrivalRadius,
    });

    const isHardTarget = hardByDefinition || targetAttack > lowAttackThreshold;
    const priestBackupRadius = Math.max(
      120,
      normalizeNumber(cfg?.noEventFarming?.dangerPriestBackupRadius, 420),
    );
    const priestBackupReady = isPriestBackupReady({
      huntGroupNames,
      anchor: monster || pullerTargetMonster || cornerDest || rallyPoint,
      radius: priestBackupRadius,
    });
    const priestBackupRequiredForEngage = disableHuntBlockers
      ? false
      : character?.ctype === "warrior"
        ? requirePriestForWarriorHardPull
        : true;

    const warriorHardPullBlocked =
      !disableHuntBlockers &&
      isHardTarget &&
      priestRequiredForWarriorPull &&
      !priestPresent;

    if (warriorHardPullBlocked) {
      if (tracker) {
        tracker.add({
          reason: "warrior_hard_pull_no_priest",
          priority: "critical",
          debugKey: `hunt_wait_priest_hard:${target}`,
          message: "warrior hard pull blocked: priest not present",
          data: { target, huntGroupNames, priestBackupReady },
        });
      }
      dbg(
        cfg,
        `hunt_wait_priest_hard:${target}`,
        "warrior hard pull blocked: priest not present",
        {
          target,
          huntGroupNames,
          priestBackupReady,
        },
        1800,
      );
      return;
    }

    if (
      isHardTarget &&
      (!groupArrived || (priestBackupRequiredForEngage && !priestBackupReady))
    ) {
      if (tracker) {
        tracker.add({
          reason: "hard_target_backup_wait",
          priority: "high",
          debugKey: `hunt_wait_backup:${target}`,
          message: "hard target: waiting for backup before engage",
          data: {
            target,
            groupArrived,
            priestBackupReady,
            priestBackupRequiredForEngage,
            priestBackupRadius,
            huntGroupNames,
          },
        });
      }
      dbg(
        cfg,
        `hunt_wait_backup:${target}`,
        "hard target: waiting for backup before engage",
        {
          target,
          groupArrived,
          priestBackupReady,
          priestBackupRequiredForEngage,
          priestBackupRadius,
          huntGroupNames,
        },
        1400,
      );

      if (rallyPoint && !isNearPoint(rallyPoint, 90)) {
        if (mover) {
          mover.request({
            dest: { map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y },
            key: `hunt:rally_wait:${target}`,
            priority: 2,
            cooldownMs: 2000,
          });
        } else {
          try {
            smart_move({
              map: rallyPoint.map,
              x: rallyPoint.x,
              y: rallyPoint.y,
            });
          } catch {
            // ignore
          }
        }
      }

      return;
    }

    if (isHardTarget) {
      const activeTarget = pullerTargetMonster || monster;

      if (!iAmPuller) {
        if (activeTarget) {
          if (activeTarget?.target === character?.name) {
            if (tracker) {
              tracker.add({
                reason: "non_puller_has_aggro",
                priority: "high",
                debugKey: `hunt_aggro_non_tank:${target}`,
                message:
                  "non-puller has aggro: repositioning and pausing engage",
                data: { target, id: activeTarget?.id, pullerName },
              });
            }
            dbg(
              cfg,
              `hunt_aggro_non_tank:${target}`,
              "non-puller has aggro: repositioning and pausing engage",
              {
                target,
                id: activeTarget?.id,
                pullerName,
              },
              700,
            );

            if (cornerDest && !isNearPoint(cornerDest, 35)) {
              if (typeof xmove === "function")
                xmove(cornerDest.x, cornerDest.y);
            } else if (rallyPoint && !isNearPoint(rallyPoint, 80)) {
              if (typeof xmove === "function")
                xmove(rallyPoint.x, rallyPoint.y);
            }
            return;
          }

          if (
            cornerDest &&
            activeTarget?.target === pullerName &&
            !isNearPoint(cornerDest, 35) &&
            typeof xmove === "function"
          ) {
            xmove(cornerDest.x, cornerDest.y);
          }

          if (activeTarget?.target === pullerName) {
            engageMonster(activeTarget, {
              skillOptions: {
                disableMultiTarget: true,
              },
            });
          }
          return;
        }

        if (cornerDest && !isNearPoint(cornerDest, 35)) {
          if (typeof xmove === "function") xmove(cornerDest.x, cornerDest.y);
        }
        return;
      }

      if (activeTarget) {
        if (activeTarget?.target && activeTarget.target !== character?.name) {
          maybeDrawAggroAsPuller({ cfg, activeTarget, huntGroupNames });
        }

        if (
          cornerDest &&
          activeTarget?.target === character?.name &&
          !isNearPoint(cornerDest, 40)
        ) {
          if (typeof xmove === "function") xmove(cornerDest.x, cornerDest.y);
        }

        engageMonster(activeTarget, {
          skillOptions: {
            disableMultiTarget: true,
          },
        });
        return;
      }
    }

    dbg(
      cfg,
      `hunt_engage:${target}`,
      "engaging hunt target",
      { target, id: monster?.id },
      1000,
    );

    const liveEstimate = estimateCombatOutcome({ monster, mtype: target });
    if (liveEstimate) {
      cfg._lastHuntEstimate = { target, ...liveEstimate, at: now() };

      if (isDangerousOutcome(liveEstimate, cfg)) {
        cfg._lastHuntDanger = { target, estimate: liveEstimate, at: now() };
        dbg(cfg, `hunt_danger:live:${target}`, "hunt dangerous live estimate", {
          target,
          hardByDefinition,
          id: monster?.id,
          hitsToDie: liveEstimate.hitsToDie,
          hitsToKill: liveEstimate.hitsToKill,
        });
        broadcastHuntDanger({ cfg, target, estimate: liveEstimate });
        if (!hardByDefinition) return;
      }
    }

    engageMonster(monster, {
      skillOptions: {
        disableMultiTarget: isHardTarget,
      },
    });
  } catch {
    // ignore
  } finally {
    // Emit consolidated blocker summary if tracking enabled and blockers recorded.
    const blockerTrackingEnabled =
      cfg?.debug?.blockerTracking ??
      cfg?.noEventFarming?.blockerTracking?.enabled ??
      true;

    if (tracker && blockerTrackingEnabled) {
      const summary = tracker.emit((msg) => {
        try {
          if (typeof sendTelemetryMessage === "function") {
            sendTelemetryMessage(msg);
          }
        } catch {
          // ignore telemetry errors
        }
      });
      if (summary && isDebugEnabled(cfg)) {
        try {
          dbg(
            cfg,
            `hunt_blocker_summary:${summary.primaryReason}`,
            `hunt blocked: ${summary.primaryReason} (${summary.totalBlockers} total blockers)`,
            {
              reason: summary.primaryReason,
              priority: summary.primaryPriority,
              blockers: summary.blockerSummary,
            },
            800,
          );
        } catch {
          // ignore
        }
      }
    }
  }
};

module.exports = {
  runCrab,
  runMonsterhunt,
};
