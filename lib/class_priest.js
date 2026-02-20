const { BotCharacter } = await require("./class_bot.js");
const { Idle } = await require("./class_idle.js");

class Priest extends BotCharacter {
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
        set_message(`Priest ready | idle: ${this.idle.counter}s`);
      }
    } catch {
      // ignore
    }

    setTimeout(() => this.botLoop(), 1000);
  }
}

module.exports = {
  Priest,
};
