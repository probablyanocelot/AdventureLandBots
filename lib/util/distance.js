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

const { onCharacter } = await require("../listeners.js");

// Delayed death handler (resets on each death)
let deathDelayTimer = null;
try {
  if (typeof character !== "undefined") {
    onCharacter("death", () => {
      if (deathDelayTimer) clearTimeout(deathDelayTimer);
      deathDelayTimer = setTimeout(() => {
        console.log("Death handler triggered after 15 seconds.");
      }, 15000);
    });
  }
} catch {
  // Ignore if character isn't available in this context
}

module.exports = {
  getPlayerSafe,
  distanceToPlayer,
  isNearby,
};
