const { BotCharacter } = await require("./class_bot.js");
const { Idle } = await require("./class_idle.js");
const { buyFromPonty } = await require("./npc_ponty_buy.js");
const { isGathering } = await require("./st_bool.js");

class Merchant extends BotCharacter {
  constructor(data = parent.character) {
    // IMPORTANT: If Merchant is instantiated with no args, we still need a live
    // reference to `parent.character`. Passing `undefined` into `super()` would
    // override BotCharacter's default and break getters like `this.stand`.
    super(data);
    this.home = { map: "main", x: -202, y: -50 };
    this.idle = new Idle();
    this.idle.startIdle();
    this.action = null;

    this.gatherLoc = {
      fishing: { map: "main", x: -1368, y: -216 },
      mining: { map: "woffice", x: -153.15, y: -177 },
    };
    this._gatherOrder = ["fishing", "mining"];
    this._gatherIndex = 0;
    this._gatherTask = null;
    this._gatherRepeatMs = 15000;

    // Run stander in its own non-blocking interval
    // Use a busy flag to avoid overlapping runs.
    this._standerBusy = false;
    setInterval(() => {
      if (this._standerBusy) return;
      this._standerBusy = true;
      this.stander()
        .catch(() => {})
        .finally(() => {
          this._standerBusy = false;
        });
    }, 250);
    this.tunnelMine = { map: "tunnel", x: -280, y: -10 };
    this.wofficeMine = { map: "woffice", x: -153.15, y: -177 };
    this.fishing = { map: "main", x: -1368, y: -216 };
  }

  async botLoop() {
    // main bot loop logic goes here
    try {
      if (typeof set_message === "function") {
        set_message(`Merchant active | idle: ${this.idle.counter}s`);
      }
    } catch {
      // ignore
    }
    await this.goGather();
    await this.doVendorRuns();
    // this.check_for_tools();
    // this.replaceTools();
    // this.goHomeIfIdle();
    setTimeout(() => this.botLoop(), 250); // loop every 1/4 second
  }

  async stander() {
    // Close our stand while moving (either manual movement or smart_move).
    const computer = locate_item("computer");
    const basicStand = locate_item("stand0");

    const stand = computer !== -1 ? computer : basicStand;
    if (stand === -1) return; // both missing
    if (character.stand && (this.moving || smart.moving)) {
      await close_stand(stand);
      return;
    }
    if (!character.stand && !this.moving && !smart.moving) open_stand(stand);
    return;
  }

  async goGather(strGatherType) {
    const requestedType =
      strGatherType ||
      this._gatherOrder[this._gatherIndex % this._gatherOrder.length];

    const buildTask = (type) => {
      switch (type) {
        case "fishing":
          return {
            type,
            tool: "rod",
            loc: this.gatherLoc.fishing,
            phase: "start",
            nextAttemptAt: 0,
          };
        case "mining":
          return {
            type,
            tool: "pickaxe",
            loc: this.gatherLoc.mining,
            phase: "start",
            nextAttemptAt: 0,
          };
        default:
          return null;
      }
    };

    const rotateTask = () => {
      this._gatherTask = null;
      this._gatherIndex = (this._gatherIndex + 1) % this._gatherOrder.length;
    };

    const sameTaskActive =
      this._gatherTask && this._gatherTask.type === requestedType;

    if (this._gatherTask && !sameTaskActive) {
      // Finish current task before trying to gather a different resource.
      return;
    }

    if (!this._gatherTask) {
      const nextTask = buildTask(requestedType);
      if (!nextTask) return;
      this._gatherTask = nextTask;
    }

    const task = this._gatherTask;
    if (!task?.type || !task?.loc || !task?.tool) {
      this._gatherTask = null;
      return;
    }

    // Switch tasks only when this one enters cooldown.
    if (is_on_cooldown(task.type)) {
      rotateTask();
      return;
    }

    // If currently channeling this resource, keep task locked until channel ends.
    if (character.c?.[task.type]) {
      task.phase = "active";
      return;
    }

    // If we just finished channeling, keep this task and wait for next repeat window.
    if (task.phase === "active" && !character.c?.[task.type]) {
      task.phase = "ready";
    }

    // Another gather task is currently active; wait.
    if (isGathering()) return;

    // Repeat this same gather task every fixed interval.
    if (Date.now() < Number(task.nextAttemptAt || 0)) return;

    const atLoc =
      character.map === task.loc.map &&
      Math.hypot(character.x - task.loc.x, character.y - task.loc.y) <= 25;

    if (!atLoc) {
      await smart_move(task.loc);
      task.phase = "moved";
      return;
    }

    if (character.slots.mainhand?.name !== task.tool) {
      const slot = locate_item(task.tool);
      if (slot === -1) {
        // Tool missing/broken: drop this task and move to the other one.
        rotateTask();
        return;
      }
      equip(slot);
      task.phase = "equipped";
      return;
    }

    await use_skill(task.type);
    task.phase = "active";
    task.nextAttemptAt = Date.now() + this._gatherRepeatMs;
  }

  async doVendorRuns() {
    if (isGathering()) return;
    if (this._gatherTask) return;
    if (this.idle.counter < 180) return;
    // if (this.action) return;
    // this.setAction("doing runs");
    await smart_move(this.home);
    await buyFromPonty();
  }

  check_for_tools() {
    let hasRod = false;
    let hasPickaxe = false;
    let hasRodWish = false;
    let hasPickaxeWish = false;
    for (let item of character.items) {
      if (item?.name == "pickaxe") {
        hasPickaxe = true;
      }

      if (item?.name == "rod") {
        hasRod = true;
      }
    }

    for (let slot of Object.keys(character.slots)) {
      let item = character.slots[slot];
      if (item?.name == "pickaxe") {
        hasPickaxeWish = true;
      }
      if (item?.name == "rod") {
        hasRodWish = true;
      }
    }
    if (!hasRod && !hasRodWish) buy_tool("rod");
    if (!hasPickaxe && !hasPickaxeWish) buy_tool("pickaxe");
  }

  replaceTools() {}

  compound_loop() {
    setInterval(() => {
      for (let itemName of upgradeDict.compound) {
        if (character.bank) continue;
        do_combine(itemName);
      }
    }, 1000);
  }

  goHomeIfIdle() {
    if (isGathering()) return;
    if (smart.moving || this.thinking || this.action) return;

    if (
      Math.abs(character.real_x / this.home.x) > 1.01 ||
      Math.abs(character.real_y / this.home.y) > 1.01
    ) {
      this.thinking = true;
      smart_move(this.home)
        .then(() => {
          this.thinking = false;
        })
        .catch(() => {
          smart_move(this.home);
          this.thinking = false;
        });
    }
  }
}

module.exports = {
  Merchant,
};
