const { getConfig } = await require("./config/index.js");
const { warn, info } = await require("./al_debug_log.js");
const { getRosterMeta } = await require("./domains/shared/roster.js");
const { getActiveJoinableEvents, getActiveWorldEvents, pickWorldEvent } =
  await require("./domains/events/server_event_catalog.js");
const { now } = await require("./domains/shared/time.js");
const {
  runCrab,
  runMonsterhunt,
  runWorldEvent,
  runMageSupport,
  runPriestSupport,
} = await require("./domains/combat/index.js");
const { onCharacter } = await require("./domains/events/index.js");
const {
  getKnownCharacters,
  getKnownOnlineNames,
  listOfflineFarmerNamesByType,
  resolveCharacterName,
  getMonsterhuntTarget,
  getMonsterhuntTargetForName,
  needsMonsterhuntTurnIn,
  needsMonsterhuntTurnInForName,
  isNameHoldingAggroOfType,
  requestMageMagiport,
  waitForMageMagiportResult,
  stopCharacterSafe,
  ensureChainMageRunning,
  isCharacterOnline,
  getMonsterStats,
  selectPair,
  selectThree,
  chooseLeader,
  pickRoleName,
  buildAvailableByClass,
  determineAssignment,
  selectWorldFarmers,
  listFarmersByPreference,
  assignmentSignature,
} = await require("./domains/farming/index.js");
const { createMoveManager } = await require("./domains/movement/index.js");
const { getActiveNames, ensureCharacterRunningBySwap } =
  await require("./domains/party/index.js");

const getCharacterMeta = (roster) => getRosterMeta(roster);

const PORCUPINE_TARGET = "porcupine";
const PORCUPINE_SWAP_CODE_SLOT = 90;
const MELEE_CTYPES = new Set(["warrior", "paladin", "rogue"]);

const isPorcupineTarget = (target) =>
  typeof target === "string" && target.toLowerCase() === PORCUPINE_TARGET;

const isMeleeCtype = (ctype) => MELEE_CTYPES.has(String(ctype || ""));

