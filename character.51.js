// IN-GAME IMPORTS
load_code(53); // functions_data.js
load_code(54); // functions_game.js

// STANDARD LIBRARY IMPORTS
// import { filterObjectsByProperty } from "./lib/functions_data";
// import { proxied_require } from "./lib/proxied_require";
// const { utils, combat } = await proxied_require("utils.js", "combat.js"); // Example usage

// Code for Adventure Land the coding MMORPG
// Character Class
class Character {
  constructor(data = parent.character) {
    // Keep a LIVE reference to the in-game character object.
    // Most fields on `parent.character` change over time; copying them here would create a snapshot.
    this.data = data;
    this.ctype;
    this.skills = filterObjectsByProperty(G.skills, "class", this.ctype);

    this.action;
  }

  // Identity / stats (live)
  get name() {
    return this.data?.name;
  }
  get level() {
    return this.data?.level;
  }
  get ctype() {
    return this.data?.ctype;
  }
  // Backward-compatible alias for any older code using `character.class`
  get class() {
    return this.ctype;
  }
  get hp() {
    return this.data?.hp;
  }
  get mp() {
    return this.data?.mp;
  }
  get max_hp() {
    return this.data?.max_hp;
  }
  get max_mp() {
    return this.data?.max_mp;
  }

  // Cosmetics / equipment / buffs (live)
  get cosmetics() {
    return this.data?.cx;
  }
  // Backward-compatible alias for the original typo
  get comsmetics() {
    return this.cosmetics;
  }
  get gear() {
    return this.data?.slots;
  }
  get buffs() {
    return this.data?.s;
  }

  // Position (live)
  get x() {
    return this.data?.x;
  }
  get y() {
    return this.data?.y;
  }
  get in() {
    return this.data?.in;
  }
  get map() {
    return this.data?.map;
  }

  get target() {
    return this.data?.target;
  }
  showInfo() {
    log(
      `Name: ${this.name}, Level: ${this.level}, Class: ${this.ctype}, HP: ${this.hp}/${this.max_hp}%, MP: ${this.mp}/${this.max_mp}%, Position: (${this.x}, ${this.y}), Map: ${this.map}`
    );
  }
  isAlive() {
    return !this.data?.rip;
  }
  setAction(action) {
    this.action = action;
    log(`Action set to: ${action}`);
  }
  clearAction() {
    // try not to have to use this!
    this.action = null;
    log(`Action cleared`);
  }
}

// STANDARD LIBRARY EXPORTS
// export { Character };
let bot = new Character();
