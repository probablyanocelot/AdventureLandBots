const { isGathering } = await require("../state/flags.js");

class MerchantGatherFsm {
  constructor({
    gatherLoc = {
      fishing: { map: "main", x: -1368, y: -216 },
      mining: { map: "woffice", x: -153.15, y: -177 },
    },
    order = ["fishing", "mining"],
    repeatMs = 15000,
  } = {}) {
    this.gatherLoc = gatherLoc;
    this.order = Array.isArray(order) && order.length ? order : ["fishing"];
    this.repeatMs = Math.max(1000, Number(repeatMs || 15000));

    this._index = 0;
    this._task = null;
  }

  get task() {
    return this._task;
  }

  get activeType() {
    return this._task?.type || null;
  }

  hasPendingTask() {
    return Boolean(this._task);
  }

  reset() {
    this._task = null;
    this._index = 0;
  }

  _buildTask(type) {
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
  }

  _rotateTask() {
    this._task = null;
    this._index = (this._index + 1) % this.order.length;
  }

  async runOnce(strGatherType) {
    const requestedType =
      strGatherType || this.order[this._index % this.order.length];

    const sameTaskActive = this._task && this._task.type === requestedType;
    if (this._task && !sameTaskActive) {
      // Finish current task before switching requested resource.
      return;
    }

    if (!this._task) {
      const nextTask = this._buildTask(requestedType);
      if (!nextTask) return;
      this._task = nextTask;
    }

    const task = this._task;
    if (!task?.type || !task?.loc || !task?.tool) {
      this._task = null;
      return;
    }

    const isTaskChanneling = Boolean(character.c?.[task.type]);
    if (isTaskChanneling) {
      task.phase = "active";
      return;
    }

    if (task.phase === "active") {
      task.phase = "cooldown";
    }

    const onCooldown = is_on_cooldown(task.type);
    if (onCooldown) {
      const hasCompletedCycle =
        task.phase === "cooldown" || task.phase === "ready";
      if (hasCompletedCycle) this._rotateTask();
      return;
    }

    if (task.phase === "cooldown") {
      task.phase = "ready";
    }

    if (isGathering()) return;

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
        this._rotateTask();
        return;
      }
      equip(slot);
      task.phase = "equipped";
      return;
    }

    await use_skill(task.type);
    task.phase = "active";
    task.nextAttemptAt = Date.now() + this.repeatMs;
  }
}

module.exports = {
  MerchantGatherFsm,
};
