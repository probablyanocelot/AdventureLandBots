const { normalizeNumber } = await require("./combat_shared.js");

function savePosition() {
  return set(`${character.id}_position`, {
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
}

function getPosition(id) {
  if (parent.entities[id]) return parent.entities[id];
  return get(`${id}_position`) ?? undefined;
}

const isFreshPosition = (pos, maxAgeMs = 25000) => {
  try {
    if (!pos || typeof pos !== "object") return false;
    const t = pos.time ? Date.parse(pos.time) : NaN;
    if (!Number.isFinite(t)) return false;
    return Date.now() - t <= Math.max(1000, Number(maxAgeMs || 0));
  } catch {
    return false;
  }
};

const getTeammateAtDestination = ({
  huntGroupNames = [],
  destination,
  radius = 140,
} = {}) => {
  try {
    if (!destination || !Array.isArray(huntGroupNames)) return null;
    if (!Number.isFinite(destination?.x) || !Number.isFinite(destination?.y))
      return null;

    const desiredMap = destination?.map || character?.map || null;
    const desiredIn = character?.in;

    let best = null;
    let bestDistance = Infinity;
    for (const name of huntGroupNames) {
      if (!name || name === character?.name) continue;
      const pos = getPosition(name);
      if (!pos) continue;
      if (pos?.server?.region && pos.server.region !== server?.region) continue;
      if (pos?.server?.id && pos.server.id !== server?.id) continue;
      if (desiredMap && pos?.map && pos.map !== desiredMap) continue;
      if (desiredIn && pos?.in && pos.in !== desiredIn) continue;
      if (!isFreshPosition(pos)) continue;

      const d = normalizeNumber(distance?.(pos, destination), Infinity);
      if (!Number.isFinite(d) || d > radius) continue;

      const selfD = normalizeNumber(distance?.(character, pos), Infinity);
      if (selfD < bestDistance) {
        bestDistance = selfD;
        best = {
          name,
          map: pos.map || desiredMap,
          x: Number(pos.x),
          y: Number(pos.y),
          in: pos.in,
        };
      }
    }

    return best;
  } catch {
    return null;
  }
};

module.exports = {
  savePosition,
  getPosition,
  isFreshPosition,
  getTeammateAtDestination,
};