const getManualFarmMob = (cfg) => {
  const value = cfg?.noEventFarming?.manualFarmMob;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const getManualFarmMobSelf = (cfg) => {
  const value = cfg?.noEventFarming?.manualFarmMobSelf;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const isConfiguredCrabRanger = (cfg, name = character?.name) => {
  const configured = resolveCharacterName(cfg?.noEventFarming?.crabRangerName);
  return Boolean(configured && name && configured === name);
};

const savePosition = () => {
  try {
    if (typeof set !== "function") return false;
    set(`${character.id}_position`, {
      server: {
        region: server.region,
        id: server.id,
      },
      time: new Date().toISOString(),
      in: character.in,
      map: character.map,
      x: character.x,
      y: character.y,
    });
    return true;
  } catch {
    return false;
  }
};

const installNoEventFarming = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const singletonKey = `__AL_NO_EVENT_FARMING_INSTANCE__${character?.name || "unknown"}`;
  try {
    const prev = globalThis[singletonKey];
    if (prev && typeof prev.stop === "function") prev.stopRoutine();
  } catch {
    // ignore
  }

  const nf = cfg?.noEventFarming || {};
  const loopBaseMs = Math.max(300, Number(nf.loopBaseMs || 900));
  const loopBurstMs = Math.max(
    120,
    Math.min(loopBaseMs, Number(nf.loopBurstMs || 350)),
  );

  const getSafeSpot = () => {
    const nf = cfg?.noEventFarming || {};
    const spot = nf.groupSafeSpot;
    if (typeof spot === "string" && spot.trim()) return spot.trim();
    if (
      spot &&
      typeof spot === "object" &&
      Number.isFinite(spot.x) &&
      Number.isFinite(spot.y)
    ) {
      return {
        map: typeof spot.map === "string" && spot.map ? spot.map : "main",
        x: Number(spot.x),
        y: Number(spot.y),
      };
    }
    return "poisio";
  };

  const moveToSafeSpot = ({ key = "safe_spot", priority = 1 } = {}) => {
    const dest = getSafeSpot();
    try {
      if (st.mover) {
        st.mover.request({
          dest,
          key,
          priority,
          cooldownMs: 5000,
        });
      } else {
        smart_move(dest);
      }
      return true;
    } catch {
      return false;
    }
  };

  const emitTracker = () => {
    // Temporary toggle: keep tracker emission off for now.
    // To implement later:
    // 1) Gate with config (e.g., cfg.noEventFarming.enableTrackerEmit).
    // 2) Optionally require tracker item presence (locate_item("tracker") >= 0).
    // 3) Keep/adjust current cooldown to avoid socket spam.
    const TRACKER_EMIT_ENABLED = false;
    if (!TRACKER_EMIT_ENABLED) return;

    const ts = now();
    if (st.lastTrackerEmitAt && ts - st.lastTrackerEmitAt < 60000) return;
    st.lastTrackerEmitAt = ts;
    try {
      parent?.socket?.emit?.("tracker");
    } catch {
      // ignore
    }
  };

  const st = {
    stopped: false,
    lastAssignment: null,
    lastAssignmentAt: 0,
    lastBroadcastSig: "",
    lastBroadcastAt: 0,
    leader: null,
    mover: createMoveManager(),
    lastTurnInRequest: 0,
    lastHuntDanger: null,
    teamStats: new Map(),
    lastStatusTaskKeySent: null,
    wipeByTask: new Map(),
    deathsByTask: new Map(),
    lastTaskKey: null,
    lastTrackerEmitAt: 0,
    roleAcksBySig: new Map(),
    lastRoleAckSentSig: null,
    logState: new Map(),
    pendingAggroChain: null,
    lastAggroChainRequestAt: 0,
    lastAggroChainFinalizeAt: 0,
    lastAggroChainMageSwapAt: 0,
    lastHuntMagePortTarget: null,
    lastChainBootstrapAt: 0,
    lastPorcupineSwapAt: 0,
    timer: null,
    offHandlers: [],
    fastTickUntil: 0,
    lastPositionPersistAt: 0,
    lastPositionPersistMap: null,
    lastPositionPersistPoint: null,
    lastPositionCmBroadcastAt: 0,
    lastPositionCmMap: null,
    lastPositionCmPoint: null,
    crabHoldOverride: null,
  };

  const bumpFastTick = (ms = 2200) => {
    const until = now() + Math.max(300, Number(ms || 0));
    st.fastTickUntil = Math.max(st.fastTickUntil || 0, until);
  };

  const scheduleNext = () => {
    if (st.stopped) return;
    const delay = now() < st.fastTickUntil ? loopBurstMs : loopBaseMs;
    st.timer = setTimeout(() => void loop(), delay);
  };

  const logOnce = (key, message, data = null, cooldownMs = 12000) => {
    const ts = now();
    const last = Number(st.logState.get(key) || 0);
    if (ts - last < cooldownMs) return;
    st.logState.set(key, ts);
    try {
      info(`[farm] ${message}`, data || "");
    } catch {
      // ignore
    }
  };

  const getTaskKey = (assignment) => {
    try {
      if (!assignment || typeof assignment !== "object") return "none";
      const mode = assignment.mode || "none";
      const hunt = assignment.huntTarget || null;
      const evt = assignment.worldEvent?.name || null;
      return `mode:${mode}|hunt:${hunt || "-"}|event:${evt || "-"}`;
    } catch {
      return `task:${Date.now()}`;
    }
  };

  const markDeathForTask = ({ name, taskKey, participants = [] } = {}) => {
    if (!name || !taskKey) return;
    const part = Array.isArray(participants)
      ? participants.filter(Boolean)
      : [];
    const targetSize = Math.max(1, part.length);

    if (!st.deathsByTask.has(taskKey)) st.deathsByTask.set(taskKey, new Set());
    const set = st.deathsByTask.get(taskKey);
    set.add(name);

    if (set.size < targetSize) return;

    const wipes = Number(st.wipeByTask.get(taskKey) || 0) + 1;
    st.wipeByTask.set(taskKey, wipes);
    st.deathsByTask.set(taskKey, new Set());
  };

  const handler = (m) => {
    try {
      if (!m || !m.message) return;
      const data = m.message;
      bumpFastTick();
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
            send_cm(m.name, {
              cmd: "farm:roles_ack",
              sig,
              taskKey,
              from: character.name,
            });
          } catch {
            // ignore
          }
        }
        return;
      }

      if (data.cmd === "farm:crab_hold") {
        const targetName =
          resolveCharacterName(data.name || data.targetName || m.name) ||
          data.name ||
          data.targetName ||
          null;
        if (targetName && targetName !== character.name) return;

        st.crabHoldOverride = data.enabled !== false;
        bumpFastTick(3000);
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
          resolveCharacterName(
            cfg?.noEventFarming?.aggroLockChain?.warriorName,
          ) ||
          cfg?.noEventFarming?.aggroLockChain?.warriorName ||
          null;

        if (!configuredWarrior || character?.name !== configuredWarrior) return;

        const assignment = st.lastAssignment;
        if (!assignment || typeof assignment !== "object") return;

        const sig = assignmentSignature(assignment);
        try {
          send_cm(m.name, {
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
        try {
          if (typeof set !== "function") return;
          const id = data.id || m.name;
          if (!id) return;
          set(`${id}_position`, {
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
        markDeathForTask({ name: m.name, taskKey, participants });
        return;
      }
    } catch {
      // ignore
    }
  };

  const offCm = onCharacter("cm", handler);
  const offDeath = onCharacter("death", () => {
    try {
      bumpFastTick(5000);
      const assignment = st.lastAssignment;
      const participants = assignment
        ? [...(assignment.monsterhunt || []), ...(assignment.crab || [])]
        : [character.name];
      const taskKey = assignment?.taskKey || st.lastTaskKey || "none";

      markDeathForTask({ name: character.name, taskKey, participants });

      for (const name of Object.keys(parent?.party || {})) {
        if (name === character.name) continue;
        try {
          send_cm(name, {
            cmd: "farm:death",
            taskKey,
            participants,
          });
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  });
  st.offHandlers.push(offCm, offDeath);

  const loop = async () => {
    if (st.stopped) return;

    try {
      const currentCfg = getConfig();
      const manualFarmMob = getManualFarmMob(currentCfg || cfg);
      const manualFarmMobSelf = getManualFarmMobSelf(currentCfg || cfg);
      const crabHoldSelf = currentCfg?.noEventFarming?.crabHoldSelf;

      if (character.ctype === "merchant") return;

      if (getActiveJoinableEvents().length) return;

      const roster = Array.from(
        new Set([...(getActiveNames() || []), character?.name].filter(Boolean)),
      ).sort();
      if (!roster.length) return;

      const meta = getCharacterMeta(roster);
      let leader = chooseLeader(roster, meta);
      st.leader = leader;

      const chainCfg = cfg?.noEventFarming?.aggroLockChain || {};
      const chainWarriorName = pickRoleName({
        roster,
        meta,
        ctype: "warrior",
        fallback: chainCfg.warriorName || null,
      });
      const chainPriestName = pickRoleName({
        roster,
        meta,
        ctype: "priest",
        fallback: chainCfg.priestName || null,
      });
      const chainHuntMageName =
        resolveCharacterName(chainCfg.huntMageName || cfg.mageName || null) ||
        null;
      const chainNpcMageName =
        resolveCharacterName(chainCfg.npcMageName || cfg.mageName || null) ||
        null;
      if (
        chainCfg.enabled &&
        chainWarriorName &&
        roster.includes(chainWarriorName)
      ) {
        leader = chainWarriorName;
        st.leader = leader;
      }

      const nowMs = now();
      bumpFastTick(1000);

      if (character.rip) return;

      const fearState = Boolean(
        character?.s?.fear || character?.s?.frightened || character?.s?.scared,
      );
      let attackersOnMe = 0;
      try {
        for (const entity of Object.values(parent?.entities || {})) {
          if (
            entity?.type === "monster" &&
            !entity?.dead &&
            entity?.target === character?.name
          ) {
            attackersOnMe += 1;
          }
        }
      } catch {
        // ignore
      }

      const hpRatio =
        Number(character?.max_hp || 0) > 0
          ? Number(character.hp || 0) / Number(character.max_hp || 1)
          : 1;
      const dangerHpRatio = Math.max(
        0.1,
        Math.min(0.95, Number(nf.assistDangerHpRatio || 0.55)),
      );
      const status = {
        map: character?.map || null,
        x: Number(character?.x || 0),
        y: Number(character?.y || 0),
        hp: Number(character?.hp || 0),
        maxHp: Number(character?.max_hp || 0),
        mp: Number(character?.mp || 0),
        maxMp: Number(character?.max_mp || 0),
        feared: fearState,
        attackersOnMe,
        takingTooMuchDamage:
          fearState || (attackersOnMe > 0 && hpRatio <= dangerHpRatio),
        at: nowMs,
      };

      st.teamStats.set(character.name, {
        ...status,
        name: character.name,
        at: nowMs,
      });
      const statusTaskKey =
        st.lastAssignment?.taskKey || st.lastTaskKey || "none";
      if (statusTaskKey && st.lastStatusTaskKeySent !== statusTaskKey) {
        st.lastStatusTaskKeySent = statusTaskKey;
        try {
          for (const name of roster) {
            if (name === character.name) continue;
            if (meta.get(name)?.ctype === "merchant") continue;
            send_cm(name, {
              cmd: "farm:status",
              status,
              taskKey: statusTaskKey,
            });
          }
        } catch {
          // ignore
        }
      }

      if (!leader) return;

      const liveTarget =
        manualFarmMob ||
        getMonsterhuntTargetForName(leader) ||
        getMonsterhuntTarget();

      // Flow step: warrior gets task -> start Hoodlamb -> Hoodlamb moves+ports warrior.
      if (
        character.name === leader &&
        !manualFarmMob &&
        chainCfg.enabled &&
        liveTarget &&
        !needsMonsterhuntTurnIn()
      ) {
        const cooldownMs = Math.max(
          1500,
          Number(chainCfg.requestCooldownMs || 6000),
        );
        if (
          st.lastHuntMagePortTarget !== liveTarget &&
          now() - st.lastChainBootstrapAt >= cooldownMs
        ) {
          st.lastChainBootstrapAt = now();
          const readyHuntMage = await ensureChainMageRunning({
            cfg,
            mageName: chainHuntMageName,
            chainCfg,
            preferredSubOut: [chainNpcMageName],
            excludeSubOutNames: [chainWarriorName, chainPriestName],
            label: "hunt-chain-hunt-mage-bootstrap",
          });

          if (!readyHuntMage.ok) {
            logOnce(
              `hunt_chain_bootstrap_hunt_mage_not_ready:${liveTarget}`,
              "hunt-chain bootstrap blocked: hunt mage not ready",
              {
                liveTarget,
                huntMageName: chainHuntMageName,
                ready: readyHuntMage.ready,
                online: readyHuntMage.online,
              },
              2000,
            );
            return;
          }

          const selectedHuntMage = chainHuntMageName;

          const bootTaskId = `huntchain:bootstrap:${now()}`;
          const bootPortOk = requestMageMagiport({
            mageName: selectedHuntMage,
            targetName: chainWarriorName || character.name,
            taskId: bootTaskId,
            task: { target: liveTarget },
          });

          if (bootPortOk) {
            const bootResult = await waitForMageMagiportResult({
              mageName: selectedHuntMage,
              taskId: bootTaskId,
              timeoutMs: Math.max(
                6000,
                Number(chainCfg.pendingTimeoutMs || 12000),
              ),
            });
            if (bootResult?.message?.ok) {
              st.lastHuntMagePortTarget = liveTarget;
              if (chainNpcMageName && isCharacterOnline(chainNpcMageName)) {
                stopCharacterSafe(chainNpcMageName);
              }
            } else {
              logOnce(
                `hunt_chain_bootstrap_result_missing:${liveTarget}`,
                "hunt-chain bootstrap failed: no successful mage result",
                { liveTarget, selectedHuntMage, bootTaskId },
                2000,
              );
            }
          }
        }
      }

      if (character.name === leader && st.pendingAggroChain) {
        const pending = st.pendingAggroChain;
        const age = now() - Number(pending.at || 0);
        const timeoutMs = Math.max(
          3000,
          Number(chainCfg.pendingTimeoutMs || 12000),
        );

        if (age > timeoutMs) {
          logOnce(
            `hunt_chain_timeout:${pending.priorTarget || "none"}`,
            "hunt-chain pending expired",
            { pending },
            5000,
          );
          st.pendingAggroChain = null;
        } else if (pending.phase === "await_new_task") {
          const currentTarget = getMonsterhuntTarget();
          if (currentTarget) {
            const sameTarget =
              Boolean(pending.priorTarget) &&
              currentTarget === pending.priorTarget;
            const cooldownMs = Math.max(
              1500,
              Number(chainCfg.requestCooldownMs || 6000),
            );
            if (
              (!pending.sameTargetOnly || sameTarget) &&
              now() - st.lastAggroChainFinalizeAt >= cooldownMs
            ) {
              const readyHuntMage = await ensureChainMageRunning({
                cfg,
                mageName: pending.huntMageName,
                chainCfg,
                preferredSubOut: [pending.npcMageName],
                excludeSubOutNames: [chainWarriorName, chainPriestName],
                label: "hunt-chain-hunt-mage",
              });

              if (!readyHuntMage.ok) {
                logOnce(
                  `hunt_chain_finalize_hunt_mage_not_ready:${currentTarget}`,
                  "hunt-chain finalize blocked: hunt mage not ready",
                  {
                    currentTarget,
                    huntMageName: pending.huntMageName,
                    ready: readyHuntMage.ready,
                    online: readyHuntMage.online,
                  },
                  2000,
                );
                return;
              }

              const selectedHuntMage = pending.huntMageName;
              const huntTaskId = `huntchain:hunt:${now()}`;
              const ok = requestMageMagiport({
                mageName: selectedHuntMage,
                targetName: pending.warriorName,
                taskId: huntTaskId,
                task: { target: currentTarget },
              });
              st.lastAggroChainFinalizeAt = now();
              if (ok) {
                const huntResult = await waitForMageMagiportResult({
                  mageName: selectedHuntMage,
                  taskId: huntTaskId,
                  timeoutMs: Math.max(
                    6000,
                    Number(chainCfg.pendingTimeoutMs || 12000),
                  ),
                });
                if (huntResult?.message?.ok) {
                  st.lastHuntMagePortTarget = currentTarget;
                }
              }

              if (
                pending.npcMageName &&
                isCharacterOnline(pending.npcMageName)
              ) {
                stopCharacterSafe(pending.npcMageName);
              }

              logOnce(
                `hunt_chain_finalize:${pending.priorTarget || "none"}`,
                ok
                  ? "hunt-chain finalized: warrior ported to hunt mage"
                  : "hunt-chain finalize failed: hunt mage port request failed",
                {
                  priorTarget: pending.priorTarget,
                  currentTarget,
                  huntMageName: selectedHuntMage,
                  requestedHuntMage: pending.huntMageName,
                  huntMageReady: readyHuntMage.ok,
                  warriorName: pending.warriorName,
                  sameTarget,
                },
                2000,
              );
            } else {
              logOnce(
                `hunt_chain_target_miss:${pending.priorTarget || "none"}`,
                "hunt-chain skipped: refreshed target differs",
                {
                  previous: pending.priorTarget,
                  current: currentTarget,
                },
                5000,
              );
            }
            st.pendingAggroChain = null;
          }
        }
      }

      // Only the leader should churn turn-ins / fetch new hunts.
      // Followers keep farming their last assignment while leader rotates tasks.
      if (
        character.name === leader &&
        !manualFarmMob &&
        needsMonsterhuntTurnIn()
      ) {
        const nowMs = now();
        const priorTarget =
          getMonsterhuntTarget() ||
          st.lastAssignment?.huntTarget ||
          st.lastHuntMagePortTarget ||
          liveTarget ||
          null;
        const requestCooldownMs = Math.max(
          1500,
          Number(chainCfg.requestCooldownMs || 6000),
        );

        const chainEnabled =
          Boolean(chainCfg.enabled) &&
          Boolean(priorTarget) &&
          character.name === (chainWarriorName || character.name);

        if (
          chainEnabled &&
          nowMs - st.lastAggroChainRequestAt >= requestCooldownMs
        ) {
          const priestName = chainPriestName || null;
          const requirePriestAggro = chainCfg.requirePriestAggro !== false;
          const priestHolding = priestName
            ? isNameHoldingAggroOfType(priestName, priorTarget)
            : false;

          if (!requirePriestAggro || priestHolding) {
            const npcMageName = chainNpcMageName || cfg.mageName || null;
            const huntMageName = chainHuntMageName || cfg.mageName || null;
            const warriorName = chainWarriorName || character.name;

            // Flow step: group kills task -> warrior stops Hoodlamb.
            if (huntMageName && isCharacterOnline(huntMageName)) {
              stopCharacterSafe(huntMageName);
            }

            const readyNpcMage = await ensureChainMageRunning({
              cfg,
              mageName: npcMageName,
              chainCfg,
              preferredSubOut: [huntMageName],
              excludeSubOutNames: [chainWarriorName, chainPriestName],
              label: "hunt-chain-npc-mage",
            });
            st.lastAggroChainMageSwapAt = now();

            if (!readyNpcMage.ok) {
              logOnce(
                `hunt_chain_npc_mage_not_ready:${priorTarget}`,
                "hunt-chain blocked: NPC mage not ready",
                {
                  priorTarget,
                  npcMageName,
                  ready: readyNpcMage.ready,
                  online: readyNpcMage.online,
                },
                2000,
              );
              return;
            }

            const selectedNpcMage = npcMageName;

            const npcTaskId = `huntchain:npc:${nowMs}`;
            const npcPortOk = requestMageMagiport({
              mageName: selectedNpcMage,
              targetName: warriorName,
              taskId: npcTaskId,
              task: { target: "monsterhunter" },
            });

            if (npcPortOk) {
              const npcResult = await waitForMageMagiportResult({
                mageName: selectedNpcMage,
                taskId: npcTaskId,
                timeoutMs: Math.max(
                  6000,
                  Number(chainCfg.pendingTimeoutMs || 12000),
                ),
              });
              if (!npcResult?.message?.ok) {
                logOnce(
                  `hunt_chain_npc_result_missing:${priorTarget}`,
                  "hunt-chain blocked: NPC mage did not confirm successful port",
                  { priorTarget, selectedNpcMage, npcTaskId },
                  2000,
                );
                return;
              }

              // Flow step: warrior stops GoodLamb after NPC port.
              if (selectedNpcMage && isCharacterOnline(selectedNpcMage)) {
                stopCharacterSafe(selectedNpcMage);
              }

              // Flow step: warrior starts Hoodlamb before getting new task.
              const readyHuntMage = await ensureChainMageRunning({
                cfg,
                mageName: huntMageName,
                chainCfg,
                preferredSubOut: [selectedNpcMage],
                excludeSubOutNames: [chainWarriorName, chainPriestName],
                label: "hunt-chain-hunt-mage-after-npc",
              });

              if (!readyHuntMage.ok) {
                logOnce(
                  `hunt_chain_hunt_mage_not_ready_after_npc:${priorTarget}`,
                  "hunt-chain blocked: hunt mage not ready after npc phase",
                  {
                    priorTarget,
                    huntMageName,
                    ready: readyHuntMage.ready,
                    online: readyHuntMage.online,
                  },
                  2000,
                );
                return;
              }

              const selectedHuntMage = huntMageName;

              st.lastAggroChainRequestAt = nowMs;
              logOnce(
                `hunt_chain_npc:${priorTarget}`,
                "hunt-chain started: warrior requested NPC mage port",
                {
                  priorTarget,
                  priestName,
                  npcMageName: selectedNpcMage,
                  requestedNpcMage: npcMageName,
                  npcMageReady: readyNpcMage.ok,
                  huntMageName: selectedHuntMage,
                  requestedHuntMage: huntMageName,
                  huntMageReady: readyHuntMage.ok,
                  warriorName,
                },
                2000,
              );

              st.pendingAggroChain = {
                at: now(),
                phase: "await_new_task",
                priorTarget,
                sameTargetOnly: chainCfg.sameTargetOnly !== false,
                huntMageName: selectedHuntMage,
                npcMageName: selectedNpcMage,
                warriorName,
              };
            } else {
              logOnce(
                `hunt_chain_npc_fail:${priorTarget}`,
                "hunt-chain fallback: NPC mage port request failed",
                {
                  priorTarget,
                  npcMageName: selectedNpcMage,
                  requestedNpcMage: npcMageName,
                  warriorName,
                },
                2500,
              );
            }
          } else {
            logOnce(
              `hunt_chain_priest_missing:${priorTarget}`,
              "hunt-chain blocked: priest is not holding same-target aggro",
              { priorTarget, priestName },
              2500,
            );
          }
        }

        if (!smart.moving && nowMs - st.lastTurnInRequest > 5000) {
          st.lastTurnInRequest = nowMs;
          if (st.mover) {
            st.mover.request({
              dest: "monsterhunter",
              key: "turnin_monsterhunt",
              priority: 1,
              cooldownMs: 5000,
            });
          } else {
            try {
              smart_move("monsterhunter");
            } catch {
              // ignore
            }
          }
          try {
            interact("monsterhunt");
            st.lastHuntMagePortTarget = null;
          } catch {
            // ignore
          }
        }
        return;
      }

      if (character.name === leader) {
        const available = buildAvailableByClass(roster, meta);
        const farmerCount = Object.values(available).reduce(
          (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
          0,
        );
        const worldEvents = getActiveWorldEvents();
        const worldEvent = pickWorldEvent(worldEvents);
        const priestActive = Boolean((available?.priest || []).length);

        if (worldEvent) {
          const stats = getMonsterStats(worldEvent.name);
          const worldFarmers = selectWorldFarmers({ stats, available });
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
              if (name === character.name) continue;
              if (meta.get(name)?.ctype === "merchant") continue;
              const acked = st.roleAcksBySig.get(sig)?.has(name);
              if (acked) continue;
              send_cm(name, { cmd: "farm:roles", assignment, sig });
            }
          } catch {
            // ignore
          }

          const isHunt = assignment.monsterhunt?.includes(character.name);
          if (isHunt)
            await runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
          if (character.ctype === "mage")
            await runMageSupport({ assigned: isHunt });
          return;
        }

        let target = manualFarmMob || getMonsterhuntTarget();
        if (!target && !manualFarmMob) {
          const nowMs = now();
          if (!cfg._lastHuntRequest || nowMs - cfg._lastHuntRequest > 15000) {
            cfg._lastHuntRequest = nowMs;
            if (!smart.moving) {
              st.mover.request({
                dest: "monsterhunter",
                key: "get_monsterhunt",
                priority: 2,
                cooldownMs: 15000,
              });
            }
            try {
              interact("monsterhunt");
            } catch {
              // ignore
            }
          }
        }

        const stats = getMonsterStats(target);
        let assignment = determineAssignment({
          roster,
          meta,
          stats,
          available,
        });
        assignment.priestActive = priestActive;

        if (manualFarmMob) {
          assignment.mode = `manual:${manualFarmMob}`;
          assignment.crab = [];
        }

        if (isPorcupineTarget(target)) {
          const knownOnlineNames = new Set([
            ...roster,
            ...getKnownOnlineNames(),
          ]);
          const remoteOnlineRangedSupport = getKnownCharacters()
            .filter((entry) => {
              const name = entry?.name;
              const ctype = String(
                entry?.type || entry?.ctype || "",
              ).toLowerCase();
              if (!name || roster.includes(name)) return false;
              if (!knownOnlineNames.has(name)) return false;
              return ["ranger", "priest", "mage"].includes(ctype);
            })
            .map((entry) => entry.name)
            .filter(Boolean);
          const onlineMelee = roster.filter((name) =>
            isMeleeCtype(meta.get(name)?.ctype),
          );
          const rangerOnline = getKnownCharacters().some(
            (entry) =>
              knownOnlineNames.has(entry?.name) &&
              String(entry?.type || entry?.ctype || "").toLowerCase() ===
                "ranger",
          );

          assignment.mode = "porcupine_ranged_only";
          assignment.crab = [];

          if (remoteOnlineRangedSupport.length) {
            logOnce(
              `porcupine_remote_ranged:${target}:${remoteOnlineRangedSupport.join(",")}`,
              "porcupine ranged support already online elsewhere; skipping extra start",
              {
                target,
                onlineElsewhere: remoteOnlineRangedSupport,
              },
              4000,
            );
          }

          const preferredPorcupineHunters = [
            ...(available.ranger || []),
            ...(available.priest || []),
            ...(available.mage || []),
          ];
          assignment.monsterhunt = Array.from(
            new Set(preferredPorcupineHunters),
          ).slice(0, 3);

          if (!assignment.monsterhunt.length) {
            const fallbackHunters = listFarmersByPreference(available).filter(
              (name) => !isMeleeCtype(meta.get(name)?.ctype),
            );
            assignment.monsterhunt = fallbackHunters.slice(0, 3);
          }

          const porcupineSwapCooldownMs = 8000;
          const canTrySwap =
            onlineMelee.length > 0 &&
            nowMs - st.lastPorcupineSwapAt >= porcupineSwapCooldownMs;

          if (canTrySwap) {
            st.lastPorcupineSwapAt = nowMs;
            const swapPriorityList = Array.from(new Set(onlineMelee));
            const targetCandidates = [
              ...listOfflineFarmerNamesByType({
                activeRoster: Array.from(knownOnlineNames),
                includeTypes: ["ranger"],
              }),
              ...listOfflineFarmerNamesByType({
                activeRoster: Array.from(knownOnlineNames),
                includeTypes: ["priest", "mage"],
              }),
            ].filter(Boolean);

            const codeSlotOrName = PORCUPINE_SWAP_CODE_SLOT;
            if (cfg?.mageSwap?.codeSlotOrName !== codeSlotOrName) {
              logOnce(
                `porcupine_force_slot:${target}`,
                "porcupine forcing start_character code slot 90",
                {
                  target,
                  configuredCodeSlotOrName: cfg?.mageSwap?.codeSlotOrName,
                  usingCodeSlotOrName: codeSlotOrName,
                },
                15000,
              );
            }
            if (targetCandidates.length) {
              for (const candidate of targetCandidates) {
                const result = await ensureCharacterRunningBySwap({
                  targetName: candidate,
                  codeSlotOrName,
                  swapPriorityList,
                  label: "porcupine-ranged",
                  timeoutMs: 20000,
                });
                if (result?.ok) {
                  bumpFastTick(4000);
                  break;
                }
              }
            }
          }

          if (rangerOnline) {
            assignment.crab = [];
            const hunt = new Set(assignment.monsterhunt || []);
            for (const name of available.ranger || []) {
              if (hunt.size >= 3) break;
              hunt.add(name);
            }
            assignment.monsterhunt = Array.from(hunt).slice(0, 3);
          }
        }

        if (chainCfg.enabled && !manualFarmMob) {
          const warriorName = chainWarriorName || null;
          const priestName = chainPriestName || null;
          const huntMageName = chainHuntMageName || null;
          const npcMageName = chainNpcMageName || null;

          const forced = [warriorName, priestName, huntMageName]
            .filter((name) => name && roster.includes(name))
            .filter((name) => name !== npcMageName);

          if (forced.length) {
            assignment.crab = [];
            assignment.monsterhunt = Array.from(
              new Set([...(assignment.monsterhunt || []), ...forced]),
            )
              .filter((name) => name !== npcMageName)
              .slice(0, Math.min(3, Math.max(1, forced.length)));
          }
        }

        const dangerRecent =
          !manualFarmMob &&
          st.lastHuntDanger &&
          st.lastHuntDanger.target === target &&
          now() - st.lastHuntDanger.at < 12000;

        if (dangerRecent) {
          assignment.mode = "help_requested";
          assignment.crab = [];
          assignment.monsterhunt = selectThree({ stats, available });
          if (!assignment.monsterhunt.length)
            assignment.monsterhunt = selectPair({ stats, available });
        }

        const huntGroup = Array.isArray(assignment.monsterhunt)
          ? assignment.monsterhunt
          : [];
        const recentHuntStats = huntGroup
          .map((name) => ({ name, stat: st.teamStats.get(name) }))
          .filter((it) => it.stat && now() - Number(it.stat.at || 0) < 6000);

        const focusCandidate = recentHuntStats
          .map((it) => ({ name: it.name, stat: it.stat }))
          .sort((a, b) => {
            const aFear = a.stat?.feared ? 1 : 0;
            const bFear = b.stat?.feared ? 1 : 0;
            if (aFear !== bFear) return bFear - aFear;

            const aDanger = a.stat?.takingTooMuchDamage ? 1 : 0;
            const bDanger = b.stat?.takingTooMuchDamage ? 1 : 0;
            if (aDanger !== bDanger) return bDanger - aDanger;

            const aRatio =
              Number(a.stat?.maxHp || 0) > 0
                ? Number(a.stat?.hp || 0) / Number(a.stat?.maxHp || 1)
                : 1;
            const bRatio =
              Number(b.stat?.maxHp || 0) > 0
                ? Number(b.stat?.hp || 0) / Number(b.stat?.maxHp || 1)
                : 1;
            return aRatio - bRatio;
          })[0];

        const shouldFocus =
          Boolean(focusCandidate?.stat?.feared) ||
          Boolean(focusCandidate?.stat?.takingTooMuchDamage);
        assignment.focusAllyName = shouldFocus
          ? focusCandidate?.name || null
          : null;

        if (assignment.focusAllyName) {
          assignment.mode = "assist_focus";
          assignment.crab = [];
          const preferred = listFarmersByPreference(available);
          const targetSize = Math.min(3, Math.max(1, farmerCount));
          assignment.monsterhunt = preferred.slice(0, targetSize);
        }

        const canReuseRecentHuntRally =
          Boolean(target) && st.lastAssignment?.huntTarget === target;
        const rallySource = canReuseRecentHuntRally
          ? recentHuntStats
              .map((it) => it.stat)
              .find(
                (s) =>
                  s &&
                  typeof s.x === "number" &&
                  typeof s.y === "number" &&
                  typeof s.map === "string",
              )
          : null;
        assignment.huntRallyPoint = rallySource
          ? { map: rallySource.map, x: rallySource.x, y: rallySource.y }
          : {
              map: character.map,
              x: Number(character.x || 0),
              y: Number(character.y || 0),
            };

        // If we have a small active farmer squad and no dedicated crab role,
        // keep everyone active on hunt instead of idling one character.
        if (!assignment.crab?.length && farmerCount > 0 && farmerCount <= 3) {
          const preferred = listFarmersByPreference(available);
          const targetSize = Math.min(3, farmerCount);
          const huntSet = new Set(assignment.monsterhunt || []);
          for (const name of preferred) {
            if (huntSet.size >= targetSize) break;
            huntSet.add(name);
          }
          assignment.monsterhunt = Array.from(huntSet).slice(0, targetSize);
        }

        assignment.huntTarget = target || null;
        assignment.taskKey = getTaskKey(assignment);
        st.lastTaskKey = assignment.taskKey;

        const participants = Array.from(
          new Set([
            ...(assignment.monsterhunt || []),
            ...(assignment.crab || []),
          ]),
        );
        const wipeCount = Number(st.wipeByTask.get(assignment.taskKey) || 0);
        const shouldRegroup =
          !manualFarmMob &&
          assignment.priestActive &&
          participants.length > 0 &&
          wipeCount >= Number(nf.partyWipesBeforeAbort || 2);

        if (shouldRegroup) {
          assignment.mode = "regroup_tracker";
          assignment.regroup = {
            reason: "double_party_wipe",
            dest: getSafeSpot(),
          };
          assignment.crab = [];
          assignment.monsterhunt = participants;
          assignment.huntTarget = null;
          emitTracker();
        }

        st.lastAssignment = assignment;
        st.lastAssignmentAt = now();

        const sig = assignmentSignature(assignment);
        const changed = sig !== st.lastBroadcastSig;
        const stale = now() - st.lastBroadcastAt > 3000;

        if (changed || !st.roleAcksBySig.has(sig)) {
          st.roleAcksBySig.set(sig, new Set());
        }

        try {
          if (changed || stale) {
            for (const name of roster) {
              if (name === character.name) continue;
              if (meta.get(name)?.ctype === "merchant") continue;
              const acked = st.roleAcksBySig.get(sig)?.has(name);
              if (acked) continue;
              send_cm(name, { cmd: "farm:roles", assignment, sig });
            }
            st.lastBroadcastSig = sig;
            st.lastBroadcastAt = now();
          }
        } catch {
          // ignore
        }
      }

      const assignment = st.lastAssignment;
      if (!assignment) return;

      const nowForPosition = now();
      const movedSincePersist = Number.isFinite(
        distance?.(character, st.lastPositionPersistPoint),
      )
        ? distance(character, st.lastPositionPersistPoint)
        : Infinity;
      const shouldPersistPosition =
        !st.lastPositionPersistAt ||
        nowForPosition - st.lastPositionPersistAt >= 12000 ||
        !Number.isFinite(movedSincePersist) ||
        movedSincePersist >= 80 ||
        st.lastPositionPersistMap !== character?.map;

      if (shouldPersistPosition && savePosition()) {
        st.lastPositionPersistAt = nowForPosition;
        st.lastPositionPersistMap = character?.map || null;
        st.lastPositionPersistPoint = {
          x: Number(character?.x || 0),
          y: Number(character?.y || 0),
        };
      }

      const isTiny = assignment.crab?.includes(character.name);
      const isHunt = assignment.monsterhunt?.includes(character.name);
      const localForcedHunt = Boolean(manualFarmMobSelf);
      const worldEvent = assignment.worldEvent ?? null;
      const defaultCrabHold = isConfiguredCrabRanger(currentCfg || cfg);
      const explicitCrabHold =
        crabHoldSelf == null ? st.crabHoldOverride : Boolean(crabHoldSelf);
      const crabHoldActive =
        !worldEvent &&
        !localForcedHunt &&
        (explicitCrabHold == null
          ? defaultCrabHold
          : Boolean(explicitCrabHold) && defaultCrabHold);
      const effectiveIsTiny = (isTiny || crabHoldActive) && !localForcedHunt;
      const effectiveIsHunt = isHunt || localForcedHunt;
      const sharedTarget = manualFarmMobSelf || assignment.huntTarget || null;
      const huntRallyPoint = assignment.huntRallyPoint ?? null;
      const focusAllyName = assignment.focusAllyName ?? null;
      const huntGroupNames = assignment.monsterhunt ?? [];
      const shouldSkipMeleePorcupine =
        effectiveIsHunt &&
        isPorcupineTarget(sharedTarget) &&
        isMeleeCtype(character?.ctype);

      if (effectiveIsHunt) {
        const recipients = huntGroupNames.filter(
          (name) => name && name !== character.name,
        );
        const movedSinceBroadcast = Number.isFinite(
          distance?.(character, st.lastPositionCmPoint),
        )
          ? distance(character, st.lastPositionCmPoint)
          : Infinity;
        const shouldBroadcastPosition =
          recipients.length > 0 &&
          (!st.lastPositionCmBroadcastAt ||
            nowForPosition - st.lastPositionCmBroadcastAt >= 15000 ||
            !Number.isFinite(movedSinceBroadcast) ||
            movedSinceBroadcast >= 120 ||
            st.lastPositionCmMap !== character?.map);

        if (shouldBroadcastPosition) {
          const message = {
            cmd: "farm:position",
            id: character.id,
            server: {
              region: server?.region || null,
              id: server?.id || null,
            },
            time: new Date().toISOString(),
            in: character?.in,
            map: character?.map,
            x: Number(character?.x || 0),
            y: Number(character?.y || 0),
          };

          for (const name of recipients) {
            try {
              send_cm(name, message);
            } catch {
              // ignore
            }
          }

          st.lastPositionCmBroadcastAt = nowForPosition;
          st.lastPositionCmMap = character?.map || null;
          st.lastPositionCmPoint = {
            x: Number(character?.x || 0),
            y: Number(character?.y || 0),
          };
        }
      }

      if (
        chainCfg.enabled &&
        chainCfg.npcMageName &&
        character?.name === chainCfg.npcMageName
      ) {
        const nearNpc =
          character?.map === "main" &&
          Number.isFinite(distance?.(character, { x: -278, y: -10 })) &&
          distance(character, { x: -278, y: -10 }) <= 120;
        if (!nearNpc) {
          if (!smart?.moving) {
            if (st.mover) {
              st.mover.request({
                dest: "monsterhunter",
                key: "hunt_chain_npc_mage_hold",
                priority: 1,
                cooldownMs: 10000,
              });
            } else {
              try {
                smart_move("monsterhunter");
              } catch {
                // ignore
              }
            }
          }
        }
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
        return;
      }

      if (worldEvent && effectiveIsHunt && !localForcedHunt) {
        await runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
      } else {
        if (effectiveIsTiny) await runCrab({ cfg, mover: st.mover });
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
      if (character.ctype === "mage")
        await runMageSupport({ assigned: effectiveIsHunt });
      if (character.ctype === "priest") await runPriestSupport({ cfg });
    } catch (e) {
      warn("No-event farming loop error", e);
    } finally {
      scheduleNext();
    }
  };

  loop();

  const stopRoutine = () => {
    if (st.stopped) return;
    st.stopped = true;

    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;

    try {
      for (const off of st.offHandlers) {
        if (typeof off === "function") off();
      }
    } catch {
      // ignore
    }
    st.offHandlers = [];

    try {
      if (globalThis[singletonKey] === instance) {
        globalThis[singletonKey] = null;
      }
    } catch {
      // ignore
    }
  };

  const instance = {
    stopRoutine,
    dispose: () => {
      stopRoutine();
    },
    [Symbol.dispose]: () => {
      stopRoutine();
    },
    [Symbol.asyncDispose]: async () => {
      stopRoutine();
    },
  };

  try {
    globalThis[singletonKey] = instance;
  } catch {
    // ignore
  }

  return instance;
};

module.exports = {
  installNoEventFarming,
};
