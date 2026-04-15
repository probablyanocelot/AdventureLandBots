const { isBusyMoving } = await require("../state/flags.js");
const { getNearestMonsterOfType, engageMonster } =
  await require("./targeting.js");
const { isInJoinableEvent: isInCombatJoinableEvent } =
  await require("./event_combat_runtime.js");
const { now } = await require("../shared/index.js");
const { BlockerTracker } = await require("./blocker_tracker.js");
const {
  dbg,
  stopSmartMove,
  isNearPoint,
  normalizeNumber,
  spreadFromPartyIfStacked,
} = await require("./combat_shared.js");
const { savePosition, getTeammateAtDestination } =
  await require("./position_store.js");
const { getMonsterTargetingName } = await require("./hunt_support.js");
const { resolveHuntTarget, maybeAdvanceMvampireSweep } =
  await require("./hunt_target.js");
const { queueHuntRally, queueHuntMove } = await require("./hunt_route.js");
const { resolveHuntMoveState } = await require("./hunt_move.js");
const { processHuntEngagement } = await require("./hunt_engage.js");
const {
  estimateCombatOutcome,
  isDangerousOutcome,
  isDebugEnabled,
  broadcastHuntDanger,
} = await require("./hunt_estimate.js");

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
  st,
  targetOverride,
  getTarget,
  mover,
  rallyPoint,
  focusAllyName,
  huntGroupNames,
  passiveOnly = false,
  trackerEnabled = null,
} = {}) => {
  const eventCombatEnabled = Boolean(cfg?.eventCombat?.enabled);
  if (eventCombatEnabled && isInCombatJoinableEvent()) {
    if (cfg?.debug?.combat) {
      dbg(
        cfg,
        "hunt_skip:event_combat_active",
        "skipping monsterhunt while event-combat is active",
        {
          in: character?.in,
          map: character?.map,
        },
      );
    }
    return;
  }

  const disableHuntBlockers = cfg?.noEventFarming?.disableHuntBlockers === true;
  const tracker =
    trackerEnabled !== false && !disableHuntBlockers
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

    const nowMs = now();

    const {
      target: resolvedTarget,
      normalizedHuntDest,
      destinationAnchor,
      nearDestinationAnchor,
    } = resolveHuntTarget({
      cfg,
      st,
      targetOverride,
      getTarget,
      rallyPoint,
      nowMs,
    });

    target = resolvedTarget;

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

    if (
      !disableHuntBlockers &&
      spreadFromPartyIfStacked({ cfg, huntGroupNames })
    ) {
      if (tracker) {
        tracker.add({
          reason: "party_stacked_spreading",
          priority: "high",
          message: "party stacked: spreading from group",
        });
      }
      return;
    }

    const cornerDest = normalizedHuntDest;

    if (
      maybeAdvanceMvampireSweep({
        cfg,
        st,
        destinationAnchor,
        nearDestinationAnchor,
        nowMs,
      })
    ) {
      return;
    }

    const isPorcupineTarget =
      typeof target === "string" && target.toLowerCase() === "porcupine";

    const {
      teammateAtDestination,
      huntMoveDest,
      pullerName,
      iAmPuller,
      hardByDefinition,
      priestPresent,
      priestRequiredForWarriorPull,
    } = resolveHuntMoveState({
      target,
      cfg,
      huntGroupNames,
      destinationAnchor,
      rallyPoint,
      isPorcupineTarget,
      getTeammateAtDestination,
      disableHuntBlockers,
    });

    // nowMs is already set earlier for this cycle.

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
      if (queueHuntRally({ mover, rallyPoint, target, cfg })) {
        return;
      }
      return;
    }

    const requestedHuntMove = queueHuntMove({
      mover,
      huntMoveDest,
      target,
      cfg,
      destMap,
      sameTargetRecently,
      nowMs,
    });

    if (requestedHuntMove) {
      dbg(
        cfg,
        `hunt_move:${target}`,
        "queued hunt move",
        {
          target,
          huntDest: huntMoveDest,
          via: mover ? "mover" : "smart_move",
          requested: requestedHuntMove,
          teammateAtDestination: teammateAtDestination?.name || null,
        },
        1500,
      );
    }

    if (
      processHuntEngagement({
        cfg,
        target,
        nowMs,
        tracker,
        passiveOnly,
        mover,
        rallyPoint,
        focusAllyName,
        huntGroupNames,
        huntMoveDest,
        monster,
        pullerTargetMonster,
        iAmPuller,
        hardByDefinition,
        priestPresent,
        priestRequiredForWarriorPull,
        disableHuntBlockers,
        cornerDest,
        nearDestinationAnchor,
      })
    ) {
      return;
    }
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
