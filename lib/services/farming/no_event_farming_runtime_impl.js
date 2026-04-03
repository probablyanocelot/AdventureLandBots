const { getConfig } = await require("../../config/index.js");
const { warn, info } = await require("../../al_debug_log.js");
const { time, roster, movement } = await require("../helpers/index.js");
const { getActiveJoinableEvents, getActiveWorldEvents, pickWorldEvent } =
  await require("../events/server_event_catalog.js");
const { isInJoinableEvent: isInCombatJoinableEvent } =
  await require("../combat/event_combat_runtime.js");
const {
  runCrab,
  runMonsterhunt,
  runWorldEvent,
  runMageSupport,
  runPriestSupport,
} = await require("../combat/index.js");
const { onCharacter } = await require("../events/index.js");
const {
  getKnownCharacters,
  getKnownOnlineNames,
  listOfflineFarmerNamesByType,
  resolveCharacterName,
  isCharacterOnline,
} = await require("./character_registry.js");
const {
  getMonsterhuntTarget,
  getMonsterhuntTargetForName,
  needsMonsterhuntTurnIn,
  isNameHoldingAggroOfType,
} = await require("./monsterhunt_state.js");
const {
  requestMageMagiport,
  waitForMageMagiportResult,
  stopCharacterSafe,
  ensureChainMageRunning,
} = await require("./chain_mage.js");
const { assignmentSignature } = await require("./signature.js");
const {
  getMonsterStats,
  selectPair,
  selectThree,
  chooseLeader,
  pickRoleName,
  selectPreferredCrabRanger,
  buildAvailableByClass,
  determineAssignment,
  selectWorldFarmers,
  listFarmersByPreference,
} = await require("./selection.js");
const { getActiveNames, ensureCharacterRunningBySwap } =
  await require("../party/index.js");
const {
  PORCUPINE_SWAP_CODE_SLOT,
  isPorcupineTarget,
  isMeleeCtype,
  getManualFarmMob,
  getManualFarmMobSelf,
  savePosition,
} = await require("./runtime_helpers.js");
const { createNoEventFarmingCmHandler } =
  await require("./no_event_farming_cm_handler.js");
const { buildNoEventLeaderAssignment } =
  await require("./no_event_farming_assignment_builder.js");
const { handleNoEventLeaderWorldEventFlow } =
  await require("./no_event_farming_world_event_flow.js");
const { handleNoEventLeaderHuntChainFlow } =
  await require("./no_event_farming_hunt_chain_flow.js");
const { publishNoEventLeaderAssignment } =
  await require("./no_event_farming_assignment_publish.js");
const { handleNoEventPositionFlow } =
  await require("./no_event_farming_position_flow.js");
const { handleNoEventNpcMageHold } =
  await require("./no_event_farming_npc_hold_flow.js");
const { handleKaneCrabRoutine } = await require("./kane.js");
const { handleNoEventExecutionTail } =
  await require("./no_event_farming_execution_flow.js");
const { DEFAULT_MONSTER_NAMES: RARE_MOB_NAMES } =
  await require("../events/rare_mob_scanner.js");

const getCharacterMeta = (rosterNames) => roster.getRosterMeta(rosterNames);

const isConfiguredCrabRanger = (cfg, name = character?.name) => {
  const configured = resolveCharacterName(cfg?.noEventFarming?.crabRangerName);
  return Boolean(configured && name && configured === name);
};

