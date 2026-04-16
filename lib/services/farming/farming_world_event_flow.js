// Farming no-event world-event leader flow extraction.
// Purpose: own world-event assignment + broadcast + leader local execution path.

const handleFarmingLeaderWorldEventFlow = async ({
  cfg,
  st,
  now,
  roster,
  meta,
  characterName,
  available,
  worldEvent,
  getTaskKey,
  assignmentSignature,
  sendCm,
  getMonsterStats,
  selectWorldFarmers,
  runWorldEvent,
  runMageSupport,
  isMage,
  skipRangerName,
} = {}) => {
  if (!worldEvent) return { handled: false, assignment: null };

  const stats = getMonsterStats(worldEvent.name);
  const worldFarmers = selectWorldFarmers({
    stats,
    available,
    meta,
    worldEventName: worldEvent.name,
    skipRangerName,
  });
  const priestActive = Boolean((available?.priest || []).length);

  const assignment = {
    mode: "world_event",
    crab: [],
    monsterhunt: worldFarmers,
    huntTarget: null,
    worldEvent,
    priestActive,
  };

  assignment.taskKey = getTaskKey(assignment);
  st.lastTaskKey = assignment.taskKey;

  st.lastAssignment = assignment;
  st.lastAssignmentAt = now();

  const sig = assignmentSignature(assignment);
  if (sig !== st.lastBroadcastSig) st.roleAcksBySig.set(sig, new Set());

  try {
    for (const name of roster) {
      if (name === characterName) continue;
      if (meta.get(name)?.ctype === "merchant") continue;
      const acked = st.roleAcksBySig.get(sig)?.has(name);
      if (acked) continue;
      sendCm(name, { cmd: "farm:roles", assignment, sig });
    }
  } catch {
    // ignore
  }

  const isHunt = assignment.monsterhunt?.includes(characterName);
  if (isHunt) await runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
  if (isMage) await runMageSupport({ assigned: isHunt });

  return {
    handled: true,
    assignment,
  };
};

module.exports = {
  handleFarmingLeaderWorldEventFlow,
};
