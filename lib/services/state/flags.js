const roster = await require("../helpers/roster/index.js");
const { getPlayerSafe, distanceToPlayer } = roster;

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

const isIFrameParent = () => {
  if (Object.keys(get_active_characters()).length > 1) return true;
  return false;
};

module.exports = {
  isGathering,
  isBusyMoving,
  isNearby,
  isIFrameParent,
};
