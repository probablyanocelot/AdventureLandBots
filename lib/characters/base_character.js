// Code for Adventure Land the coding MMORPG
// THIS IS THE CLASS FOR ALL UNIVERSAL CHARACTER ACTIONS AND PROPERTIES
const { filterObjectsByProperty } = await require("../fn_data.js");
const { getConfig } = await require("../al_config.js");
const { installMagiportAutoAccept } = await require("../st_magiport_accept.js");
const { warn } = await require("../al_debug_log.js");
const { installTelemetry } = await require("../telemetry/client.js");
const { installBaseCmCommands } =
  await require("../domains/cm/base_cm_commands.js");
const { installChestLooter, getChests, lootChest } =
  await require("../domains/inventory/chest_looter.js");
const { broadcastCodeLoaded } =
  await require("../domains/events/bot_presence.js");
const {
  setCharacterAction,
  clearCharacterAction,
  partyInvite,
  partyAccept,
  partyLeave,
} = await require("../domains/party/party_actions.js");

class BotCharacter {
  constructor(data = parent.character) {
    this.data = data;
    this.action = null;
    this.skills = [];
    this.mp_use_avg = 0;
    this.lastScare = 0;
    this._seenChests = new Set();
    this._chestLooter = null;
    this._cmCommands = null;
    this._telemetry = null;
    this._roleSyncTimers = [];
  }

  requestRoleSyncFromWarrior(cfg = {}) {
    try {
      if (character?.ctype !== "mage") return;

      const warriorName =
        cfg?.noEventFarming?.aggroLockChain?.warriorName || null;
      if (!warriorName || warriorName === character?.name) return;

      const sendRequest = () => {
        try {
          send_cm(warriorName, {
            cmd: "farm:role_sync_request",
            from: character?.name || null,
            reason: "code_loaded",
            at: Date.now(),
          });
        } catch {
          // ignore
        }
      };

      sendRequest();

      for (const delay of [1200, 3000]) {
        try {
          const timer = setTimeout(sendRequest, delay);
          this._roleSyncTimers.push(timer);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  async init() {
    const cfg = getConfig();

    try {
      installMagiportAutoAccept(cfg);
    } catch (e) {
      warn("Failed to install magiport auto-accept", e);
    }

    this.skills = filterObjectsByProperty(G.skills, "class", this.ctype);

    try {
      this._cmCommands?.stop?.();
    } catch {
      // ignore
    }
    this._cmCommands = installBaseCmCommands({ owner: this });

    this.startChestLooting();

    try {
      this._telemetry?.stop?.();
    } catch {
      // ignore
    }

    try {
      this._telemetry = installTelemetry({ cfg });
    } catch (e) {
      warn("Failed to start telemetry", e);
    }

    broadcastCodeLoaded();
    this.requestRoleSyncFromWarrior(cfg);

    return this;
  }

  get name() {
    return this.data?.name;
  }
  get level() {
    return this.data?.level;
  }
  get ctype() {
    return this.data?.ctype;
  }
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
  get cosmetics() {
    return this.data?.cx;
  }
  get comsmetics() {
    return this.cosmetics;
  }
  get gear() {
    return this.data?.slots;
  }
  get buffs() {
    return this.data?.s;
  }
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
    return setCharacterAction({ owner: this, action });
  }
  async clearAction() {
    return clearCharacterAction({ owner: this });
  }

  async buyItems() {
    return;
  }
  async sellItems() {
    return;
  }
  async useSkill(skillName, target) {
    return;
    skillName;
    target;
  }
  async go(loc) {
    return;
    loc;
  }

  partyInvite(playerName) {
    partyInvite(playerName);
  }
  partyAccept() {
    partyAccept();
  }
  partyLeave() {
    partyLeave();
  }

  get_chests() {
    return getChests();
  }

  loot(id) {
    return lootChest(id);
  }

  startChestLooting({ intervalMs = 250 } = {}) {
    if (this._chestLooter) return;
    this._chestLooter = installChestLooter({
      intervalMs,
      seenSet: this._seenChests,
    });
  }

  stopChestLooting() {
    try {
      this._chestLooter?.stop?.();
    } catch {
      // ignore
    }
    this._chestLooter = null;
  }

  stop() {
    try {
      this.stopChestLooting();
    } catch {
      // ignore
    }

    try {
      this._cmCommands?.stop?.();
    } catch {
      // ignore
    }
    this._cmCommands = null;

    try {
      this._telemetry?.stop?.();
    } catch {
      // ignore
    }
    this._telemetry = null;

    try {
      for (const timer of this._roleSyncTimers || []) {
        clearTimeout(timer);
      }
    } catch {
      // ignore
    }
    this._roleSyncTimers = [];
  }

  dispose() {
    this.stop();
  }

  [Symbol.dispose]() {
    this.stop();
  }

  async [Symbol.asyncDispose]() {
    this.stop();
  }
}

module.exports = {
  BaseCharacter: BotCharacter,
  BotCharacter,
};
