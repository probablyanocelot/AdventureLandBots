// ! USE THIS IN TRAVELLING FN TO GIVE COORDS IF NO x / y GIVEN
// let map = G.maps[character.map];
async function travelTo(loc) {
  const keys = Object.keys(loc);
  if (keys.includes("map")) {
    if (parent.character.map !== loc.map) {
      if (keys.includes("x") && keys.includes("y")) {
        await parent.character.smart_move(loc.map, loc.x, loc.y);
        return;
      }
      await parent.character.smart_move(loc.map);
      return;
    }
  }
  if (keys.includes("x") && keys.includes("y")) {
    await parent.character.xmove(loc.x, loc.y);
    return;
  }
  return;
}

async function handleFailTravel(location) {
  log(`'${this.current_action}' fail clear`);
  // this.thinking = true;
  if (smart.moving) return;
  smart_move(location)
    .then(() => {
      // this.thinking = false
      this.clear_current_action();
    })
    .catch(() => {
      // this.thinking = false
      this.clear_current_action();
      xmove(location);
    });
}
