const { BotCharacter } = await require("./base_character.js");
const { Idle } = await require("../class_idle.js");
const { getConfig } = await require("../al_config.js");
const { isJoinableEvent } = await require("../fn_server_events.js");
const { magiportTargets } = await require("../cm_magiport.js");
const { warn } = await require("../al_debug_log.js");
const { onCharacter } = await require("../event_listeners.js");
const { is_friendly } = await require("../group_party.js");

class Mage extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this._jobBusy = false;
    this._lastJobId = null;
    this.idle = new Idle();
    this.idle.startIdle();
  }

  async init() {
    await super.init();

    onCharacter("cm", async (m) => {
      if (!is_friendly(m.name)) return;
      const data = m.message;
      if (!data || !data.cmd) return;

      switch (data.cmd) {
        case "mage:magiport": {
          const cfg = getConfig();
          if (cfg.mageName && character.name !== cfg.mageName) return;

          if (this._jobBusy) {
            try {
              send_cm(m.name, {
                cmd: "mage:magiport_result",
                ok: false,
                taskId: data.taskId || null,
                reason: "busy",
              });
            } catch {
              // ignore
            }
            return;
          }

          this._jobBusy = true;
          this._lastJobId = data.taskId || null;
          const startedAt = Date.now();

          try {
            const task = data.task || null;
            await this._travelForTask(task);

            const res = await magiportTargets({
              targets: data.targets,
              task,
              taskId: data.taskId || null,
              ttlMs: data.ttlMs,
              force: Boolean(data.force),
            });

            try {
              send_cm(m.name, {
                cmd: "mage:magiport_result",
                ok: true,
                taskId: data.taskId || null,
                results: res.results,
                durationMs: Date.now() - startedAt,
                at: { map: character.map, x: character.x, y: character.y },
              });
            } catch {
              // ignore
            }
          } catch (e) {
            warn("mage:magiport job failed", e);
            try {
              send_cm(m.name, {
                cmd: "mage:magiport_result",
                ok: false,
                taskId: data.taskId || null,
                reason: e && e.message ? e.message : String(e),
              });
            } catch {
              // ignore
            }
          } finally {
            this._jobBusy = false;
          }

          break;
        }

        case "mage:cancel": {
          this._jobBusy = false;
          break;
        }
      }
    });

    return this;
  }

  async _travelForTask(task) {
    if (!task || typeof task !== "object") return;

    const eventName = task.joinEvent || task.name;
    if (eventName && isJoinableEvent(eventName)) {
      try {
        await join(eventName);
      } catch (e) {
        warn("Mage failed to join event", eventName, e);
      }
      return;
    }

    const dest = task.target || task.smartMove;
    if (!dest) return;

    try {
      await smart_move(dest);
    } catch (e) {
      warn("Mage failed to smart_move", dest, e);
    }
  }

  async botLoop() {
    try {
      if (typeof set_message === "function") {
        set_message(`Mage ready | idle: ${this.idle.counter}s`);
      }
    } catch {
      // ignore
    }

    setTimeout(() => this.botLoop(), 1000);
  }
}

module.exports = {
  MageCharacter: Mage,
  Mage,
};
