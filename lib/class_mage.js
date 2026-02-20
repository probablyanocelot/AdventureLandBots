const { BotCharacter } = await require("./class_bot.js");
const { Idle } = await require("./class_idle.js");
const { getConfig } = await require("./al_config.js");
const { isJoinableEvent } = await require("./fn_server_events.js");
const { magiportTargets } = await require("./cm_magiport.js");
const { sleepMs } = await require("./fn_time.js");
const { info, warn } = await require("./al_debug_log.js");
const { onCharacter } = await require("./event_listeners.js");
const { is_friendly } = await require("./group_party.js");

class Mage extends BotCharacter {
  constructor(data = parent.character) {
    super(data);

    // Prevent overlapping jobs.
    this._jobBusy = false;
    this._lastJobId = null;
    this.idle = new Idle();
    this.idle.startIdle();
  }

  async init() {
    await super.init();

    // Mage-specific CM commands.
    // These are separate from BotCharacter's CM handler so we don't have to
    // centralize all commands there.
    onCharacter("cm", async (m) => {
      if (!is_friendly(m.name)) return;
      const data = m.message;
      if (!data || !data.cmd) return;

      switch (data.cmd) {
        // Run a magiport job.
        // Expected:
        //   {
        //     cmd: "mage:magiport",
        //     taskId: "...",
        //     task: { name, joinEvent?, target?, smartMove? },
        //     targets: ["Char1","Char2"],
        //     force: false,
        //     ttlMs: 15000
        //   }
        case "mage:magiport": {
          // Don't run jobs if we're not the configured mage.
          const cfg = getConfig();
          if (cfg.mageName && character.name !== cfg.mageName) return;

          if (this._jobBusy) {
            // Best-effort: notify caller that we're busy.
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

            // Optional: travel/join first so ports land at the task location.
            await this._travelForTask(task);

            // Execute magiport.
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

        // Cancellation hook (best-effort).
        case "mage:cancel": {
          // This routine is cooperative; we currently only clear local busy flag.
          // Orchestrator should also broadcast `magiport:clear` to recipients.
          this._jobBusy = false;
          break;
        }
      }
    });

    return this;
  }

  async _travelForTask(task) {
    if (!task || typeof task !== "object") return;

    // Joinable event handling.
    // If the task is a joinable event, join it; this positions the mage inside the event.
    const eventName = task.joinEvent || task.name;
    if (eventName && isJoinableEvent(eventName)) {
      try {
        // join() resolves quickly on success.
        await join(eventName);
      } catch (e) {
        // Not fatal; mage can still magiport at current location.
        warn("Mage failed to join event", eventName, e);
      }
      return;
    }

    // Location-based movement
    const dest = task.target || task.smartMove;
    if (!dest) return;

    try {
      await smart_move(dest);
    } catch (e) {
      warn("Mage failed to smart_move", dest, e);
    }
  }

  async botLoop() {
    // Minimal heartbeat loop.
    // The mage primarily responds to CM-driven jobs.
    try {
      if (typeof set_message === "function") {
        set_message(`Mage ready | idle: ${this.idle.counter}s`);
      }
    } catch {
      // ignore
    }

    // Keep the loop running.
    setTimeout(() => this.botLoop(), 1000);
  }
}

module.exports = {
  Mage,
};
