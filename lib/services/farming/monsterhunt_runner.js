// Farming owns both crab and monsterhunt runtime behavior.
const { isBusyMoving } = await require("../state/flags.js");
const {
  getNearestMonsterOfType,
  engageMonster,
  isInJoinableEvent: isInCombatJoinableEvent,
  BlockerTracker,
  dbg,
  stopSmartMove,
  isNearPoint,
  normalizeNumber,
  spreadFromPartyIfStacked,
  savePosition,
  getTeammateAtDestination,
  getMonsterTargetingName,
  resolveHuntTarget,
  maybeAdvanceMvampireSweep,
  queueHuntRally,
  queueHuntMove,
  resolveHuntMoveState,
  processHuntEngagement,
  estimateCombatOutcome,
  isDangerousOutcome,
  isDebugEnabled,
  broadcastHuntDanger,
} = await require("../combat/index.js");
const { now } = await require("../shared/index.js");

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

  const disableHuntBlockers = cfg?.farming?.disableHuntBlockers === true;
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

    const defEstimate = estimateCombatOutcome({ mtype: target });
    if (defEstimate) {
      cfg._lastHuntEstimate = { target, ...defEstimate, at: nowMs };
      const dangerousByDefinition = isDangerousOutcome(defEstimate, cfg);
      if (dangerousByDefinition) {
        cfg._lastHuntDanger = { target, estimate: defEstimate, at: nowMs };
        dbg(cfg, `hunt_danger:def:${target}`, "hunt danger by definition", {
          target,
        });
      }
    }

    const monster = getNearestMonsterOfType(target);
    if (!monster) {
      if (tracker) {
        tracker.add({
          reason: "no_monster_visible",
          priority: "critical",
          message: "no monster visible",
          data: { target },
        });
      }
      return;
    }

    const targetName = getMonsterTargetingName({ target, monster });
    if (!targetName) return;

    const requestedHuntMove = queueHuntMove({
      monster,
      target,
      huntMoveDest,
      character,
      cfg,
      st,
      nowMs,
      targetName,
      isPorcupineTarget,
      teammateAtDestination,
    });

    if (requestedHuntMove) {
      queueHuntRally({
        target,
        huntDest: huntMoveDest,
        via: mover ? "mover" : "smart_move",
        requested: requestedHuntMove,
        teammateAtDestination: teammateAtDestination?.name || null,
      });
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
    const blockerTrackingEnabled =
      cfg?.debug?.blockerTracking ??
      cfg?.farming?.blockerTracking?.enabled ??
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
