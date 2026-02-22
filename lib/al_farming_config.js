const { getConfig } = await require("./al_config.js");
const { warn, info } = await require("./al_debug_log.js");
const { getRosterMeta, compareByMeta } = await require("./fn_roster.js");
const { getActiveNames } = await require("./group_party.js");
const {
  runCrab,
  runMonsterhunt,
  runWorldEvent,
  runMageSupport,
  runPriestSupport,
} = await require("./combat_standard.js");
const { onCharacter } = await require("./domains/events/listeners.js");
const { now } = await require("./fn_time.js");
const { createMoveManager } =
  await require("./domains/movement/move_manager.js");
const { getActiveJoinableEvents, getActiveWorldEvents, pickWorldEvent } =
  await require("./fn_server_events.js");

const getCharacterMeta = (roster) => getRosterMeta(roster);

const getMonsterhuntTarget = () => {
  try {
    const s = character?.s?.monsterhunt;
    if (!s || typeof s !== "object") return null;
    return (
      s.id ||
      s.target ||
      s.monster ||
      s.name ||
      s.mtype ||
      (typeof s === "string" ? s : null)
    );
  } catch {
    return null;
  }
};

const needsMonsterhuntTurnIn = () => {
  try {
    const s = character?.s?.monsterhunt;
    if (!s || typeof s !== "object") return false;
    const c = Number(s.c);
    // If count is missing or non-positive, treat as ready to turn in.
    if (!Number.isFinite(c)) return true;
    return c <= 0;
  } catch {
    return false;
  }
};

const getMonsterStats = (mtype) => {
  try {
    if (!mtype || !G?.monsters?.[mtype]) return null;
    const def = G.monsters[mtype];
    return {
      mtype,
      hp: def.hp || 0,
      attack: def.attack || 0,
      xp: def.xp || 0,
      gold: def.gold || 0,
    };
  } catch {
    return null;
  }
};

const pickNames = (list, count) => list.slice(0, Math.max(0, count));

const selectPair = ({ stats, available, exclude = [] } = {}) => {
  const excl = new Set(exclude);
  const rangers = available.ranger.filter((n) => !excl.has(n));
  const priests = available.priest.filter((n) => !excl.has(n));
  const paladins = available.paladin.filter((n) => !excl.has(n));
  const warriors = available.warrior.filter((n) => !excl.has(n));
  const rogues = available.rogue.filter((n) => !excl.has(n));
  const mages = available.mage.filter((n) => !excl.has(n));

  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;

  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};

  const weak =
    hp <= nf.weakMaxHp && attack <= nf.weakMaxAttack && rangers.length >= 2;
  const highAttack = attack >= nf.highAttack;
  const highHp = hp >= nf.highHp;
  const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;

  if (weak) return pickNames(rangers, 2);
  if (highAttack && highHp && priests.length && paladins.length)
    return [priests[0], paladins[0]];
  if (highAttack && priests.length && warriors.length)
    return [priests[0], warriors[0]];
  if (longFight && priests.length && rogues.length)
    return [priests[0], rogues[0]];
  if (paladins.length && rogues.length) return [paladins[0], rogues[0]];

  // Fallback: highest available by preference
  const pref = [
    ...paladins,
    ...priests,
    ...warriors,
    ...rogues,
    ...rangers,
    ...mages,
  ];
  return pickNames(pref, 2);
};

const selectThree = ({ stats, available } = {}) => {
  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;
  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};

  const priests = available.priest;
  const paladins = available.paladin;
  const warriors = available.warrior;
  const rogues = available.rogue;
  const rangers = available.ranger;
  const mages = available.mage;

  const highAttack = attack >= nf.highAttack;
  const highHp = hp >= nf.highHp;
  const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;

  let trio = [];

  if (highAttack && highHp) {
    if (priests.length) trio.push(priests[0]);
    if (paladins.length) trio.push(paladins[0]);
    if (warriors.length) trio.push(warriors[0]);
  } else if (highAttack) {
    if (priests.length) trio.push(priests[0]);
    if (warriors.length) trio.push(warriors[0]);
    if (paladins.length) trio.push(paladins[0]);
  } else if (longFight) {
    if (priests.length) trio.push(priests[0]);
    if (rogues.length) trio.push(rogues[0]);
    if (paladins.length) trio.push(paladins[0]);
  } else {
    if (paladins.length) trio.push(paladins[0]);
    if (rogues.length) trio.push(rogues[0]);
    if (priests.length) trio.push(priests[0]);
  }

  const used = new Set(trio);
  const fallback = [
    ...warriors,
    ...rogues,
    ...rangers,
    ...mages,
    ...paladins,
    ...priests,
  ].filter((n) => !used.has(n));

  while (trio.length < 3 && fallback.length) trio.push(fallback.shift());

  return trio.slice(0, 3);
};

