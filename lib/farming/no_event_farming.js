const { getConfig } = await require("../config.js");
const { isJoinableEvent } = await require("../routines/magiport.js");
const { warn } = await require("../util/logger.js");
const { getRosterNames, getRosterMeta, compareByMeta } =
  await require("../roster_stats.js");

const now = () => Date.now();

const createMoveManager = () => {
  const state = {
    current: null,
  };

  const clearIfIdle = () => {
    try {
      if (!smart?.moving) state.current = null;
    } catch {
      // ignore
    }
  };

  const request = ({ dest, key, priority = 1, cooldownMs = 5000 } = {}) => {
    if (!dest || !key) return false;

    try {
      if (smart?.moving) return false;
    } catch {
      // ignore
    }

    clearIfIdle();
    const ts = now();

    if (state.current) {
      if (state.current.key === key && ts - state.current.at < cooldownMs) {
        return false;
      }
      // Only override if higher priority.
      if (priority <= state.current.priority) return false;
    }

    state.current = { key, priority, at: ts };
    try {
      smart_move(dest);
      return true;
    } catch {
      return false;
    }
  };

  return { request };
};

const getActiveJoinableEvents = () => {
  try {
    const active = parent?.S || {};
    return Object.keys(active).filter((name) => isJoinableEvent(name));
  } catch {
    return [];
  }
};

const getActiveWorldEvents = () => {
  try {
    const active = parent?.S || {};
    const out = [];
    for (const [name, val] of Object.entries(active)) {
      if (!val || typeof val !== "object") continue;
      if (isJoinableEvent(name)) continue;
      if (!val.live) continue;
      if (!val.map) continue;
      if (typeof val.x !== "number" || typeof val.y !== "number") continue;
      out.push({ name, ...val });
    }
    return out;
  } catch {
    return [];
  }
};

const pickWorldEvent = (events) => {
  if (!Array.isArray(events) || !events.length) return null;
  return events.slice().sort((a, b) => {
    const ah = Number(a.max_hp ?? a.hp ?? 0);
    const bh = Number(b.max_hp ?? b.hp ?? 0);
    if (ah !== bh) return bh - ah;
    return String(a.name).localeCompare(String(b.name));
  })[0];
};

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
  const nonRangers = roster.filter((n) => meta.get(n)?.ctype !== "ranger");
  if (nonRangers.length) return nonRangers[0];
  return roster[0];
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

