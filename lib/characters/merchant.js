const { BotCharacter } = await require("bot.js");
const { Idle } = await require("idle.js");
const { buyFromPonty } = await require("npcs/ponty.js");

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
    await this.goFish();
    await this.goMine();
    await this.doVendorRuns();
    // this.check_for_tools();
    // this.replaceTools();
    // this.goHomeIfIdle();
    setTimeout(() => this.botLoop(), 250); // loop every 1/4 second
  }

  async stander() {
    // Close our stand while moving (either manual movement or smart_move).
    if (character.stand && (this.moving || smart.moving)) {
      await close_stand(locate_item("computer"));
      return;
    }
    if (!character.stand && !this.moving && !smart.moving)
      open_stand(locate_item("computer"));
    return;
  }

  async goFish() {
    if (is_on_cooldown("fishing")) return;
    if (character.c.fishing) return;
    if (locate_item("rod") == -1 && character.slots.mainhand.name != "rod")
      return;
    // this.setAction("fishing");
    if (character.x != this.fishing.x || character.y != this.fishing.y)
      await smart_move(this.fishing);
    if (character.slots?.mainhand.name != "rod") equip(locate_item("rod"));
    if (!character.c.fishing) await use_skill("fishing");
  }

  async goMine() {
    if (is_on_cooldown("mining")) return;
    if (locate_item("pickaxe") == -1 && character.slots?.mainhand != "pickaxe")
      return;
    // this.setAction("mining");
    if (character.x != this.mining.x || character.y != this.mining.y)
      await smart_move(this.wofficeMine);
    if (character.slots?.mainhand.name != "pickaxe")
      equip(locate_item("pickaxe"));
    if (!character.c.mining) await use_skill("mining");
  }

  async doVendorRuns() {
    if (this.idle.counter < 180) return;
    // if (this.action) return;
    // this.setAction("doing runs");
    await smart_move(this.home);
    await buyFromPonty();
    //     .then(() => {
    //       buyFromPonty();
    //       if (!goblin_updated) {
    //         this.buyFromGoblin2();
    //       } else {
    //         smart_move("woffice")
    //           .then(() => {
    //             buyFromGoblin();
    //             this.clearAction();
    //             this.bank();
    //             //this.clearAction();
    //             // smart_move(this.home)
    //           })
    //           .catch(() => {
    //             log("FAILURE Gobbo");
    //             this.idle_counter = 0;
    //             this.clearAction();
    //           });
    //       }
    //     })
    //     .catch(() => {
    //       log("FAILURE: Ponty");
    //       this.idle_counter = 0;
    //       this.clearAction();
    //     });
    // }
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
    if (smart.moving || this.thinking || this.action) return;

    if (character.real_x != this.home.x && character.real_y != this.home.y) {
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

// function EXAMPLE_initMerch() {
//   if (character.ctype != "merchant") return;
//   merchantBot.loop();
//   craft_basket();
//   check_for_tools();
//   setInterval(hanoi, 30000);
//   sell_extras();
//   compound_loop();
//   upgrade_all();
//   high_upgrade_all();

//   //upgrade_all2();
//   alertSystem();
// }
// merchantBot = new Merchant();
// merchantBot.initMerch();

module.exports = {
  Merchant,
};
