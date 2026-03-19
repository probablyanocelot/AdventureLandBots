const { getConfig } = await require("../../config/index.js");
const { isJoinableEventService, getActiveJoinableEventsService } =
  await require("../events/index.js");
const { info, warn } = await require("../../al_debug_log.js");
const { sendTelemetryMessage } = await require("../../telemetry/client.js");
const { useFarmerSkills } = await require("./skills.js");

const SEASONAL_EVENT_NAMES = [
  "dragold",
  "pinkgoo",
  "mrpumpkin",
  "mrgreen",
  "grinch",
  "snowman",
  "goldenbat",
  "tinyp",
  "cutebee",
];

const DAILY_EVENT_NAMES = ["abtesting", "greenjr", "jr", "phoenix"];

const dbgState = new Map();
const getGlobalDebugFlag = () => {
  try {
    if (globalThis?.AL_BOTS_DEBUG_COMBAT != null)
      return Boolean(globalThis.AL_BOTS_DEBUG_COMBAT);
  } catch {
    // ignore
  }
  try {
    if (typeof window !== "undefined" && window?.AL_BOTS_DEBUG_COMBAT != null)
      return Boolean(window.AL_BOTS_DEBUG_COMBAT);
  } catch {
    // ignore
  }
  try {
    if (parent?.AL_BOTS_DEBUG_COMBAT != null)
      return Boolean(parent.AL_BOTS_DEBUG_COMBAT);
  } catch {
    // ignore
  }
  return false;
};

const isDebugEnabled = (cfg) =>
  Boolean(cfg?.debug?.combat || getGlobalDebugFlag());

const dbg = (cfg, key, message, data = null, cooldownMs = 1200) => {
  try {
    const ts = Date.now();
    const last = dbgState.get(key) || 0;
    if (ts - last < cooldownMs) return;
    dbgState.set(key, ts);

    if (isDebugEnabled(cfg)) {
      info(`[event-combat] ${message}`, data || "");
    }

    sendTelemetryMessage({
      type: "combat:debug",
      module: "event-combat",
      bot: character?.name || null,
      key,
      message,
      data,
      ts,
    });
  } catch {
    // ignore
  }
};

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const normalizeTeam = (value) => {
  const t = String(value || "")
    .trim()
    .toUpperCase();
  if (!t) return null;
  if (t === "A" || t === "B") return t;
  return t;
};

const getOwnRosterNames = () => {
  const names = new Set();
  try {
    if (character?.name) names.add(normalizeName(character.name));
  } catch {
    // ignore
  }
  try {
    const chars = get_characters?.();
    if (Array.isArray(chars)) {
      for (const c of chars) {
        if (c?.name) names.add(normalizeName(c.name));
      }
    }
  } catch {
    // ignore
  }
  return names;
};

