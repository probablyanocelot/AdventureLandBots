const { BotCharacter } = await require("./base_character.js");
const { createIdleStatusShell } = await require("./composition.js");

class Priest extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.shell = createIdleStatusShell({ label: "Priest" });
    this.idle = this.shell.idle;
  }

  async init() {
    await super.init();
    return this;
  }

  async botLoop() {
    this.shell.start();
  }

  stop() {
    try {
      super.stop?.();
    } catch {
      // ignore
    }

    try {
      this.shell?.stop?.();
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
  PriestCharacter: Priest,
  Priest,
};
