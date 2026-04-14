// Farming no-event CM handler extraction.
// Purpose: own runtime CM-message handling in service layer while legacy loop extraction continues.

const createNoEventFarmingCmHandler = ({
  cfg,
  st,
  now,
  sendCm,
  characterName,
  characterCtype,
  assignmentSignature,
  resolveCharacterName,
  setStoreFn,
  markDeathForTask,
  bumpFastTick,
} = {}) => {
  const isRanger = String(characterCtype || "").toLowerCase() === "ranger";

  const isPorcupineAssignment = () => {
    const huntTarget = st.lastAssignment?.huntTarget || null;
    const worldEventName = st.lastAssignment?.worldEvent?.name || null;
    return (
      (typeof huntTarget === "string" &&
        huntTarget.toLowerCase() === "porcupine") ||
      (typeof worldEventName === "string" &&
        worldEventName.toLowerCase() === "porcupine")
    );
  };

  return (m) => {
    try {
      if (!m || !m.message) return;
      const data = m.message;
      bumpFastTick?.();

      if (data.cmd === "farm:roles") {
        st.lastAssignment = data.assignment || null;
        st.lastAssignmentAt = now();

        const sig =
          typeof data.sig === "string" && data.sig
            ? data.sig
            : assignmentSignature(st.lastAssignment || {});
        const taskKey = data?.assignment?.taskKey || st.lastTaskKey || "none";

        if (sig && st.lastRoleAckSentSig !== sig) {
          st.lastRoleAckSentSig = sig;
          try {
            sendCm?.(m.name, {
              cmd: "farm:roles_ack",
              sig,
              taskKey,
              from: characterName,
            });
          } catch {
            // ignore
          }
        }
        return;
      }

      if (data.cmd === "farm:crab_hold") {
        const targetName =
          resolveCharacterName?.(data.name || data.targetName || m.name) ||
          data.name ||
          data.targetName ||
          null;
        if (targetName && targetName !== characterName) return;

        st.crabHoldOverride = data.enabled !== false;
        bumpFastTick?.(3000);
        return;
      }

      if (data.cmd === "farm:roles_ack") {
        const sig = typeof data.sig === "string" ? data.sig : null;
        if (!sig) return;
        if (!st.roleAcksBySig.has(sig)) st.roleAcksBySig.set(sig, new Set());
        st.roleAcksBySig.get(sig).add(m.name);
        return;
      }

      if (data.cmd === "farm:role_sync_request") {
        const configuredWarrior =
          resolveCharacterName?.(
            cfg?.noEventFarming?.aggroLockChain?.warriorName,
          ) ||
          cfg?.noEventFarming?.aggroLockChain?.warriorName ||
          null;

        if (!configuredWarrior || characterName !== configuredWarrior) return;

        const assignment = st.lastAssignment;
        if (!assignment || typeof assignment !== "object") return;

        const sig = assignmentSignature(assignment);
        try {
          sendCm?.(m.name, {
            cmd: "farm:roles",
            assignment,
            sig,
            sync: true,
          });
        } catch {
          // ignore
        }
        return;
      }

      if (data.cmd === "farm:hunt_danger") {
        st.lastHuntDanger = { ...data, at: now() };
        return;
      }

      if (data.cmd === "farm:status") {
        st.teamStats.set(m.name, {
          ...(data.status || {}),
          name: m.name,
          at: now(),
        });
        return;
      }

      if (data.cmd === "farm:position") {
        if (isRanger && !isPorcupineAssignment()) {
          return; // Ranger ignores regular farm position updates unless porcupine is the current warrior target
        }
        try {
          if (typeof setStoreFn !== "function") return;
          const id = data.id || m.name;
          if (!id) return;
          setStoreFn(`${id}_position`, {
            server: {
              region: data?.server?.region || null,
              id: data?.server?.id || null,
            },
            time:
              typeof data.time === "string" && data.time
                ? data.time
                : new Date().toISOString(),
            in: data.in,
            map: data.map,
            x: Number(data.x),
            y: Number(data.y),
          });
        } catch {
          // ignore
        }
        return;
      }

      if (data.cmd === "farm:death") {
        const taskKey = data.taskKey || st.lastTaskKey || "none";
        const participants = Array.isArray(data.participants)
          ? data.participants
          : st.lastAssignment
            ? [
                ...(st.lastAssignment.monsterhunt || []),
                ...(st.lastAssignment.crab || []),
              ]
            : [];
        markDeathForTask?.({ name: m.name, taskKey, participants });
        return;
      }
    } catch {
      // ignore
    }
  };
};

module.exports = {
  createNoEventFarmingCmHandler,
};
