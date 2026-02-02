// Code for Adventure Land the coding MMORPG
// THIS IS THE CLASS FOR ALL UNIVERSAL CHARACTER ACTIONS AND PROPERTIES
const { filterObjectsByProperty } = await require("functions_data.js");
const { getConfig } = await require("config.js");
const {
  installMagiportAutoAccept,
  setExpectedMagiport,
  clearExpectedMagiport,
} = await require("magiport/accept.js");
const { warn } = await require("util/logger.js");

// Generic Class
class BotCharacter {
  constructor(data = parent.character) {
    // Keep a LIVE reference to the in-game character object.
    // Most fields on `parent.character` change over time; copying them here would create a snapshot.
    this.data = data;

    // action and skills are set during async init
    this.action = null;
    this.skills = [];
    this.mp_use_avg = 0;

    // cooldown trackers
    this.lastScare = 0;
  }

  // async initializer since constructors can't be async
  async init() {
    // Install global safety hooks once per iframe.
    // Safe magiport accept: only accept from trusted mages when expecting a port.
    try {
      installMagiportAutoAccept(getConfig());
    } catch (e) {
      warn("Failed to install magiport auto-accept", e);
    }

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

        // Magiport handshake: orchestrator/mage tells recipients to prepare.
        // Expected message:
        //   { cmd:"magiport:prepare", from:"Hoodlamb", ttlMs:15000, taskId:"..." }
        case "magiport:prepare": {
          const from = data.from;
          if (!from || typeof from !== "string") break;

          // Stop any smart movement so we don't immediately walk away after port.
          try {
            if (typeof stop === "function") stop("smart");
          } catch {
            // ignore
          }

          setExpectedMagiport(from, data.ttlMs, data.taskId || null);

          // Acknowledge preparation so the mage can port with fewer "missed accept" cases.
          try {
            if (typeof send_cm === "function") {
              send_cm(m.name, {
                cmd: "magiport:prepared",
                ok: true,
                from,
                taskId: data.taskId || null,
                at: { map: character.map, x: character.x, y: character.y },
              });
            }
          } catch {
            // ignore
          }

          break;
        }

        // Clear any outstanding expectation (used on cancellations / task end).
        case "magiport:clear": {
          clearExpectedMagiport();
          break;
        }

        // Ask this character to join an event (joinable instances).
        // Expected message: { cmd:"task:join", event:"wabbit", taskId:"..." }
        // Replies with: { cmd:"task:join_result", ok, event, taskId, result }
        case "task:join": {
          const event = data.event;
          if (!event || typeof event !== "string") break;

          let ok = false;
          let result = null;
          try {
            // join() returns a promise; failures typically reject.
            result = await join(event);
            ok = true;
          } catch (e) {
            result = {
              failed: true,
              error: e && e.message ? e.message : String(e),
            };
          }

          try {
            if (typeof send_cm === "function") {
              send_cm(m.name, {
                cmd: "task:join_result",
                ok,
                event,
                taskId: data.taskId || null,
                result,
              });
            }
          } catch {
            // ignore
          }

          break;
        }
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
