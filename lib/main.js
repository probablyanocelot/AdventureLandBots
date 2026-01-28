// start the appropriate bot based on character class

// Expose the currently running bot instance (if any).
// NOTE: exporting a variable directly won't auto-update on reassignment, so we
// also write to module.exports.bot when we create it.
let bot = null;

async function main() {
  // Always start the idle monitor.
  const { Idle } = await require("./idle.js");
  const idler = new Idle();
  idler.startIdle();

  switch (character.ctype) {
    case "merchant": {
      // Current implementation exports `Merchant` (extends BotCharacter).
      const { Merchant } = await require("./merchant");
      bot = new Merchant();
      module.exports.bot = bot;
      // if (typeof bot.init === "function") await bot.init();
      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Merchant bot loaded, but no botLoop() found.");

      break;
    }
    default:
      console.log(
        `No class bot is implemented for ctype='${character.ctype}'. Idle monitor is running.`,
      );
  }

  return bot;
}

module.exports = { main, bot };
