// Code for Adventure Land the coding MMORPG
// THIS IS THE CLASS FOR ALL UNIVERSAL CHARACTER ACTIONS AND PROPERTIES
const { filterObjectsByProperty } = await require("functions_data.js");

// Generic Class
class BotCharacter {
  constructor(data = parent.character) {
    // Keep a LIVE reference to the in-game character object.
    // Most fields on `parent.character` change over time; copying them here would create a snapshot.
    this.data = data;

    this.idleCounter = 0;

    // action and skills are set during async init
    this.action = null;
    this.skills = [];
    this.mp_use_avg = 0;

    // cooldown trackers
    this.lastScare = 0;
  }

  // async initializer since constructors can't be async
  async init() {
    // populate any async or dynamic properties
    this.skills = filterObjectsByProperty(G.skills, "class", this.ctype);

    // wire up async event handler
    character.on("cm", async (m) => {
      if (!is_friendly(m.name)) return;
      let data = m.message;

      if (!data.cmd) return;

      switch (data.cmd) {
        case "clear":
          this.clearAction();
          break;
      }
    });

    return this;
  }

  // ###### GETTERS AND SETTERS FOR CHARACTER PROPERTIES ######
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

  get stand() {
    return this.data?.stand;
  }
  get moving() {
    return this.data?.moving;
  }
  isAlive() {
    return !this.data?.rip;
  }
  async setAction(action) {
    this.action = action;
    log(`Action set to: ${action}`);
    return this.action;
  }
  async clearAction() {
    // try not to have to use this!
    this.action = null;
    log(`Action cleared`);
    return null;
  }

  // ###### CHARACTER METHODS ######
  //    Below are methods for universal character actions.

  // Inventory management
  async buyItems() {
    // implement buying logic; placeholder
    return;
  }
  async sellItems() {
    // implement selling logic; placeholder
    return;
  }

  async useSkill(skillName, target) {
    // implement skill usage; placeholder
    // e.g., await parent.use_skill(skillName, target);
    return;
  }

  // Movement
  async go(loc) {}

  // Party management
  partyInvite(playerName) {
    parent.party_invite(playerName);
    return;
  }
  partyAccept() {
    parent.party_accept();
    return;
  }
  partyLeave() {
    parent.party_leave();
    return;
  }
}
module.exports = { BotCharacter };
