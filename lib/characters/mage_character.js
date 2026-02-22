const { BotCharacter } = await require("./base_character.js");
const { createIdleStatusShell } = await require("./composition.js");
const { installMageMagiportService } =
  await require("../domains/cm/mage_magiport_service.js");

class Mage extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.shell = createIdleStatusShell({ label: "Mage" });
    this.idle = this.shell.idle;
    this._mageService = null;
  }

  async init() {
    await super.init();
    try {
      this._mageService?.stop?.();
    } catch {
      // ignore
    }
    this._mageService = installMageMagiportService();

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
      this._mageService?.stop?.();
    } catch {
      // ignore
    }
    this._mageService = null;

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
  MageCharacter: Mage,
  Mage,
};
