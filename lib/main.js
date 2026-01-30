// start the appropriate bot based on character class

// Expose the currently running bot instance (if any).
// NOTE: exporting a variable directly won't auto-update on reassignment, so we
// also write to module.exports.bot when we create it.
let bot = null;

// Constructors (filled in lazily when loaded)
let BotCharacterCtor = null;
let MerchantCtor = null;

// Load environment variables from .env file
// const { secrets } = await require("dotenv").config(); // must run before you read process.env

// const key = process.env.TELEGRAM_API_KEY;

async function main() {
  // Make base classes available for remote inspection.
  // (This is a lightweight module; safe to load for any character.)
  if (!BotCharacterCtor) {
    const botLib = await require("./bot.js");
    BotCharacterCtor = botLib.BotCharacter;
  }

  switch (character.ctype) {
    case "merchant": {
      // Current implementation exports `Merchant` (extends BotCharacter).
      const { Merchant } = await require("./merchant");
      MerchantCtor = Merchant;
      bot = new MerchantCtor();
      module.exports.bot = bot;
      module.exports.Merchant = MerchantCtor;
      module.exports.BotCharacter = BotCharacterCtor;
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

// Export surface for remote access.
module.exports = { main };

// Live getters so consumers see the current instance even after it changes.
Object.defineProperties(module.exports, {
  bot: {
    enumerable: true,
    get: () => bot,
  },
  BotCharacter: {
    enumerable: true,
    get: () => BotCharacterCtor,
  },
  Merchant: {
    enumerable: true,
    get: () => MerchantCtor,
  },
});