const selectBurst = ({ available } = {}) => {
  const rangers = available.ranger;
  const mages = available.mage;

  if (rangers.length >= 2 && mages.length >= 1) {
    return [rangers[0], rangers[1], mages[0]];
  }

  if (mages.length >= 2 && rangers.length >= 1) {
    return [mages[0], mages[1], rangers[0]];
  }

  return [];
};

const chooseLeader = (roster, meta) => {
  const farmerRoster = roster.filter((n) => meta.get(n)?.ctype !== "merchant");
  if (!farmerRoster.length) return null;

  const nonRangers = farmerRoster.filter(
    (n) => meta.get(n)?.ctype !== "ranger",
  );
  if (nonRangers.length) return nonRangers[0];
  return farmerRoster[0];
};

const buildAvailableByClass = (roster, meta) => {
  const available = {
    ranger: [],
    priest: [],
    paladin: [],
    warrior: [],
    rogue: [],
    mage: [],
  };

  for (const name of roster) {
    const ctype = meta.get(name)?.ctype;
    if (!ctype || ctype === "merchant") continue;
    if (available[ctype]) available[ctype].push(name);
  }

  for (const k of Object.keys(available)) {
    available[k].sort((a, b) => compareByMeta(a, b, meta));
  }
  return available;
};

const determineAssignment = ({
  roster,
  meta,
  stats,
  available: provided,
} = {}) => {
  const available = provided || buildAvailableByClass(roster, meta);
  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};
  const crabRangerName = nf.crabRangerName || available.ranger[0] || null;

  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;

  const weak = hp <= nf.weakMaxHp && attack <= nf.weakMaxAttack;
  const highAttack = attack >= nf.highAttack;
  const highHp = hp >= nf.highHp;
  const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;
  const difficult = highAttack || highHp || longFight;

  let crab = [];
  let monsterhunt = [];
  let mode = difficult ? "difficult" : weak ? "weak" : "default";

  if (difficult) {
    monsterhunt = selectThree({ stats, available });
    if (!monsterhunt.length) monsterhunt = selectPair({ stats, available });
    crab = [];
  } else {
    if (available.ranger.length) {
      if (available.ranger.includes(crabRangerName)) {
        crab = [crabRangerName];
      } else {
        crab = [available.ranger[0]];
      }
    }

    const exclude = new Set(crab);
    monsterhunt = selectPair({
      stats,
      available,
      exclude: Array.from(exclude),
    });

    if (!monsterhunt.length && weak) {
      monsterhunt = selectBurst({ available });
    }
  }

  // Enforce max farmers = 3
  if (crab.length + monsterhunt.length > 3) {
    monsterhunt = monsterhunt.slice(0, Math.max(0, 3 - crab.length));
  }

  return { mode, crab, monsterhunt };
};

const selectWorldFarmers = ({ stats, available } = {}) => {
  const trio = selectThree({ stats, available });
  return trio.slice(0, 3);
};

const listFarmersByPreference = (available = {}) => [
  ...(available.priest || []),
  ...(available.warrior || []),
  ...(available.paladin || []),
  ...(available.rogue || []),
  ...(available.ranger || []),
  ...(available.mage || []),
];

const assignmentSignature = (assignment) => {
  if (!assignment || typeof assignment !== "object") return "";
  const sig = {
    mode: assignment.mode || null,
    crab: Array.isArray(assignment.crab) ? [...assignment.crab].sort() : [],
    monsterhunt: Array.isArray(assignment.monsterhunt)
      ? [...assignment.monsterhunt].sort()
      : [],
    huntTarget: assignment.huntTarget || null,
    worldEvent: assignment.worldEvent
      ? {
          name: assignment.worldEvent.name || null,
          map: assignment.worldEvent.map || null,
          x: Number(assignment.worldEvent.x || 0),
          y: Number(assignment.worldEvent.y || 0),
        }
      : null,
    huntRallyPoint: assignment.huntRallyPoint
      ? {
          map: assignment.huntRallyPoint.map || null,
          x: Number(assignment.huntRallyPoint.x || 0),
          y: Number(assignment.huntRallyPoint.y || 0),
        }
      : null,
    focusAllyName: assignment.focusAllyName || null,
    regroup: assignment.regroup || null,
    priestActive: Boolean(assignment.priestActive),
    taskKey: assignment.taskKey || null,
  };
  try {
    return JSON.stringify(sig);
  } catch {
    return String(Date.now());
  }
};