const getPartyAnchor = () => {
  try {
    const party = parent?.party;
    if (!party || typeof party !== "object") return null;

    let best = null;
    let bestDist = Infinity;

    for (const name of Object.keys(party)) {
      if (!name || name === character?.name) continue;
      const p = get_player?.(name);
      if (!p || p.rip) continue;
      if (p.map && character?.map && p.map !== character.map) continue;

      const dist =
        typeof distance === "function" ? distance(character, p) : Infinity;

      if (dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }

    return best;
  } catch {
    return null;
  }
};

const repositionTo = (x, y, map = null) => {
  try {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (smart?.moving) return false;
    if (typeof smart_move !== "function") return false;
    const targetMap = typeof map === "string" && map ? map : character?.map;
    smart_move({ map: targetMap, x, y });
    return true;
  } catch {
    return false;
  }
};

const getPrimaryActiveJoinableEventName = () => {
  try {
    const active = getActiveJoinableEventsService?.();
    if (!Array.isArray(active) || !active.length) return null;
    return active[0] || null;
  } catch {
    return null;
  }
};

const getEventWaypoint = (eventName) => {
  try {
    if (!eventName) return null;
    const state = parent?.S?.[eventName];
    if (!state || typeof state !== "object") return null;

    const x = Number(state.x);
    const y = Number(state.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

    const map =
      typeof state.map === "string" && state.map ? state.map : character?.map;
    if (!map) return null;

    return {
      name: eventName,
      map,
      x,
      y,
    };
  } catch {
    return null;
  }
};

const stopSmartMove = ({ cfg, reason, data } = {}) => {
  try {
    if (!smart?.moving) return;
    if (typeof stop === "function") stop("smart");
    dbg(
      cfg,
      `stop:${reason || "unknown"}`,
      `stop smart_move (${reason})`,
      data,
      1000,
    );
  } catch {
    // ignore
  }
};

const getMonsterTargetName = (monster) => {
  if (!monster) return null;
  try {
    if (typeof get_target_of === "function") {
      const target = get_target_of(monster);
      if (target?.name) return target.name;
      if (target?.id) return target.id;
    }
  } catch {
    // ignore
  }
  try {
    if (monster?.target) return monster.target;
  } catch {
    // ignore
  }
  return null;
};

const isCrabxx = (monster) =>
  Boolean(
    monster &&
    monster.type === "monster" &&
    (monster.mtype === "crabxx" || monster.id === "crabxx"),
  );

const isAliveAndRenderable = (entity) =>
  Boolean(entity && !entity.dead && entity.visible !== false);

const hasVisibleCrabxx = () => {
  try {
    const entities = parent?.entities || {};
    for (const id in entities) {
      const e = entities[id];
      if (!isAliveAndRenderable(e)) continue;
      if (isCrabxx(e)) return true;
    }
  } catch {
    // ignore
  }
  return false;
};

const isInCrabxxEventContext = () => {
  try {
    const inEvent = String(character?.in || "").toLowerCase();
    const map = String(character?.map || "").toLowerCase();
    return (
      inEvent === "crabxx" ||
      inEvent === "crabrave" ||
      map === "crabxx" ||
      map === "crabrave"
    );
  } catch {
    return false;
  }
};

const getCrabRaveTarget = () => {
  const ownRoster = getOwnRosterNames();
  const isOutsideOwnRoster = (name) => {
    const normalized = normalizeName(name);
    return Boolean(normalized) && !ownRoster.has(normalized);
  };

  const isValidCrabxx = (monster) =>
    Boolean(isAliveAndRenderable(monster) && isCrabxx(monster));

  const isCrabxxTargetingOutside = (monster) =>
    isOutsideOwnRoster(getMonsterTargetName(monster));

  try {
    const current = get_targeted_monster?.();
    if (isValidCrabxx(current) && isCrabxxTargetingOutside(current))
      return current;
  } catch {
    // ignore
  }

  try {
    const entities = parent?.entities || {};
    let best = null;
    let bestDist = Infinity;
    for (const id in entities) {
      const monster = entities[id];
      if (!isValidCrabxx(monster)) continue;
      if (!isCrabxxTargetingOutside(monster)) continue;

      if (typeof distance === "function") {
        const dist = distance(character, monster);
        if (dist < bestDist) {
          best = monster;
          bestDist = dist;
        }
      } else if (!best) {
        best = monster;
      }
    }
    return best;
  } catch {
    return null;
  }
};

const isInJoinableEvent = () => {
  try {
    if (hasVisibleCrabxx()) return true;
    if (isInCrabxxEventContext()) return true;

    const inEvent = Boolean(
      character.in && isJoinableEventService(character.in),
    );
    if (inEvent) return true;

    const active = getActiveJoinableEventsService?.();
    if (Array.isArray(active) && active.length) {
      dbg(
        null,
        "joinable_event_gate_active_events",
        "joinable event gate opened by active-event snapshot",
        {
          in: character?.in,
          map: character?.map,
          active,
        },
        1800,
      );
      return true;
    }

    if (!inEvent) {
      dbg(
        null,
        "joinable_event_gate_blocked",
        "not in joinable event context",
        {
          in: character?.in,
          map: character?.map,
        },
        1800,
      );
    }
    return inEvent;
  } catch {
    return false;
  }
};

const isInAbtestingContext = () => {
  try {
    if (String(character?.in || "").toLowerCase() === "abtesting") return true;
    const active = getActiveJoinableEventsService?.();
    return Array.isArray(active) && active.includes("abtesting");
  } catch {
    return false;
  }
};

const getAbtestingEnemyTarget = (cfg) => {
  try {
    const ownRoster = getOwnRosterNames();
    const myTeam = normalizeTeam(character?.team);
    const entities = parent?.entities || {};

    let best = null;
    let bestDist = Infinity;

    for (const id in entities) {
      const entity = entities[id];
      if (!entity || entity.type !== "character") continue;
      if (!isAliveAndRenderable(entity) || entity.rip) continue;

      const name = normalizeName(entity?.name || entity?.id);
      if (!name) continue;
      if (ownRoster.has(name)) continue;

      const targetTeam = normalizeTeam(entity?.team);
      if (!myTeam || !targetTeam || targetTeam === myTeam) continue;

      if (typeof distance === "function") {
        const dist = distance(character, entity);
        if (dist < bestDist) {
          best = entity;
          bestDist = dist;
        }
      } else if (!best) {
        best = entity;
      }
    }

    if (!best) {
      dbg(
        cfg,
        "abtesting_wait_enemy_team",
        "abtesting active, waiting for enemy-team player target",
        { myTeam },
        1500,
      );
    }

    return best;
  } catch {
    return null;
  }
};

const getNearestMonsterForEventName = (eventName) => {
  try {
    if (!eventName) return null;
    const entities = parent?.entities || {};
    let best = null;
    let bestDist = Infinity;

    for (const id in entities) {
      const monster = entities[id];
      if (!monster || monster.type !== "monster") continue;
      if (monster.mtype !== eventName && monster.id !== eventName) continue;
      if (!isAliveAndRenderable(monster)) continue;

      if (typeof distance === "function") {
        const dist = distance(character, monster);
        if (dist < bestDist) {
          best = monster;
          bestDist = dist;
        }
      } else if (!best) {
        best = monster;
      }
    }

    return best;
  } catch {
    return null;
  }
};

const resolveTargetForEventName = (eventName, cfg) => {
  try {
    if (!eventName) return null;
    if (eventName === "crabxx") {
      const crabTarget = getCrabRaveTarget();
      if (!crabTarget) {
        dbg(
          cfg,
          "crabxx_wait_external_aggro",
          "crabxx active, waiting for external aggro target",
          {
            in: character?.in,
            map: character?.map,
          },
          1500,
        );
      }
      return crabTarget;
    }
    if (eventName === "abtesting") {
      return getAbtestingEnemyTarget(cfg);
    }
    const byEventName = getNearestMonsterForEventName(eventName);
    if (byEventName) return byEventName;

    try {
      const current = get_targeted_monster?.();
      if (isAliveAndRenderable(current) && current?.type === "monster") {
        return current;
      }
    } catch {
      // ignore
    }

    try {
      const nearest = get_nearest_monster?.({
        no_target: false,
        path_check: false,
      });
      if (isAliveAndRenderable(nearest) && nearest?.type === "monster") {
        dbg(
          cfg,
          `resolver_fallback_nearest:${eventName}`,
          "event-name direct match missed; using nearest monster fallback",
          { eventName, id: nearest?.id, mtype: nearest?.mtype },
          1000,
        );
        return nearest;
      }
    } catch {
      // ignore
    }

    return null;
  } catch {
    return null;
  }
};

const getNearestActiveEventTarget = (cfg) => {
  try {
    let active = getActiveJoinableEventsService?.();
    if (!Array.isArray(active) || !active.length) return null;

    dbg(
      cfg,
      "active_events_seen",
      "active joinable events snapshot",
      { active },
      2000,
    );

    const activeSet = new Set(active);
    const hasGoobrawl = activeSet.has("goobrawl");
    const hasSeasonal = SEASONAL_EVENT_NAMES.some((name) =>
      activeSet.has(name),
    );
    if (hasGoobrawl || hasSeasonal) {
      const dailySet = new Set(DAILY_EVENT_NAMES);
      const before = [...active];
      active = active.filter((name) => !dailySet.has(name));
      dbg(
        cfg,
        "daily_suppression_applied",
        "suppressed daily events due to higher-priority availability",
        { before, after: active, hasGoobrawl, hasSeasonal },
        2500,
      );
      if (!active.length) return null;
    }

    for (const eventName of active) {
      const target = resolveTargetForEventName(eventName, cfg);
      if (target) {
        dbg(
          cfg,
          `resolver_hit:${eventName}`,
          "resolved active event target",
          {
            eventName,
            id: target?.id,
            type: target?.type,
            mtype: target?.mtype,
          },
          1000,
        );
        return target;
      }

      dbg(
        cfg,
        `resolver_miss:${eventName}`,
        "active event had no eligible target yet",
        { eventName },
        1200,
      );
    }
  } catch {
    // ignore
  }
  return null;
};

const pickTarget = (cfg) => {
  try {
    const eventTarget = getNearestActiveEventTarget(cfg);
    if (eventTarget) return eventTarget;
  } catch {
    // ignore
  }

  try {
    if (isInCrabxxEventContext() || hasVisibleCrabxx()) {
      const crabTarget = resolveTargetForEventName("crabxx", cfg);
      if (crabTarget) return crabTarget;
    }
  } catch {
    // ignore
  }

  try {
    if (isInAbtestingContext()) {
      const enemyPlayer = resolveTargetForEventName("abtesting", cfg);
      if (enemyPlayer) return enemyPlayer;
    }
  } catch {
    // ignore
  }

  try {
    const current = get_targeted_monster?.();
    if (isAliveAndRenderable(current)) {
      dbg(
        cfg,
        "fallback_current_target",
        "using currently targeted monster fallback",
        { id: current?.id, mtype: current?.mtype },
        1200,
      );
      return current;
    }
  } catch {
    // ignore
  }

  try {
    const nearest = get_nearest_monster?.({
      no_target: false,
      path_check: false,
    });
    if (nearest) {
      dbg(
        cfg,
        "fallback_nearest_monster",
        "using nearest monster fallback",
        { id: nearest?.id, mtype: nearest?.mtype },
        1200,
      );
    }
    return nearest;
  } catch {
    return null;
  }
};

const tryAttack = (target, cfg) => {
  if (!target) return;

  try {
    if (typeof change_target === "function") change_target(target);
  } catch {
    // ignore
  }

  try {
    useFarmerSkills(target);
  } catch {
    // ignore skill errors
  }

  let inRange = false;
  let canAttack = false;
  let attackCooldown = null;

  try {
    if (typeof is_in_range === "function") {
      inRange = Boolean(is_in_range(target));
    }
  } catch {
    // ignore
  }

  try {
    if (typeof can_attack === "function") {
      canAttack = Boolean(can_attack(target));
    }
  } catch {
    // ignore
  }

  try {
    if (typeof is_on_cooldown === "function") {
      attackCooldown = Boolean(is_on_cooldown("attack"));
    }
  } catch {
    // ignore
  }

  const shouldAttemptAttack =
    canAttack || (inRange && attackCooldown !== true && !target?.dead);

  if (shouldAttemptAttack) {
    try {
      attack(target);
      dbg(
        cfg,
        `attack:${target?.id || target?.mtype || "unknown"}`,
        "attacked target",
        {
          id: target?.id,
          mtype: target?.mtype,
          inRange,
          canAttack,
          attackCooldown,
        },
        900,
      );
      return;
    } catch {
      // ignore and continue to movement fallback
    }
  }

  try {
    if (!inRange && typeof xmove === "function") {
      if (smart?.moving) {
        stopSmartMove({
          cfg,
          reason: "event_attack_chase",
          data: { id: target?.id, mtype: target?.mtype },
        });
      }
      xmove(target.x, target.y);
      dbg(
        cfg,
        `xmove:${target?.id || target?.mtype || "unknown"}`,
        "xmove chase after target lock",
        { id: target?.id, mtype: target?.mtype, x: target?.x, y: target?.y },
        900,
      );
      return;
    }
  } catch {
    // ignore
  }

  dbg(
    cfg,
    `hold_fire:${target?.id || target?.mtype || "unknown"}`,
    "holding fire on target",
    {
      id: target?.id,
      mtype: target?.mtype,
      inRange,
      canAttack,
      attackCooldown,
    },
    1200,
  );
};

const tryPotions = () => {
  try {
    if (typeof use_hp_or_mp === "function") use_hp_or_mp();
  } catch {
    // ignore
  }
};

const installEventCombat = ({ cfg } = {}) => {
  cfg = cfg || getConfig();
  info("[event-combat] module installed", {
    ctype: character?.ctype,
    eventCombatEnabled: cfg?.eventCombat?.enabled,
  });

  const st = {
    stopped: false,
    lastRepositionAt: 0,
    timer: null,
  };

  const tick = async () => {
    if (st.stopped) return;

    try {
      if (!cfg?.eventCombat?.enabled && cfg?.eventCombat?.enabled !== undefined)
        return;

      if (character?.ctype === "merchant") return;
      if (character?.rip) return;

      if (!isInJoinableEvent()) return;

      tryPotions();

      const target = pickTarget(cfg);
      if (target) {
        if (smart?.moving)
          stopSmartMove({
            cfg,
            reason: "event_target_visible",
            data: { id: target?.id, mtype: target?.mtype },
          });
        dbg(
          cfg,
          `target_seen:${target?.id || target?.mtype || "unknown"}`,
          "target acquired",
          { id: target?.id, mtype: target?.mtype },
          700,
        );
        tryAttack(target, cfg);
        return;
      }

      if (smart?.moving) return;

      const nowMs = Date.now();
      if (nowMs - st.lastRepositionAt < 1000) return;
      st.lastRepositionAt = nowMs;

      const activeEventName = getPrimaryActiveJoinableEventName();
      const waypoint = getEventWaypoint(activeEventName);
      if (waypoint) {
        const sameMap = waypoint.map === character?.map;
        const dist =
          sameMap && typeof distance === "function"
            ? distance(character, waypoint)
            : Infinity;

        if (!sameMap || !Number.isFinite(dist) || dist > 140) {
          const moved = repositionTo(waypoint.x, waypoint.y, waypoint.map);
          if (moved) {
            dbg(
              cfg,
              `reposition:event_waypoint:${waypoint.name || "unknown"}`,
              "repositioning to live event waypoint",
              {
                eventName: waypoint.name,
                map: waypoint.map,
                x: waypoint.x,
                y: waypoint.y,
                sameMap,
                dist: Number.isFinite(dist) ? Math.round(dist) : null,
              },
              1200,
            );
            return;
          }
        }
      }

      const anchor = getPartyAnchor();
      if (anchor && typeof distance === "function") {
        const dist = distance(character, anchor);
        if (dist > 120) {
          repositionTo(anchor.x, anchor.y);
          dbg(
            cfg,
            `reposition:anchor:${anchor?.name || "unknown"}`,
            "repositioning to party anchor",
            { anchor: anchor?.name, dist: Math.round(dist) },
            1200,
          );
          return;
        }
      }

      try {
        const mapDef = G?.maps?.[character?.map];
        const firstSpawn = Array.isArray(mapDef?.spawns)
          ? mapDef.spawns[0]
          : null;
        if (Array.isArray(firstSpawn) && firstSpawn.length >= 2) {
          repositionTo(firstSpawn[0], firstSpawn[1]);
          dbg(
            cfg,
            "reposition:spawn",
            "repositioning to event spawn",
            { x: firstSpawn[0], y: firstSpawn[1], map: character?.map },
            1500,
          );
        }
      } catch {
        // ignore
      }
    } catch (e) {
      warn("Event combat tick error", e);
    } finally {
      if (st.stopped) return;
      st.timer = setTimeout(tick, 250);
    }
  };

  tick();

  const stopRoutine = () => {
    st.stopped = true;
    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  return {
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
};

module.exports = {
  installEventCombat,
};
