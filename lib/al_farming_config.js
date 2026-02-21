const { getConfig } = await require("./al_config.js");
const { warn } = await require("./al_debug_log.js");
const { getRosterNames, getRosterMeta, compareByMeta } =
  await require("./fn_roster.js");
const { getActiveNames } = await require("./group_party.js");
const { runCrab, runMonsterhunt, runWorldEvent, runMageSupport } =
  await require("./combat_standard.js");
const { onCharacter } = await require("./event_listeners.js");
const { now } = await require("./fn_time.js");
const { createMoveManager } = await require("./st_smart_move.js");
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

const installNoEventFarming = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastAssignment: null,
    lastAssignmentAt: 0,
    leader: null,
    mover: createMoveManager(),
    lastTurnInRequest: 0,
    lastHuntDanger: null,
  };

  const handler = (m) => {
    try {
      if (!m || !m.message) return;
      const data = m.message;
      if (data.cmd === "farm:roles") {
        st.lastAssignment = data.assignment || null;
        st.lastAssignmentAt = now();
        return;
      }

      if (data.cmd === "farm:hunt_danger") {
        st.lastHuntDanger = { ...data, at: now() };
        return;
      }
    } catch {
      // ignore
    }
  };

  onCharacter("cm", handler);

  const loop = async () => {
    if (st.stopped) return;

    try {
      if (character.ctype === "merchant") return;
      if (character.rip) return;

      // If our monsterhunt is complete (c <= 0 or missing), turn it in before anything else.
      if (needsMonsterhuntTurnIn()) {
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
        // Skip other farming actions while we handle turn-in.
        return;
      }

      if (getActiveJoinableEvents().length) return;

      const roster = Array.from(
        new Set([...(getActiveNames() || []), character?.name].filter(Boolean)),
      ).sort();
      if (!roster.length) return;

      const meta = getCharacterMeta(roster);
      const leader = chooseLeader(roster, meta);
      st.leader = leader;

      if (!leader) return;

      if (character.name === leader) {
        const available = buildAvailableByClass(roster, meta);
        const worldEvents = getActiveWorldEvents();
        const worldEvent = pickWorldEvent(worldEvents);

        if (worldEvent) {
          const stats = getMonsterStats(worldEvent.name);
          const worldFarmers = selectWorldFarmers({ stats, available });
          const assignment = {
            mode: "world_event",
            crab: [],
            monsterhunt: worldFarmers,
            huntTarget: null,
            worldEvent,
          };

          st.lastAssignment = assignment;
          st.lastAssignmentAt = now();

          try {
            for (const name of roster) {
              if (name === character.name) continue;
              send_cm(name, { cmd: "farm:roles", assignment });
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

        assignment.huntTarget = target || null;
        st.lastAssignment = assignment;
        st.lastAssignmentAt = now();

        try {
          for (const name of roster) {
            if (name === character.name) continue;
            send_cm(name, { cmd: "farm:roles", assignment });
          }
        } catch {
          // ignore
        }
      }

      const assignment = st.lastAssignment;
      const ttlOk = now() - st.lastAssignmentAt < 12000;
      if (!assignment || !ttlOk) return;

      const isTiny = assignment.crab?.includes(character.name);
      const isHunt = assignment.monsterhunt?.includes(character.name);
      const sharedTarget = assignment.huntTarget ?? null;
      const worldEvent = assignment.worldEvent ?? null;

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
          });
      }
      if (character.ctype === "mage")
        await runMageSupport({ assigned: isHunt });
    } catch (e) {
      warn("No-event farming loop error", e);
    } finally {
      setTimeout(() => void loop(), 500);
    }
  };

  loop();

  return {
    stop: () => {
      st.stopped = true;
      try {
        handler.delete = true;
      } catch {
        // ignore
      }
    },
  };
};

module.exports = {
  installNoEventFarming,
};