const determineAssignment = ({ roster, meta, stats } = {}) => {
  const available = buildAvailableByClass(roster, meta);
  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};
  const crabRangerName =
    nf.crabRangerName || nf.tinycrabRangerName || "camelCase";

  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;
  const xp = stats?.xp ?? 0;
  const gold = stats?.gold ?? 0;

  const weak = hp <= nf.weakMaxHp && attack <= nf.weakMaxAttack;
  const highReward = xp >= nf.highRewardXp || gold >= nf.highRewardGold;

  let crab = [];
  let monsterhunt = [];
  let mode = "default";

  if (weak && highReward) {
    mode = "burst";
    monsterhunt = selectBurst({ available });
    if (!monsterhunt.length) mode = "three";
  }

  if (mode === "three" || (mode === "default" && highReward)) {
    mode = "three";
    monsterhunt = selectThree({ stats, available });
    crab = [];
  }

  if (mode === "default") {
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

const runTinycrab = ({ cfg, mover } = {}) => {
  if (smart?.moving) return;
  const nowMs = now();
  if (cfg._lastTinyMove && nowMs - cfg._lastTinyMove < 5000) return;

  try {
    const target = get_nearest_monster?.({ type: "crab" });
    if (target) {
      if (typeof change_target === "function") change_target(target);
      if (typeof can_attack === "function" && can_attack(target))
        attack(target);
      else if (typeof is_in_range === "function" && !is_in_range(target)) {
        if (typeof xmove === "function") xmove(target.x, target.y);
      }
      return;
    }
  } catch {
    // ignore
  }

  cfg._lastTinyMove = nowMs;
  if (mover) {
    mover.request({ dest: "crab", key: "tinycrab", priority: 1 });
  } else {
    try {
      smart_move("crab");
    } catch {
      // ignore
    }
  }
};

const runMonsterhunt = ({ cfg, targetOverride, mover } = {}) => {
  try {
    const target =
      typeof targetOverride === "string"
        ? targetOverride
        : getMonsterhuntTarget();
    if (!target) return;

    if (!smart?.moving) {
      const nowMs = now();
      if (!cfg._lastHuntMove || nowMs - cfg._lastHuntMove > 5000) {
        cfg._lastHuntMove = nowMs;
        if (mover) {
          mover.request({ dest: target, key: `hunt:${target}`, priority: 2 });
        } else {
          smart_move(target);
        }
      }
    }

    const monster = get_nearest_monster?.({ type: target });
    if (!monster) return;

    if (typeof change_target === "function") change_target(monster);
    if (typeof can_attack === "function" && can_attack(monster))
      attack(monster);
    else if (typeof is_in_range === "function" && !is_in_range(monster)) {
      if (typeof xmove === "function") xmove(monster.x, monster.y);
    }
  } catch {
    // ignore
  }
};

const runWorldEvent = ({ cfg, event, mover } = {}) => {
  if (!event) return;
  if (smart?.moving) return;
  const nowMs = now();
  if (cfg._lastWorldMove && nowMs - cfg._lastWorldMove < 5000) return;

  try {
    const monster = get_nearest_monster?.({ type: event.name });
    if (monster) {
      if (typeof change_target === "function") change_target(monster);
      if (typeof can_attack === "function" && can_attack(monster))
        attack(monster);
      else if (typeof is_in_range === "function" && !is_in_range(monster)) {
        if (typeof xmove === "function") xmove(monster.x, monster.y);
      }
      return;
    }
  } catch {
    // ignore
  }

  cfg._lastWorldMove = nowMs;
  if (mover) {
    mover.request({
      dest: { map: event.map, x: event.x, y: event.y },
      key: `world:${event.name}`,
      priority: 3,
    });
  } else {
    try {
      smart_move({ map: event.map, x: event.x, y: event.y });
    } catch {
      // ignore
    }
  }
};

const runMageSupport = ({ assigned } = {}) => {
  if (assigned) return;
  try {
    if (is_on_cooldown("energize")) return;
    const party = parent?.party;
    if (!party) return;
    const names = Object.keys(party).filter((n) => n !== character.name);
    for (const name of names) {
      const p = get_player?.(name);
      if (!p) continue;
      if (character.map !== p.map) continue;
      if (distance(character, p) > 250) continue;
      if (character.mp < (G.skills.energize?.mp ?? 0)) continue;
      use_skill("energize", p);
      break;
    }
  } catch {
    // ignore
  }
};

const installNoEventFarming = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastAssignment: null,
    lastAssignmentAt: 0,
    leader: null,
    mover: createMoveManager(),
  };

  const handler = (m) => {
    try {
      if (!m || !m.message) return;
      const data = m.message;
      if (data.cmd !== "farm:roles") return;
      st.lastAssignment = data.assignment || null;
      st.lastAssignmentAt = now();
    } catch {
      // ignore
    }
  };

  try {
    character.on("cm", handler);
  } catch {
    // ignore
  }

  const loop = () => {
    if (st.stopped) return;

    try {
      if (character.ctype === "merchant") return;
      if (character.rip) return;

      if (getActiveJoinableEvents().length) return;

      const roster = getRosterNames();
      if (!roster.length) return;

      const meta = getCharacterMeta(roster);
      const leader = chooseLeader(roster, meta);
      st.leader = leader;

      if (character.name === leader) {
        const worldEvents = getActiveWorldEvents();
        const worldEvent = pickWorldEvent(worldEvents);

        if (worldEvent) {
          const stats = getMonsterStats(worldEvent.name);
          const available = buildAvailableByClass(roster, meta);
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
            runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
          if (character.ctype === "mage") runMageSupport({ assigned: isHunt });
          return;
        }

        let target = getMonsterhuntTarget();
        if (!target) {
          const nowMs = now();
          if (!cfg._lastHuntRequest || nowMs - cfg._lastHuntRequest > 15000) {
            cfg._lastHuntRequest = nowMs;
            if (!smart?.moving) {
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
        const assignment = determineAssignment({ roster, meta, stats });
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
        runWorldEvent({ cfg, event: worldEvent, mover: st.mover });
      } else {
        if (isTiny) runTinycrab({ cfg, mover: st.mover });
        if (isHunt)
          runMonsterhunt({
            cfg,
            targetOverride: sharedTarget,
            mover: st.mover,
          });
      }
      if (character.ctype === "mage") runMageSupport({ assigned: isHunt });
    } catch (e) {
      warn("No-event farming loop error", e);
    } finally {
      setTimeout(loop, 500);
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
