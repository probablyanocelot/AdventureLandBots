const getMonsterhuntStateForName = (name = character?.name) => {
  try {
    if (!name) return null;
    if (name === character?.name) return character?.s?.monsterhunt || null;
    return get_player?.(name)?.s?.monsterhunt || null;
  } catch {
    return null;
  }
};

const getMonsterhuntTarget = () => {
  try {
    const s = getMonsterhuntStateForName(character?.name);
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

const getMonsterhuntTargetForName = (name = character?.name) => {
  try {
    const s = getMonsterhuntStateForName(name);
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
    const s = getMonsterhuntStateForName(character?.name);
    if (!s || typeof s !== "object") return false;
    const c = Number(s.c);
    // If count is missing or non-positive, treat as ready to turn in.
    if (!Number.isFinite(c)) return true;
    return c <= 0;
  } catch {
    return false;
  }
};

const needsMonsterhuntTurnInForName = (name = character?.name) => {
  try {
    const s = getMonsterhuntStateForName(name);
    if (!s || typeof s !== "object") return false;
    const c = Number(s.c);
    if (!Number.isFinite(c)) return true;
    return c <= 0;
  } catch {
    return false;
  }
};

const isNameHoldingAggroOfType = (name, mtype) => {
  try {
    if (!name) return false;
    const entities = parent?.entities;
    if (!entities) return false;
    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster" || entity.dead) continue;
      if (entity.target !== name) continue;
      if (mtype && entity.mtype !== mtype) continue;
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

module.exports = {
  getMonsterhuntStateForName,
  getMonsterhuntTarget,
  getMonsterhuntTargetForName,
  needsMonsterhuntTurnIn,
  needsMonsterhuntTurnInForName,
  isNameHoldingAggroOfType,
};
