const { getConfig } = await require("../../config/index.js");
const { warn, info } = await require("../../al_debug_log.js");
const { time, roster, movement } = await require("../helpers/index.js");
const { getActiveWorldEvents, pickWorldEvent, isJoinableEventService } =
  await require("../server-events/index.js");
const {
  runWorldEvent,
  runMageSupport,
  runPriestSupport,
  isInJoinableEvent: isInCombatJoinableEvent,
} = await require("../combat/index.js");
const { runCrab, runMonsterhunt } = await require("./monsterhunt_runner.js");
const { onCharacter } = await require("../runtime-listeners/index.js");
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

const isCrabxxEventContext = () => {
  try {
    const inValue = String(character?.in || "").toLowerCase();
    if (inValue === "crabxx" || inValue === "crabrave") return true;
    const mapValue = String(character?.map || "").toLowerCase();
    if (mapValue === "crabxx" || mapValue === "crabrave") return true;
    return false;
  } catch {
    return false;
  }
};

const hasVisibleCrabxx = () => {
  try {
    const entities = parent?.entities || {};
    for (const id in entities) {
      const entity = entities[id];
      if (!entity || entity.type !== "monster" || entity.dead) continue;
      if (entity.mtype === "crabxx" || entity.id === "crabxx") return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const readStatusMs = (value) => {
  try {
    if (value == null) return 0;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return 0;
      return Math.max(0, value);
    }
    if (typeof value === "object") {
      const ms = Number(value?.ms);
      if (!Number.isFinite(ms)) return 0;
      return Math.max(0, ms);
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
  } catch {
    return 0;
  }
};

const isInJoinableEventContext = () => {
  try {
    if (hasVisibleCrabxx()) return true;
    if (isCrabxxEventContext()) return true;
    const currentEvent = character?.in;
    if (currentEvent && isJoinableEventService(currentEvent)) return true;
    return false;
  } catch {
    return false;
  }
};

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
const { createFarmingCmHandler } = await require("./farming_cm_handler.js");
const { buildFarmingLeaderAssignment } =
  await require("./farming_assignment_builder.js");
const { handleFarmingLeaderWorldEventFlow } =
  await require("./farming_world_event_flow.js");
const { handleFarmingLeaderHuntChainFlow } =
  await require("./farming_hunt_chain_flow.js");
const { publishFarmingLeaderAssignment } =
  await require("./farming_assignment_publish.js");
const { handleFarmingPositionFlow } =
  await require("./farming_position_flow.js");
const { handleFarmingNpcMageHold } =
  await require("./farming_npc_hold_flow.js");
const { handleKaneCrabRoutine } = await require("./kane.js");
const { handleFarmingExecutionTail } =
  await require("./farming_execution_flow.js");
const { getFarmingConfig } = await require("./farming_config.js");

const getCharacterMeta = (rosterNames) => roster.getRosterMeta(rosterNames);

const isConfiguredCrabRanger = (cfg, name = character?.name) => {
  const configured = resolveCharacterName(getFarmingConfig(cfg).crabRangerName);
  return Boolean(configured && name && configured === name);
};

const installFarming = ({ cfg } = {}) => {
  cfg = cfg || getConfig();
  const now = () => time.now();

  const singletonKey = `__AL_FARMING_INSTANCE__${character?.name || "unknown"}`;
  try {
    const prev = globalThis[singletonKey];
    if (prev && typeof prev.stop === "function") prev.stopRoutine();
  } catch {
    // ignore
  }

  const nf = getFarmingConfig(cfg);
  const loopBaseMs = Math.max(300, Number(nf.loopBaseMs || 900));
  const loopBurstMs = Math.max(
    120,
    Math.min(loopBaseMs, Number(nf.loopBurstMs || 350)),
  );

  const getSafeSpot = () => {
    const nf = getFarmingConfig(cfg);
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

  const handler = createFarmingCmHandler({
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
      const crabHoldSelf = getFarmingConfig(currentCfg || cfg).crabHoldSelf;

      if (character.ctype === "merchant") return;

      if (isInJoinableEventContext()) return;

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

      const chainCfg = getFarmingConfig(cfg).aggroLockChain || {};
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

      const availableForRoles = buildAvailableByClass(roster, meta);

      const nowMs = time.now();
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
        easterLuckMs: readStatusMs(character?.s?.easterluck),
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

      const farmingCfg = getFarmingConfig(cfg);
      const highestLuckRanger = selectPreferredCrabRanger({
        available: availableForRoles,
        meta,
        preferredName: farmingCfg.crabRangerName,
      });
      const highestLuckRangerCrabHold =
        farmingCfg.highestLuckRangerCrabHold !== false;
      const highestLuckRangerEggLuckThresholdMs = Math.max(
        0,
        Number(
          farmingCfg.highestLuckRangerEggLuckThresholdMs || 2 * 3600 * 1000,
        ),
      );
      const highestLuckRangerEasterLuckMs = (() => {
        if (!highestLuckRanger) return 0;
        if (highestLuckRanger === character?.name) {
          return readStatusMs(character?.s?.easterluck);
        }
        return readStatusMs(st.teamStats.get(highestLuckRanger)?.easterLuckMs);
      })();
      const reserveHighestLuckRangerForEggLuck = Boolean(
        highestLuckRangerCrabHold &&
        highestLuckRanger &&
        highestLuckRangerEasterLuckMs >= highestLuckRangerEggLuckThresholdMs,
      );
      const shouldHoldCrabForHighestLuckRanger = Boolean(
        reserveHighestLuckRangerForEggLuck &&
        highestLuckRanger === character?.name,
      );
      const skipHighestLuckRangerName = reserveHighestLuckRangerForEggLuck
        ? highestLuckRanger
        : null;

      if (!leader) return;

      const liveTarget =
        manualFarmMob ||
        getMonsterhuntTargetForName(leader) ||
        getMonsterhuntTarget();

      const huntChainResult = await handleFarmingLeaderHuntChainFlow({
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
        const available = availableForRoles;
        st.availableByClass = available;
        const farmerCount = Object.values(available).reduce(
          (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
          0,
        );
        const worldEvents = getActiveWorldEvents();
        const worldEvent = pickWorldEvent(worldEvents);
        const priestActive = Boolean((available?.priest || []).length);

        if (worldEvent) {
          const worldResult = await handleFarmingLeaderWorldEventFlow({
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
            skipRangerName: skipHighestLuckRangerName,
          });
          if (worldResult?.handled) return;
        }

        const assignment = await buildFarmingLeaderAssignment({
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
        publishFarmingLeaderAssignment({
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

      const localForcedHunt = Boolean(manualFarmMobSelf);
      let assignment = st.lastAssignment;
      if (!assignment) {
        if (!localForcedHunt) return;
        assignment = {
          monsterhunt: [],
          crab: [],
          worldEvent: null,
          huntRallyPoint: null,
          focusAllyName: null,
          taskKey: "none",
        };
      }

      const isTiny = assignment.crab?.includes(character.name);
      const isHunt = assignment.monsterhunt?.includes(character.name);
      const worldEvent = localForcedHunt
        ? null
        : (assignment.worldEvent ?? null);
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
      const huntRallyPoint = localForcedHunt
        ? null
        : (assignment.huntRallyPoint ?? null);
      const focusAllyName = localForcedHunt
        ? null
        : (assignment.focusAllyName ?? null);
      const huntGroupNames = localForcedHunt
        ? []
        : (assignment.monsterhunt ?? []);
      const shouldSkipMeleePorcupine =
        effectiveIsHunt &&
        isPorcupineTarget(sharedTarget) &&
        isMeleeCtype(character?.ctype);

      handleFarmingPositionFlow({
        st,
        now,
        character,
        server,
        savePosition,
        distanceFn: typeof distance === "function" ? distance : null,
        broadcastRecipients: effectiveIsHunt ? huntGroupNames : [],
        sendCm: send_cm,
      });

      handleFarmingNpcMageHold({
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

      const executionResult = await handleFarmingExecutionTail({
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
      warn("Farming loop error", e);
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
  installFarming,
};