const installNoEventFarming = ({ cfg } = {}) => {
  cfg = cfg || getConfig();
  const now = () => time.now();

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
    const TRACKER_EMIT_ENABLED = false;
    if (!TRACKER_EMIT_ENABLED) return;

    const ts = time.now();
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
    mover: movement.createMoveManager(),
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
    mvampireSweep: null,
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
    availableByClass: null,
    rangerCount: 0,
    blockedRangers: new Set(),
  };

  const bumpFastTick = (ms = 2200) => {
    const until = time.now() + Math.max(300, Number(ms || 0));
    st.fastTickUntil = Math.max(st.fastTickUntil || 0, until);
  };

  const scheduleNext = () => {
    if (st.stopped) return;
    const delay = time.now() < st.fastTickUntil ? loopBurstMs : loopBaseMs;
    st.timer = setTimeout(() => void loop(), delay);
  };

  const logOnce = (key, message, data = null, cooldownMs = 12000) => {
    const ts = time.now();
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

  const handler = createNoEventFarmingCmHandler({
    cfg,
    st,
    now,
    sendCm: send_cm,
    characterName: character.name,
    characterCtype: character?.ctype,
    assignmentSignature,
    resolveCharacterName,
    setStoreFn: typeof set === "function" ? set : null,
    markDeathForTask,
    bumpFastTick,
  });

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

      const eventCombatEnabled = Boolean(
        (currentCfg || cfg)?.eventCombat?.enabled,
      );
      if (eventCombatEnabled && isInCombatJoinableEvent()) {
        return;
      }

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

      const nowMs = time.now();
      bumpFastTick(1000);

      let shouldHoldCrabForHighestLuckRanger = false;
      let allowHighestLuckRangerInWorldEvent = false;

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

      const huntChainResult = await handleNoEventLeaderHuntChainFlow({
        cfg,
        st,
        now,
        characterName: character.name,
        leader,
        manualFarmMob,
        chainCfg,
        liveTarget,
        chainWarriorName,
        chainPriestName,
        chainHuntMageName,
        chainNpcMageName,
        needsMonsterhuntTurnIn,
        getMonsterhuntTarget,
        isNameHoldingAggroOfType,
        ensureChainMageRunning,
        requestMageMagiport,
        waitForMageMagiportResult,
        isCharacterOnline,
        stopCharacterSafe,
        logOnce,
        ensureMoveToMonsterhunter: () => {
          if (smart?.moving) return;
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
        },
        interactMonsterhunt: () => {
          interact("monsterhunt");
        },
      });
      if (huntChainResult?.abortLoop) return;

      if (character.name === leader) {
        const available = buildAvailableByClass(roster, meta);
        st.availableByClass = available;
        st.rangerCount = Array.isArray(available?.ranger)
          ? available.ranger.length
          : 0;
        const farmerCount = Object.values(available).reduce(
          (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
          0,
        );
        const worldEvents = getActiveWorldEvents();
        const worldEvent = pickWorldEvent(worldEvents);
        const priestActive = Boolean((available?.priest || []).length);

        const highestLuckRanger = selectPreferredCrabRanger({
          available,
          meta,
          preferredName: cfg?.noEventFarming?.crabRangerName,
        });
        const isCurrentHighestLuckRanger =
          character?.ctype === "ranger" &&
          character?.name &&
          character.name === highestLuckRanger;

        const highestLuckRangerCrabHold =
          cfg?.noEventFarming?.highestLuckRangerCrabHold !== false;
        const highestLuckRangerRareMobRadius = Math.max(
          1,
          Number(cfg?.noEventFarming?.highestLuckRangerRareMobRadius || 320),
        );
        const highestLuckRangerEggLuckThresholdMs = Math.max(
          0,
          Number(
            cfg?.noEventFarming?.highestLuckRangerEggLuckThresholdMs ||
              4 * 3600 * 1000,
          ),
        );

        const hasNearbyRareMob = Boolean(
          Object.values(parent?.entities || {}).some((entity) => {
            if (!entity || entity?.type !== "monster" || entity?.dead) {
              return false;
            }
            const mtype = String(entity?.mtype || "").toLowerCase();
            if (!RARE_MOB_NAMES.includes(mtype)) return false;
            if (typeof distance !== "function") return false;
            try {
              return (
                distance(character, entity) <= highestLuckRangerRareMobRadius
              );
            } catch {
              return false;
            }
          }),
        );

        const easterLuckMs = Number(character?.s?.easterluck || 0);
        const isEgghuntSeason = Boolean(parent?.S?.egghunt);
        const isLowEasterLuck =
          isEgghuntSeason &&
          easterLuckMs > 0 &&
          easterLuckMs <= highestLuckRangerEggLuckThresholdMs;

        shouldHoldCrabForHighestLuckRanger =
          isCurrentHighestLuckRanger &&
          highestLuckRangerCrabHold &&
          !hasNearbyRareMob &&
          !isLowEasterLuck;

        allowHighestLuckRangerInWorldEvent =
          isCurrentHighestLuckRanger && (hasNearbyRareMob || isLowEasterLuck);

        if (worldEvent) {
          const worldResult = await handleNoEventLeaderWorldEventFlow({
            cfg,
            st,
            now,
            roster,
            meta,
            characterName: character.name,
            available,
            worldEvent,
            getTaskKey,
            assignmentSignature,
            sendCm: send_cm,
            getMonsterStats,
            selectWorldFarmers,
            runWorldEvent,
            runMageSupport,
            isMage: character.ctype === "mage",
            skipRangerName:
              !allowHighestLuckRangerInWorldEvent && highestLuckRanger
                ? highestLuckRanger
                : null,
            blockedRangers: st.blockedRangers,
          });
          if (worldResult?.handled) return;
        }

        const assignment = await buildNoEventLeaderAssignment({
          cfg,
          nf,
          st,
          now,
          nowMs,
          roster,
          meta,
          available,
          farmerCount,
          priestActive,
          manualFarmMob,
          chainCfg,
          chainWarriorName,
          chainPriestName,
          chainHuntMageName,
          chainNpcMageName,
          getMonsterhuntTarget,
          getMonsterStats,
          determineAssignment,
          listFarmersByPreference,
          selectThree,
          selectPair,
          isPorcupineTarget,
          getKnownOnlineNames,
          getKnownCharacters,
          isMeleeCtype,
          listOfflineFarmerNamesByType,
          ensureCharacterRunningBySwap,
          PORCUPINE_SWAP_CODE_SLOT,
          bumpFastTick,
          logOnce,
          getSafeSpot,
          emitTracker,
        });
        assignment.taskKey = getTaskKey(assignment);
        st.lastTaskKey = assignment.taskKey;
        publishNoEventLeaderAssignment({
          st,
          now,
          assignment,
          assignmentSignature,
          roster,
          meta,
          characterName: character.name,
          sendCm: send_cm,
          staleMs: 3000,
        });
      }

      const assignment = st.lastAssignment;
      if (!assignment) return;

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
      const effectiveIsTinyForKane =
        effectiveIsTiny || manualFarmMobSelf === "crab";
      const effectiveIsHunt = isHunt || localForcedHunt;
      const sharedTarget = manualFarmMobSelf || assignment.huntTarget || null;
      const huntRallyPoint = assignment.huntRallyPoint ?? null;
      const focusAllyName = assignment.focusAllyName ?? null;
      const huntGroupNames = assignment.monsterhunt ?? [];
      const shouldSkipMeleePorcupine =
        effectiveIsHunt &&
        isPorcupineTarget(sharedTarget) &&
        isMeleeCtype(character?.ctype);

      handleNoEventPositionFlow({
        st,
        now,
        character,
        server,
        savePosition,
        distanceFn: typeof distance === "function" ? distance : null,
        broadcastRecipients: effectiveIsHunt ? huntGroupNames : [],
        sendCm: send_cm,
      });

      handleNoEventNpcMageHold({
        st,
        chainCfg,
        character,
        distanceFn: typeof distance === "function" ? distance : null,
        requestMoveToMonsterhunter: () => {
          if (smart?.moving) return;
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
        },
      });

      const executionResult = await handleNoEventExecutionTail({
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
        characterCtype: character.ctype,
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
      });
      if (executionResult?.abortLoop) return;
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
