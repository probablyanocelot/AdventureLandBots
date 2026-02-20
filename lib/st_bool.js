const isGathering = () => {
  try {
    const c = character?.c || {};
    return Boolean(c.fishing || c.mining);
  } catch {
    return false;
  }
};

const isBusyMoving = () => {
  try {
    return Boolean(smart?.moving) || isGathering();
  } catch {
    return isGathering();
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
  isGathering,
  isBusyMoving,
  isNearby,
};
