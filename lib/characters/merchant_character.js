const { BotCharacter } = await require("./base_character.js");
const { Idle } = await require("../class_idle.js");
const { buyFromPonty } = await require("../npc_ponty_buy.js");
const { isGathering } = await require("../st_bool.js");
const { MerchantGatherFsm } =
  await require("../domains/gathering/merchant_gather_fsm.js");
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

    this._running = true;
    this._disposed = false;
    this._botLoopTimer = null;
    this._standerInterval = null;

    this._standerBusy = false;
    this._standerInterval = setInterval(() => {
      if (!this._running || this._disposed) return;
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
    if (!this._running || this._disposed) return;

    try {
      if (typeof set_message === "function") {
        set_message(`Merchant active | idle: ${this.idle.counter}s`);
      }
    } catch {
      // ignore
    }
    await this.goGather();
    await this.doVendorRuns();
    if (!this._running || this._disposed) return;
    this._botLoopTimer = setTimeout(() => this.botLoop(), 250);
  }

  async stander() {
    const computer = locate_item("computer");
    const basicStand = locate_item("stand0");

    const stand = computer !== -1 ? computer : basicStand;
    if (stand === -1) return;
    if (character.stand && (this.moving || smart.moving)) {
      await close_stand(stand);
      return;
    }
    if (!character.stand && !this.moving && !smart.moving) open_stand(stand);
    return;
  }

  async goGather(strGatherType) {
    await this.gatherFsm.runOnce(strGatherType);
  }

  async doVendorRuns() {
    if (isGathering()) return;
    if (this.gatherFsm.hasPendingTask()) return;
    if (this.idle.counter < 180) return;
    await smartMove(this.home);
    await buyFromPonty();
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
    this._running = false;
    this._disposed = true;

    try {
      if (this._botLoopTimer) clearTimeout(this._botLoopTimer);
    } catch {
      // ignore
    }
    this._botLoopTimer = null;

    try {
      if (this._standerInterval) clearInterval(this._standerInterval);
    } catch {
      // ignore
    }
    this._standerInterval = null;

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
