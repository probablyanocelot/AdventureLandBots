// Code for Adventure Land the coding MMORPG
// THIS IS THE CLASS FOR ALL UNIVERSAL CHARACTER ACTIONS AND PROPERTIES
const { getConfig } = await require("../config/index.js");
const { warn } = await require("../al_debug_log.js");
const { installBaseCmCommands, installMagiportAutoAccept } =
  await require("../services/cm/index.js");
const { broadcastCodeLoadedService } =
  await require("../services/server-events/index.js");
const { createChestLootingService, getChests, lootChest } =
  await require("../services/inventory/index.js");
const { createRoleSyncRequesterService } =
  await require("../services/farming/index.js");
const {
  setCharacterAction,
  clearCharacterAction,
  partyInvite,
  partyAccept,
  partyLeave,
} = await require("../services/party/index.js");
const { filterObjectsByProperty } =
  await require("../services/helper-data-structures/index.js");

class BotCharacter {
  constructor(data = parent.character) {
    this.data = data;
    this.action = null;
    this.skills = [];
    this.mp_use_avg = 0;
    this.lastScare = 0;
    this._chestLootingService = null;
    this._cmCommands = null;
    this._roleSyncRequester = null;
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

    broadcastCodeLoadedService();

    try {
      this._roleSyncRequester?.stopRoutine?.();
    } catch {
      // ignore
    }
    this._roleSyncRequester = createRoleSyncRequesterService({
      cfg,
      ownerName: this.name,
      reason: "code_loaded",
    });

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
    if (this._chestLootingService) return;
    this._chestLootingService = createChestLootingService({ intervalMs });
  }

  stopChestLooting() {
    try {
      this._chestLootingService?.stopRoutine?.();
    } catch {
      // ignore
    }
    this._chestLootingService = null;
  }

  stopRoutine() {
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
      this._roleSyncRequester?.stopRoutine?.();
    } catch {
      // ignore
    }
    this._roleSyncRequester = null;
  }

  dispose() {
    this.stopRoutine();
  }

  [Symbol.dispose]() {
    this.stopRoutine();
  }

  async [Symbol.asyncDispose]() {
    this.stopRoutine();
  }
}

module.exports = {
  BaseCharacter: BotCharacter,
  BotCharacter,
};
