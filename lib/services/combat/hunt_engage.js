const { dbg, stopSmartMove, isNearPoint, normalizeNumber } =
  await require("./combat_shared.js");
const { isBusyMoving } = await require("../state/flags.js");
const {
  getMonsterTargetingName,
  maybeDrawAggroAsPuller,
  isHuntGroupArrived,
  isPriestBackupReady,
} = await require("./hunt_support.js");
const { estimateCombatOutcome, isDangerousOutcome, broadcastHuntDanger } =
  await require("./hunt_estimate.js");
const { engageMonster } = await require("./targeting.js");

const processHuntEngagement = ({
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
}) => {
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
      return true;
    }
  }

  const defEstimate = estimateCombatOutcome({ mtype: target });
  if (defEstimate) {
    cfg._lastHuntEstimate = { target, ...defEstimate, at: nowMs };
    const dangerousByDefinition = isDangerousOutcome(defEstimate, cfg);
    if (dangerousByDefinition) {
      cfg._lastHuntDanger = { target, estimate: defEstimate, at: nowMs };
      dbg(cfg, `hunt_danger:def:${target}`, "hunt danger by definition", {
        target,
        hardByDefinition,
        hitsToDie: defEstimate.hitsToDie,
        hitsToKill: defEstimate.hitsToKill,
      });
      broadcastHuntDanger({ cfg, target, estimate: defEstimate });
      if (!hardByDefinition) return true;
    }
  }

  const dangerRecent =
    cfg._lastHuntDanger &&
    cfg._lastHuntDanger.target === target &&
    nowMs - cfg._lastHuntDanger.at < 30000;
  if (!disableHuntBlockers && dangerRecent && !hardByDefinition) {
    dbg(
      cfg,
      `hunt_danger:recent:${target}`,
      "hunt paused: recent danger window",
      { target },
      2500,
    );
    return true;
  }

  const sameTarget = cfg._lastHuntMoveTarget === target;
  const destMap =
    typeof huntMoveDest === "object" && huntMoveDest?.map
      ? huntMoveDest.map
      : character?.map;
  const sameMap = cfg._lastHuntMoveMap === destMap;
  const recentWindow = sameMap ? 20000 : 8000;
  const sameTargetRecently =
    sameTarget && nowMs - (cfg._lastHuntMove || 0) < recentWindow;

  if (monster && smart?.moving) {
    stopSmartMove({ cfg, reason: "hunt_target_visible", data: { target } });
  }

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
    return true;
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
    return true;
  }

  if (!sameTargetRecently && huntMoveDest) {
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

    dbg(
      cfg,
      `hunt_move:${target}`,
      "queued hunt move",
      {
        target,
        huntDest: huntMoveDest,
        via: mover ? "mover" : "smart_move",
        requested,
      },
      1500,
    );
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
    return true;
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
    return true;
  }

  const targetAttack = normalizeNumber(
    monster?.attack,
    normalizeNumber(G?.monsters?.[target]?.attack, 0),
  );
  const lowAttackThreshold = normalizeNumber(cfg?.farming?.lowAttack, 0);
  const groupArrivalRadius = Math.max(
    80,
    normalizeNumber(cfg?.farming?.huntGroupArrivalRadius, 220),
  );
  const groupArrived = isHuntGroupArrived({
    huntGroupNames,
    anchor: monster || pullerTargetMonster,
    radius: groupArrivalRadius,
  });

  const isHardTarget = hardByDefinition || targetAttack > lowAttackThreshold;
  const priestBackupRadius = Math.max(
    120,
    normalizeNumber(cfg?.farming?.dangerPriestBackupRadius, 420),
  );
  const priestBackupReady = isPriestBackupReady({
    huntGroupNames,
    anchor: monster || pullerTargetMonster || cornerDest || rallyPoint,
    radius: priestBackupRadius,
  });
  const priestBackupRequiredForEngage = disableHuntBlockers
    ? false
    : character?.ctype === "warrior"
      ? priestRequiredForWarriorPull
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
    return true;
  }

  if (
    !disableHuntBlockers &&
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
          smart_move({ map: rallyPoint.map, x: rallyPoint.x, y: rallyPoint.y });
        } catch {
          // ignore
        }
      }
    }
    return true;
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
              message: "non-puller has aggro: repositioning and pausing engage",
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
            if (typeof xmove === "function") xmove(cornerDest.x, cornerDest.y);
          } else if (rallyPoint && !isNearPoint(rallyPoint, 80)) {
            if (typeof xmove === "function") xmove(rallyPoint.x, rallyPoint.y);
          }
          return true;
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
        return true;
      }

      if (cornerDest && !isNearPoint(cornerDest, 35)) {
        if (typeof xmove === "function") xmove(cornerDest.x, cornerDest.y);
      }
      return true;
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
      return true;
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
    cfg._lastHuntEstimate = { target, ...liveEstimate, at: nowMs };
    if (isDangerousOutcome(liveEstimate, cfg)) {
      cfg._lastHuntDanger = { target, estimate: liveEstimate, at: nowMs };
      dbg(cfg, `hunt_danger:live:${target}`, "hunt dangerous live estimate", {
        target,
        hardByDefinition,
        id: monster?.id,
        hitsToDie: liveEstimate.hitsToDie,
        hitsToKill: liveEstimate.hitsToKill,
      });
      broadcastHuntDanger({ cfg, target, estimate: liveEstimate });
      if (!hardByDefinition) return true;
    }
  }

  engageMonster(monster, {
    skillOptions: {
      disableMultiTarget: isHardTarget,
    },
  });
  return true;
};

module.exports = {
  processHuntEngagement,
};
