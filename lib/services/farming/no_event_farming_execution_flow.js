// Farming no-event execution tail extraction.
// Purpose: own regroup handling + combat/support dispatch.

const handleNoEventExecutionTail = async ({
  cfg,
  st,
  assignment,
  localForcedHunt,
  worldEvent,
  effectiveIsTiny,
  effectiveIsHunt,
  effectiveIsTinyForKane,
  sharedTarget,
  huntRallyPoint,
  focusAllyName,
  huntGroupNames,
  shouldSkipMeleePorcupine,
  characterCtype,
  logOnce,
  getSafeSpot,
  moveToSafeSpot,
  emitTracker,
  runWorldEvent,
  runCrab,
  runMonsterhunt,
  getMonsterhuntTarget,
  runMageSupport,
  runPriestSupport,
  handleKaneCrabRoutine,
} = {}) => {
  if (!assignment || typeof assignment !== "object") {
    return { abortLoop: false };
  }

  if (assignment.mode === "regroup_tracker" && !localForcedHunt) {
    logOnce(
      `regroup:${assignment.taskKey || "none"}`,
      "regroup mode active",
      assignment.regroup || { dest: getSafeSpot() },
      30000,
    );
    moveToSafeSpot({ key: "regroup_tracker", priority: 3 });
    emitTracker();
    return { abortLoop: true };
  }

  if (worldEvent && effectiveIsHunt && !localForcedHunt) {
    await runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
  } else {
    if (effectiveIsTinyForKane) {
      const kaneBusy =
        typeof handleKaneCrabRoutine === "function" &&
        (await handleKaneCrabRoutine({
          cfg,
          st,
          mover: st.mover,
          effectiveIsTinyForKane,
        }));

      if (kaneBusy) {
        return { abortLoop: false };
      }
    }

    if (effectiveIsTiny) {
      await runCrab({ cfg, mover: st.mover });
    }

    if (effectiveIsHunt)
      await runMonsterhunt({
        cfg,
        targetOverride: sharedTarget,
        getTarget: getMonsterhuntTarget,
        mover: st.mover,
        rallyPoint: huntRallyPoint,
        focusAllyName,
        huntGroupNames,
        passiveOnly: shouldSkipMeleePorcupine,
      });
  }

  if (characterCtype === "mage") {
    await runMageSupport({ assigned: effectiveIsHunt });
  }

  if (characterCtype === "priest") {
    await runPriestSupport({ cfg });
  }

  return { abortLoop: false };
};

module.exports = {
  handleNoEventExecutionTail,
};
