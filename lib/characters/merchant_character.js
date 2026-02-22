const { BotCharacter } = await require("./base_character.js");
const { Idle } = await require("../class_idle.js");
const { isGathering } = await require("../domains/state/flags.js");
const { MerchantGatherFsm } =
  await require("../domains/gathering/merchant_gather_fsm.js");
const { createMerchantBehavior } =
  await require("../domains/gathering/merchant_behavior.js");
const { smartMove } = await require("../infra/game_api.js");

class Merchant extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.home = { map: "main", x: -202, y: -50 };
    this.idle = new Idle();
    this.idle.startIdle();
    this.action = null;

    this.gatherLoc = {
      fishing: { map: "main", x: -1368, y: -216 },
      mining: { map: "woffice", x: -153.15, y: -177 },
    };
    this.gatherFsm = new MerchantGatherFsm({
      gatherLoc: this.gatherLoc,
      order: ["fishing", "mining"],
      repeatMs: 15000,
    });
    this.behavior = createMerchantBehavior({
      idle: this.idle,
      gatherFsm: this.gatherFsm,
      home: this.home,
    });
    this.tunnelMine = { map: "tunnel", x: -280, y: -10 };
    this.wofficeMine = { map: "woffice", x: -153.15, y: -177 };
    this.fishing = { map: "main", x: -1368, y: -216 };
  }

  async botLoop() {
    this.behavior.start();
  }

  async stander() {
    return this.behavior.stander();
  }

  async goGather(strGatherType) {
    return this.behavior.goGather(strGatherType);
  }

  async doVendorRuns() {
    return this.behavior.doVendorRuns();
  }

  check_for_tools() {
    let hasRod = false;
    let hasPickaxe = false;
    let hasRodWish = false;
    let hasPickaxeWish = false;
    for (let item of character.items) {
      if (item?.name == "pickaxe") hasPickaxe = true;
      if (item?.name == "rod") hasRod = true;
    }

    for (let slot of Object.keys(character.slots)) {
      let item = character.slots[slot];
      if (item?.name == "pickaxe") hasPickaxeWish = true;
      if (item?.name == "rod") hasRodWish = true;
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
      smartMove(this.home)
        .then(() => {
          this.thinking = false;
        })
        .catch(() => {
          smartMove(this.home);
          this.thinking = false;
        });
    }
  }

  stop() {
    try {
      super.stop?.();
    } catch {
      // ignore
    }

    try {
      this.behavior?.stop?.();
    } catch {
      // ignore
    }

    try {
      this.idle?.stop?.();
    } catch {
      // ignore
    }
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
  MerchantCharacter: Merchant,
  Merchant,
};
