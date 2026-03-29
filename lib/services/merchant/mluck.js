const applyMluckToNearbyPlayers = (radius = 320) => {
  try {
    if (typeof is_on_cooldown === "function" && is_on_cooldown("mluck")) return;
    if (!parent || !parent.entities || !character) return;

    for (const id in parent.entities) {
      const player = parent.entities[id];
      if (!player || player.type !== "character") continue;
      if (player.name === character.name) continue;

      const dist =
        typeof parent.distance === "function"
          ? parent.distance(character, player)
          : Infinity;
      if (dist > radius) continue;

      if (!player.s?.mluck || !player.s.mluck.strong) {
        try {
          use_skill("mluck", player);
        } catch (err) {
          // ignore failures (e.g., not in range, missing skill)
        }
      }
    }
  } catch (err) {
    // ignore errors so merchant loop keeps running
  }
};

module.exports = {
  applyMluckToNearbyPlayers,
};
