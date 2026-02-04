const getPlayerSafe = (name) => {
  try {
    return get_player(name);
  } catch {
    return null;
  }
};

const distanceToPlayer = (name) => {
  const p = getPlayerSafe(name);
  if (!p) return null;
  try {
    return distance(character, p);
  } catch {
    return null;
  }
};

const isNearby = (name, maxDist) => {
  const p = getPlayerSafe(name);
  if (!p) return false;
  if (p.map && character.map && p.map !== character.map) return false;
  const d = distanceToPlayer(name);
  if (d == null) return false;
  return d <= maxDist;
};

module.exports = {
  getPlayerSafe,
  distanceToPlayer,
  isNearby,
};
