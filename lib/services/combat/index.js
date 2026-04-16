const combatService = await require("./combat_service.js");
const worldEventRunner = await require("./world_event_runner.js");
const positionStore = await require("./position_store.js");
const targeting = await require("./targeting.js");
const skills = await require("./skills.js");
const { isInJoinableEvent } = await require("./event_combat_runtime.js");
const { BlockerTracker } = await require("./blocker_tracker.js");
const {
  dbg,
  stopSmartMove,
  isNearPoint,
  normalizeNumber,
  spreadFromPartyIfStacked,
} = await require("./combat_shared.js");
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

module.exports = Object.assign(
  {},
  combatService,
  worldEventRunner,
  positionStore,
  targeting,
  skills,
  {
    isInJoinableEvent,
    BlockerTracker,
    dbg,
    stopSmartMove,
    isNearPoint,
    normalizeNumber,
    spreadFromPartyIfStacked,
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
  },
);
