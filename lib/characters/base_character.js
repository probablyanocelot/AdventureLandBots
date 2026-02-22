// Code for Adventure Land the coding MMORPG
// THIS IS THE CLASS FOR ALL UNIVERSAL CHARACTER ACTIONS AND PROPERTIES
const { filterObjectsByProperty } = await require("../fn_data.js");
const { getConfig } = await require("../al_config.js");
const {
  installMagiportAutoAccept,
  setExpectedMagiport,
  clearExpectedMagiport,
} = await require("../st_magiport_accept.js");
const { warn, logCatch } = await require("../al_debug_log.js");
const { onCharacter } = await require("../event_listeners.js");
const { installTelemetry } = await require("../telemetry/client.js");
const { is_friendly, getActiveNames } = await require("../group_party.js");

class BotCharacter {
  constructor(data = parent.character) {
    this.data = data;
    this.action = null;
    this.skills = [];
    this.mp_use_avg = 0;
    this.lastScare = 0;
    this._seenChests = new Set();
    this._chestLootInterval = null;
  }

  async init() {
    try {
      installMagiportAutoAccept(getConfig());
    } catch (e) {
      warn("Failed to install magiport auto-accept", e);
    }

    this.skills = filterObjectsByProperty(G.skills, "class", this.ctype);

    onCharacter("cm", async (m) => {
      if (!is_friendly(m.name)) return;
      let data = m.message;
      if (!data.cmd) return;

      switch (data.cmd) {
        case "clear":
          this.clearAction();
          break;

        case "magiport:prepare": {
          const from = data.from;
          if (!from || typeof from !== "string") break;

          try {
            if (typeof stop === "function") stop("smart");
          } catch (e) {
            logCatch("magiport prepare: stop smart failed", e);
          }

          setExpectedMagiport(from, data.ttlMs, data.taskId || null);

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
          } catch (e) {
            logCatch("magiport prepare: send_cm failed", e);
          }

          break;
        }

        case "magiport:clear": {
          clearExpectedMagiport();
          break;
        }

        case "task:join": {
          const event = data.event;
          if (!event || typeof event !== "string") break;

          let ok = false;
          let result = null;
          try {
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
          } catch (e) {
            logCatch("task:join_result send_cm failed", e);
          }

          break;
        }
      }
    });

    this.startChestLooting();

    try {
      installTelemetry({ cfg: getConfig() });
    } catch (e) {
      warn("Failed to start telemetry", e);
    }

    try {
      const active = getActiveNames();
      if (Array.isArray(active) && typeof send_cm === "function") {
        const payload = {
          cmd: "bot:code_loaded",
          name: character.name,
          ctype: character.ctype,
          at: { map: character.map, x: character.x, y: character.y },
          ts: Date.now(),
        };

        for (const name of active) {
          if (!name || name === character.name) continue;
          try {
            send_cm(name, payload);
          } catch {
            // ignore per-recipient failures
          }
        }
      }
    } catch (e) {
      logCatch("bot:code_loaded broadcast failed", e);
    }

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
    this.action = action;
    log(`Action set to: ${action}`);
    return this.action;
  }
  async clearAction() {
    this.action = null;
    log(`Action cleared`);
    return null;
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

  get_chests() {
    try {
      return parent?.chests || {};
    } catch {
      return {};
    }
  }

  loot(id) {
    if (!id) return false;
    const chests = this.get_chests();
    if (!chests || !chests[id]) return false;
    try {
      if (typeof globalThis.loot === "function") {
        globalThis.loot(id);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  startChestLooting({ intervalMs = 250 } = {}) {
    if (this._chestLootInterval) return;

    const tick = () => {
      try {
        const chests = parent?.chests;
        if (!chests || typeof chests !== "object") return;

        for (const id of Object.keys(chests)) {
          if (this._seenChests.has(id)) continue;
          this._seenChests.add(id);
          this.loot(id);
        }
      } catch {
        // ignore
      }
    };

    this._chestLootInterval = setInterval(tick, Math.max(50, intervalMs));
    tick();
  }

  stopChestLooting() {
    if (!this._chestLootInterval) return;
    try {
      clearInterval(this._chestLootInterval);
    } catch {
      // ignore
    }
    this._chestLootInterval = null;
  }
}

module.exports = {
  BaseCharacter: BotCharacter,
  BotCharacter,
};
