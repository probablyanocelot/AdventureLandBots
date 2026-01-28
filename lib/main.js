// start the appropriate bot based on character class
async function main() {
  // Always start the idle monitor.
  const { Idle } = await require("./idle.js");
  const idler = new Idle();
  idler.startIdle();

  switch (character.ctype) {
    case "merchant": {
      // Current implementation exports `Merchant` (extends BotCharacter).
      const { Merchant } = await require("./merchant");
      const bot = new Merchant();
      if (typeof bot.init === "function") await bot.init();
      if (typeof bot.botLoop === "function") bot.botLoop();
      else console.log("Merchant bot loaded, but no botLoop() found.");

      break;
    }
    default:
      console.log(
        `No class bot is implemented for ctype='${character.ctype}'. Idle monitor is running.`,
      );
  }
}

module.exports = { main };
