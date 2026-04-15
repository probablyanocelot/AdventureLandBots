const { normalizeNumber, dbg } = await require("./combat_shared.js");

const pickPullerName = (huntGroupNames = []) => {
  try {
    if (!Array.isArray(huntGroupNames) || !huntGroupNames.length)
      return character?.name || null;
    const sorted = huntGroupNames.filter(Boolean).slice().sort();
    return sorted[0] || character?.name || null;
  } catch {
    return character?.name || null;
  }
};

const getMonsterTargetingName = (name, preferredMtype = null) => {
  try {
    if (!name) return null;
    const entities = parent?.entities;
    if (!entities || !character) return null;

    let best = null;
    let bestDistance = Infinity;
    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster" || entity.dead) continue;
      if (entity.target !== name) continue;
      if (preferredMtype && entity.mtype !== preferredMtype) continue;

      const d = parent.distance?.(character, entity);
      const dist = Number.isFinite(d) ? d : Infinity;
      if (dist < bestDistance) {
        best = entity;
        bestDistance = dist;
      }
    }

    return best;
  } catch {
    return null;
  }
};

const isHuntGroupArrived = ({
  huntGroupNames = [],
  anchor,
  radius = 220,
} = {}) => {
  try {
    if (!anchor) return false;
    if (!Array.isArray(huntGroupNames) || !huntGroupNames.length) return true;

    for (const name of huntGroupNames) {
      const p = parent?.entities?.[name] || null;
      if (!p || p.rip) return false;
      if (p.map && character?.map && p.map !== character.map) return false;
      const d = distance?.(p, anchor);
      if (!Number.isFinite(d) || d > radius) return false;
    }

    return true;
  } catch {
    return false;
  }
};

const isValidHuntDestination = (dest) => {
  try {
    return (
      dest &&
      typeof dest === "object" &&
      typeof dest.map === "string" &&
      dest.map.trim() &&
      Number.isFinite(dest.x) &&
      Number.isFinite(dest.y)
    );
  } catch {
    return false;
  }
};

const normalizeHuntDestination = (huntDest, rallyPoint) => {
  if (isValidHuntDestination(huntDest))
    return {
      map: huntDest.map,
      x: Number(huntDest.x),
      y: Number(huntDest.y),
    };

  if (isValidHuntDestination(rallyPoint)) {
    return {
      map: rallyPoint.map,
      x: Number(rallyPoint.x),
      y: Number(rallyPoint.y),
    };
  }

  return null;
};

const isPriestBackupReady = ({
  huntGroupNames = [],
  anchor,
  radius = 420,
} = {}) => {
  try {
    const names = Array.isArray(huntGroupNames)
      ? huntGroupNames.filter(Boolean).slice()
      : [];

    if (!names.length) {
      const partyNames = Object.keys(parent?.party || {});
      for (const name of partyNames) {
        if (name) names.push(name);
      }
    }

    if (character?.name && !names.includes(character.name)) {
      names.push(character.name);
    }

    for (const name of names) {
      const p = parent?.entities?.[name] || null;
      if (!p || p.rip) continue;
      if (p.map && character?.map && p.map !== character.map) continue;

      const ctype = p?.ctype || p?.type || p?.class || null;
      if (ctype !== "priest") continue;

      if (!anchor) return true;
      const d = distance?.(p, anchor);
      if (Number.isFinite(d) && d <= radius) return true;
    }

    return false;
  } catch {
    return false;
  }
};

const maybeDrawAggroAsPuller = ({
  cfg,
  activeTarget,
  huntGroupNames = [],
} = {}) => {
  try {
    if (!activeTarget || activeTarget.dead) return false;
    if (activeTarget.target === character?.name) return false;

    const allySet = new Set(
      Array.isArray(huntGroupNames) ? huntGroupNames.filter(Boolean) : [],
    );
    if (!allySet.has(activeTarget.target)) return false;

    const tauntDef = G?.skills?.taunt;
    if (!tauntDef) return false;
    if (typeof is_on_cooldown === "function" && is_on_cooldown("taunt"))
      return false;

    const dist = normalizeNumber(distance?.(character, activeTarget), Infinity);
    const tauntRange = normalizeNumber(tauntDef?.range, 120);
    if (!Number.isFinite(dist) || dist > tauntRange) return false;

    const mpCost = normalizeNumber(tauntDef?.mp, 0);
    if (normalizeNumber(character?.mp, 0) < mpCost) return false;

    use_skill("taunt", activeTarget);
    dbg(
      cfg,
      `hunt_taunt:${activeTarget?.id || "unknown"}`,
      "puller taunting monster off ally",
      {
        targetId: activeTarget?.id,
        ally: activeTarget?.target,
      },
      650,
    );
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  pickPullerName,
  getMonsterTargetingName,
  isHuntGroupArrived,
  isValidHuntDestination,
  normalizeHuntDestination,
  isPriestBackupReady,
  maybeDrawAggroAsPuller,
};
