const { BotCharacter } = await require("bot.js");
const { Idle } = await require("idle.js");
const { buyFromPonty } = await require("buy_from_ponty.js");

class Merchant extends BotCharacter {
  constructor(data) {
    super(data);
    this.home = { map: "main", x: -202, y: -50 };
    this.idle = new Idle(this);
    this.idle_counter = 0;
    this.action = null;
  }

  async botLoop() {
    // main bot loop logic goes here
    this.stander();
    await this.gather();
    // await this.doVendorRuns();
    // this.check_for_tools();
    // this.replaceTools();
    this.goHomeIfIdle();
    setTimeout(() => this.botLoop(), 250); // loop every 1/4 second
  }

  stander() {
    if (character.moving) {
      this.stand = false;
    } else {
      this.stand = true;
    }
    if (this.stand) {
      open_stand();
    } else {
      close_stand();
    }
  }

  async gather() {
    // TODO
    // only use this if we're not moving
    if (smart.moving || character.moving) return;

    if (this.action == "fishing" && !character.c.fishing) {
      // not at fishing spot, move to it
      if (
        character.x != location_map.fishing.x ||
        character.y != location_map.fishing.y
      )
        smart_move(location_map.fishing);
      // not wearing rod, equip it
      if (!character.slots.mainhand || character.slots.mainhand.name != "rod")
        equip(locate_item("rod"));

      // this.gatheringInterval('fishing')
    }
    if (this.action == "mining" && !character.c.mining) {
      // not at mining spot, move to it
      if (
        character.x != location_map.mining.x ||
        character.y != location_map.mining.y
      )
        smart_move(location_map.mining);
      // not wearing pickaxe, equip it
      if (
        !character.slots.mainhand ||
        character.slots.mainhand.name != "pickaxe"
      )
        equip(locate_item("pickaxe"));

      // this.gatheringInterval('mining')
    }
  }

  doVendorRuns() {
    if (this.action) return;
    this.setAction("doing runs");
    smart_move(this.home)
      .then(() => {
        buyFromPonty();
        if (!goblin_updated) {
          this.buyFromGoblin2();
        } else {
          smart_move("woffice")
            .then(() => {
              buyFromGoblin();
              this.clearAction();
              this.bank();
              //this.clearAction();
              // smart_move(this.home)
            })
            .catch(() => {
              log("FAILURE Gobbo");
              this.idle_counter = 0;
              this.clearAction();
            });
        }
      })
      .catch(() => {
        log("FAILURE: Ponty");
        this.idle_counter = 0;
        this.clearAction();
      });
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
