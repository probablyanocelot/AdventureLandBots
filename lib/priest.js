const { BotCharacter } = await require("bot.js");

class Priest extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
  }

  async init() {
    await super.init();
    return this;
  }

  async botLoop() {
    try {
      if (typeof set_message === "function") {
        set_message("Priest ready (event combat only)");
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
