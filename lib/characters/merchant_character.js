const { BotCharacter } = await require("./base_character.js");
const { createMerchantService } =
  await require("../services/merchant/index.js");

class Merchant extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.merchantService = createMerchantService();
  }

  async botLoop() {
    return this.merchantService.botLoop();
  }

  async stander() {
    return this.merchantService.stander();
  }

  async goGather(strGatherType) {
    return this.merchantService.goGather(strGatherType);
  }

  async doVendorRuns() {
    return this.merchantService.doVendorRuns();
  }

  checkForTools() {
    return this.merchantService.checkForTools();
  }

  check_for_tools() {
    return this.checkForTools();
  }

  stopRoutine() {
    try {
      super.stopRoutine?.();
    } catch {
      // ignore
    }

    try {
      this.merchantService?.stopRoutine?.();
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
  MerchantCharacter: Merchant,
  Merchant,
};
