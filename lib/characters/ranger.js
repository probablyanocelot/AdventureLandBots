const { BotCharacter } = await require("./bot.js");
const { Idle } = await require("../util/idle.js");

class Ranger extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.idle = new Idle();
    this.idle.startIdle();
  }

  async init() {
    await super.init();
    return this;
  }

  async botLoop() {
    try {
      if (typeof set_message === "function") {
        set_message(`Ranger ready | idle: ${this.idle.counter}s`);
      }
    } catch {
      // ignore
    }

    setTimeout(() => this.botLoop(), 1000);
  }
}

module.exports = {
  Ranger,
};
