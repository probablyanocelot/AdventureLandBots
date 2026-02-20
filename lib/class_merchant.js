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
    if (!character.c) await this.goGather("fishing");
    if (!character.c) await this.goGather("mining");
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
    if (isGathering()) return;
    if (is_on_cooldown(strGatherType)) return;
    if (character.c.fishing || character.c.mining) return;
    let tool;
    let loc;
    switch (strGatherType) {
      case "fishing":
        tool = "rod";
        loc = this.gatherLoc.fishing;
        break;
      case "mining":
        tool = "pickaxe";
        loc = this.gatherLoc.mining;
        break;
    }
    if (locate_item(tool) == -1 && character.slots.mainhand?.name != tool)
      return;
    // this.setAction("fishing");
    if (
      Math.abs(character.x / loc.x) > 1.01 ||
      Math.abs(character.y / loc.y) > 1.01
    ) {
      if (isGathering()) return;
      await smart_move(loc);
    }
    if (character.slots.mainhand?.name != tool) equip(locate_item(tool));
    if (!character.c.fishing && strGatherType === "fishing")
      await use_skill("fishing");
    if (!character.c.mining && strGatherType === "mining")
      await use_skill("mining");
  }

  async doVendorRuns() {
    if (isGathering()) return;
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
