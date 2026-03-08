const { BotCharacter } = await require("./base_character.js");
const { createIdleStatusShell } = await require("./composition.js");

class Paladin extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.shell = createIdleStatusShell({ label: "Paladin" });
    this.idle = this.shell.idle;
  }

  async init() {
    await super.init();
    return this;
  }

  async botLoop() {
    this.shell.start();
  }

  stopRoutine() {
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
    this.stopRoutine();
  }

  [Symbol.dispose]() {
    this.stopRoutine();
  }

  async [Symbol.asyncDispose]() {
    this.stopRoutine();
  }
}

module.exports = {
  PaladinCharacter: Paladin,
  Paladin,
};
