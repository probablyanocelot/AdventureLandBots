const { getActiveJoinableEventsService } =
  await require("../server-events/index.js");
const { info, logCatch } = await require("../../al_debug_log.js");
const { sendTelemetryMessage } = await require("../../telemetry/client.js");
const { useFarmerSkills } = await require("../combat/skills.js");
const { getAttackCadenceMs, shouldAttackByCadence } =
  await require("../helper-combat/index.js");

let lastBasicAttackAt = 0;

const dbgState = new Map();
const isDebugEnabled = () => {
  try {
    return Boolean(
      globalThis?.AL_BOTS_DEBUG_COMBAT ||
      globalThis?.AL_BOTS_CONFIG?.debug?.combat,
    );
  } catch {
    return false;
  }
};

const dbg = (key, message, data = null, cooldownMs = 1200) => {
  try {
    const ts = Date.now();
    const last = dbgState.get(key) || 0;
    if (ts - last < cooldownMs) return;
    dbgState.set(key, ts);

    if (isDebugEnabled()) {
      info(`[targeting] ${message}`, data || "");
    }

    sendTelemetryMessage({
      type: "combat:debug",
      module: "targeting",
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

const getNearestMonsterOfTypeBase = (mtype) => {
  let nearestMonster = null;
  let nearestDistance = Infinity;

  for (const id in parent.entities) {
    const entity = parent.entities[id];
    if (!entity || entity.type !== "monster") continue;
    if (entity.mtype !== mtype) continue;

    const d = parent.distance(parent.character, entity);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearestMonster = entity;
    }
  }

  return nearestMonster;
};

const GOOBRAWL_PRIORITY_TARGETS = ["rgoo", "bgoo"];

const SEASONAL_PRIORITY_TARGETS = [
  "dragold",
  "pinkgoo",
  "mrpumpkin",
  "mrgreen",
  "grinch",
];

const DAILY_PRIORITY_TARGETS = [
  "franky",
  "crabxx",
  "tiger",
  "abtesting",
  "icegolem",
  "greenjr",
  "jr",
  "snowman",
  "tinyp",
  "cutebee",
  "goldenbat",
  "phoenix",
  "mvampire",
  "fvampire",
];

const PRIORITY_TARGETS = [
  ...GOOBRAWL_PRIORITY_TARGETS,
  ...SEASONAL_PRIORITY_TARGETS,
  ...DAILY_PRIORITY_TARGETS,
];

const shouldSuppressDailyPriorityTargets = () => {
  try {
    const active = getActiveJoinableEventsService?.();
    if (!Array.isArray(active) || !active.length) return false;
    const activeSet = new Set(active);

    const hasGoobrawl = activeSet.has("goobrawl");
    const hasSeasonal = SEASONAL_PRIORITY_TARGETS.some((name) =>
      activeSet.has(name),
    );

    const suppressed = hasGoobrawl || hasSeasonal;
    if (suppressed) {
      dbg(
        "daily_suppression_true",
        "daily priority targets suppressed",
        { active, hasGoobrawl, hasSeasonal },
        2500,
      );
    }
    return suppressed;
  } catch {
    return false;
  }
};

const getNearestVisiblePriorityMonster = () => {
  try {
    const entities = parent?.entities;
    if (!entities || !character) return null;

    const hasRgoo = Object.values(entities).some(
      (e) => e?.type === "monster" && e?.mtype === "rgoo" && !e?.dead,
    );

    let list = hasRgoo
      ? PRIORITY_TARGETS.filter((m) => m !== "bgoo")
      : PRIORITY_TARGETS;

    if (shouldSuppressDailyPriorityTargets()) {
      const dailySet = new Set(DAILY_PRIORITY_TARGETS);
      list = list.filter((m) => !dailySet.has(m));
    }

    dbg(
      "priority_list_effective",
      "effective priority target list computed",
      { hasRgoo, list },
      1800,
    );

    let bestMonster = null;
    let bestPriorityIndex = Infinity;
    let bestDistance = Infinity;

    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster" || entity.dead) continue;

      const idx = list.indexOf(entity.mtype);
      if (idx === -1) continue;

      const d = parent.distance?.(character, entity);
      const distance = Number.isFinite(d) ? d : Infinity;

      if (
        idx < bestPriorityIndex ||
        (idx === bestPriorityIndex && distance < bestDistance)
      ) {
        bestMonster = entity;
        bestPriorityIndex = idx;
        bestDistance = distance;
      }
    }

    if (bestMonster) {
      dbg(
        `priority_pick:${bestMonster?.mtype || bestMonster?.id || "unknown"}`,
        "selected priority monster",
        {
          id: bestMonster?.id,
          mtype: bestMonster?.mtype,
          bestPriorityIndex,
          bestDistance,
        },
        900,
      );
    } else {
      dbg("priority_pick_none", "no visible priority monster", null, 1600);
    }

    return bestMonster;
  } catch (e) {
    logCatch("getNearestVisiblePriorityMonster failed", e);
    return null;
  }
};

const getNearestMonsterOfType = (mtype) => {
  try {
    const priorityTarget = getNearestVisiblePriorityMonster();
    if (priorityTarget) return priorityTarget;
  } catch {
    // ignore and fall back
  }
  const fallback = getNearestMonsterOfTypeBase(mtype);
  if (fallback) {
    dbg(
      `base_pick:${mtype || "unknown"}`,
      "using base nearest-monster fallback",
      { mtype, id: fallback?.id, pickedMtype: fallback?.mtype },
      1100,
    );
  }
  return fallback;
};

const engageMonster = (
  monster,
  { rangeSkill = "attack", skillOptions = {} } = {},
) => {
  try {
    if (!monster || monster?.dead) return false;
    if (typeof change_target === "function") change_target(monster);

    try {
      useFarmerSkills(monster, skillOptions);
    } catch {
      // ignore skill errors; keep attack loop alive
    }

    let inRange = false;
    let canAttack = false;
    let attackCooldown = null;

    try {
      if (typeof is_in_range === "function") {
        inRange = Boolean(is_in_range(monster, rangeSkill));
      }
    } catch {
      // ignore
    }

    try {
      if (typeof can_attack === "function") {
        canAttack = Boolean(can_attack(monster));
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
      canAttack || (inRange && attackCooldown !== true && !monster?.dead);

    dbg(
      `engage_state:${monster?.id || monster?.mtype || "unknown"}`,
      "engage state",
      {
        id: monster?.id,
        mtype: monster?.mtype,
        inRange,
        canAttack,
        attackCooldown,
        shouldAttemptAttack,
      },
      900,
    );

    const cadenceMs = getAttackCadenceMs();
    const cadenceReady = shouldAttackByCadence({
      lastAttackAt: lastBasicAttackAt,
      cadenceMs,
    });

    if (shouldAttemptAttack && cadenceReady) {
      try {
        attack(monster);
        lastBasicAttackAt = Date.now();
        dbg(
          `engage_attack:${monster?.id || monster?.mtype || "unknown"}`,
          "attack call issued",
          { id: monster?.id, mtype: monster?.mtype, cadenceMs },
          900,
        );
        return true;
      } catch {
        // ignore and continue to movement fallback
      }
    }

    if (!inRange && typeof xmove === "function") {
      xmove(monster.x, monster.y);
      dbg(
        `engage_chase:${monster?.id || monster?.mtype || "unknown"}`,
        "chasing monster (out of range)",
        {
          id: monster?.id,
          mtype: monster?.mtype,
          x: monster?.x,
          y: monster?.y,
        },
        900,
      );
    }
  } catch (e) {
    logCatch("engageMonster failed", e);
  }
  return false;
};

module.exports = {
  PRIORITY_TARGETS,
  getNearestVisiblePriorityMonster,
  getNearestMonsterOfType,
  engageMonster,
};