const installNoEventFarming = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const singletonKey = `__AL_NO_EVENT_FARMING_INSTANCE__${character?.name || "unknown"}`;
  try {
    const prev = globalThis[singletonKey];
    if (prev && typeof prev.stop === "function") prev.stop();
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
    lastStatusBroadcastAt: 0,
    wipeByTask: new Map(),
    deathsByTask: new Map(),
    lastTaskKey: null,
    lastTrackerEmitAt: 0,
    roleAcksBySig: new Map(),
    lastRoleAckSentSig: null,
    logState: new Map(),
    timer: null,
    offHandlers: [],
    fastTickUntil: 0,
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

      if (data.cmd === "farm:roles_ack") {
        const sig = typeof data.sig === "string" ? data.sig : null;
        if (!sig) return;
        if (!st.roleAcksBySig.has(sig)) st.roleAcksBySig.set(sig, new Set());
        st.roleAcksBySig.get(sig).add(m.name);
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
      if (character.ctype === "merchant") return;

      if (getActiveJoinableEvents().length) return;

      const roster = Array.from(
        new Set([...(getActiveNames() || []), character?.name].filter(Boolean)),
      ).sort();
      if (!roster.length) return;

      const meta = getCharacterMeta(roster);
      const leader = chooseLeader(roster, meta);
      st.leader = leader;

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
      if (nowMs - st.lastStatusBroadcastAt > 1200) {
        st.lastStatusBroadcastAt = nowMs;
        try {
          for (const name of roster) {
            if (name === character.name) continue;
            if (meta.get(name)?.ctype === "merchant") continue;
            send_cm(name, { cmd: "farm:status", status });
          }
        } catch {
          // ignore
        }
      }

      if (!leader) return;

      // Only the leader should churn turn-ins / fetch new hunts.
      // Followers keep farming their last assignment while leader rotates tasks.
      if (character.name === leader && needsMonsterhuntTurnIn()) {
        const nowMs = now();
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

        let target = getMonsterhuntTarget();
        if (!target) {
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

        const dangerRecent =
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

        const rallySource = recentHuntStats
          .map((it) => it.stat)
          .find(
            (s) =>
              s &&
              typeof s.x === "number" &&
              typeof s.y === "number" &&
              typeof s.map === "string",
          );
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

      const isTiny = assignment.crab?.includes(character.name);
      const isHunt = assignment.monsterhunt?.includes(character.name);
      const sharedTarget = assignment.huntTarget ?? null;
      const worldEvent = assignment.worldEvent ?? null;
      const huntRallyPoint = assignment.huntRallyPoint ?? null;
      const focusAllyName = assignment.focusAllyName ?? null;
      const huntGroupNames = assignment.monsterhunt ?? [];

      if (assignment.mode === "regroup_tracker") {
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

      if (worldEvent && isHunt) {
        await runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
      } else {
        if (isTiny) await runCrab({ cfg, mover: st.mover });
        if (isHunt)
          await runMonsterhunt({
            cfg,
            targetOverride: sharedTarget,
            getTarget: getMonsterhuntTarget,
            mover: st.mover,
            rallyPoint: huntRallyPoint,
            focusAllyName,
            huntGroupNames,
          });
      }
      if (character.ctype === "mage")
        await runMageSupport({ assigned: isHunt });
      if (character.ctype === "priest") await runPriestSupport({ cfg });
    } catch (e) {
      warn("No-event farming loop error", e);
    } finally {
      scheduleNext();
    }
  };

  loop();

  const stop = () => {
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
    stop,
    dispose: () => {
      stop();
    },
    [Symbol.dispose]: () => {
      stop();
    },
    [Symbol.asyncDispose]: async () => {
      stop();
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
