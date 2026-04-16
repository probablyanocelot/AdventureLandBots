// TODO: implement
const seen = new Set();

const rareMonsters = [
  "tiger",
  "cutebee",
  "grinch",
  "goldenbat",
  "mvampire",
  "phoenix",
  "greenjr",
  "jr",
  "rudolph",
];

setInterval(() => {
  for (const id in parent.entities) {
    const e = parent.entities[id];
    if (
      e.type === "monster" &&
      rareMonsters.includes(e.name) &&
      !seen.has(id)
    ) {
      seen.add(id);
      console.log(`${e.name} spawned:`, e.map, e.x, e.y, id);
      // custom callback...
    }
  }
  // remove gone IDs
  for (const id of [...seen]) {
    if (!parent.entities[id]) seen.delete(id);
  }
}, 2000);
