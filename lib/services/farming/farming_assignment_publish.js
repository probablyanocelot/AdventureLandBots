// Farming assignment publish extraction.
// Purpose: own leader assignment state update + role broadcast cadence.

const publishFarmingLeaderAssignment = ({
  st,
  now,
  assignment,
  assignmentSignature,
  roster,
  meta,
  characterName,
  sendCm,
  staleMs = 3000,
} = {}) => {
  if (!assignment || typeof assignment !== "object") {
    return { published: false, sig: null, changed: false, stale: false };
  }

  st.lastAssignment = assignment;
  st.lastAssignmentAt = now();

  const sig = assignmentSignature(assignment);
  const changed = sig !== st.lastBroadcastSig;
  const stale =
    now() - st.lastBroadcastAt > Math.max(250, Number(staleMs || 0));

  if (changed || !st.roleAcksBySig.has(sig)) {
    st.roleAcksBySig.set(sig, new Set());
  }

  let published = false;
  try {
    if (changed || stale) {
      for (const name of roster || []) {
        if (name === characterName) continue;
        if (meta?.get?.(name)?.ctype === "merchant") continue;
        const acked = st.roleAcksBySig.get(sig)?.has(name);
        if (acked) continue;
        sendCm(name, { cmd: "farm:roles", assignment, sig });
      }
      st.lastBroadcastSig = sig;
      st.lastBroadcastAt = now();
      published = true;
    }
  } catch {
    // ignore
  }

  return { published, sig, changed, stale };
};

module.exports = {
  publishFarmingLeaderAssignment,
};
