const { isPorcupineTarget, isMeleeCtype } =
  await require("./runtime_helpers.js");
const { handleFarmingExecutionTail } =
  await require("./farming_execution_flow.js");

const buildFarmingAssignment = ({ target, modePrefix } = {}) => {
  return {
    mode: `${modePrefix}:${target}`,
    huntTarget: target,
    monsterhunt: [],
    crab: [],
    worldEvent: null,
    huntRallyPoint: null,
    focusAllyName: null,
    taskKey: `mode:${modePrefix}:${target}|hunt:${target}|event:-`,
  };
};

const runFarmingAssignment = async ({
  cfg,
  st,
  assignment,
  localForcedHunt = false,
  worldEvent = null,
  effectiveIsTiny = false,
  effectiveIsTinyForKane = false,
  effectiveIsHunt = false,
  sharedTarget = null,
  huntRallyPoint = null,
  focusAllyName = null,
  huntGroupNames = [],
  shouldSkipMeleePorcupine = false,
  shouldHoldCrabForHighestLuckRanger = false,
  characterCtype = character?.ctype,
  logOnce,
  getSafeSpot,
  moveToSafeSpot,
  emitTracker,
  runWorldEvent,
  runCrab,
  runFarmingHunt,
  getMonsterhuntTarget,
  runMageSupport,
  runPriestSupport,
  handleKaneCrabRoutine,
} = {}) => {
  return handleFarmingExecutionTail({
    cfg,
    st,
    assignment,
    localForcedHunt,
    worldEvent,
    effectiveIsTiny,
    effectiveIsTinyForKane,
    effectiveIsHunt,
    sharedTarget,
    huntRallyPoint,
    focusAllyName,
    huntGroupNames,
    shouldSkipMeleePorcupine,
    shouldHoldCrabForHighestLuckRanger,
    characterCtype,
    logOnce,
    getSafeSpot,
    moveToSafeSpot,
    emitTracker,
    runWorldEvent,
    runCrab,
    runMonsterhunt: runFarmingHunt,
    getMonsterhuntTarget,
    runMageSupport,
    runPriestSupport,
    handleKaneCrabRoutine,
  });
};

const runFarmingTarget = async ({
  cfg,
  st,
  target,
  isSelf,
  logOnce,
  getSafeSpot,
  moveToSafeSpot,
  emitTracker,
  runWorldEvent,
  runCrab,
  runFarmingHunt,
  getMonsterhuntTarget,
  runMageSupport,
  runPriestSupport,
  handleKaneCrabRoutine,
} = {}) => {
  if (!target || typeof target !== "string") return { abortLoop: false };

  const assignment = buildFarmingAssignment({
    target,
    modePrefix: isSelf ? "manual-self" : "manual",
  });
  const effectiveIsTiny = false;
  const effectiveIsTinyForKane = target === "crab";
  const effectiveIsHunt = true;
  const sharedTarget = target;
  const shouldSkipMeleePorcupine =
    isPorcupineTarget(sharedTarget) && isMeleeCtype(character?.ctype);

  return runFarmingAssignment({
    cfg,
    st,
    assignment,
    localForcedHunt: isSelf,
    worldEvent: null,
    effectiveIsTiny,
    effectiveIsTinyForKane,
    effectiveIsHunt,
    sharedTarget,
    huntRallyPoint: null,
    focusAllyName: null,
    huntGroupNames: [],
    shouldSkipMeleePorcupine,
    shouldHoldCrabForHighestLuckRanger: false,
    characterCtype: character.ctype,
    logOnce,
    getSafeSpot,
    moveToSafeSpot,
    emitTracker,
    runWorldEvent,
    runCrab,
    runFarmingHunt,
    getMonsterhuntTarget,
    runMageSupport,
    runPriestSupport,
    handleKaneCrabRoutine,
  });
};

module.exports = {
  buildFarmingAssignment,
  runFarmingAssignment,
  runFarmingTarget,
};
