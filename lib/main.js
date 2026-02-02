// start the appropriate bot based on character class

// Expose the currently running bot instance (if any).
// NOTE: exporting a variable directly won't auto-update on reassignment, so we
// also write to module.exports.bot when we create it.
let bot = null;
let orchestrator = null;

// Constructors (filled in lazily when loaded)
let BotCharacterCtor = null;
let MerchantCtor = null;
let MageCtor = null;
let OrchestratorCtor = null;

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

  const { getConfig } = await require("config.js");
  const cfg = getConfig();

  const maybeStartUnpackRequester = async () => {
    try {
      // Runs on all non-merchants (including mage and any passive bots)
      if (character.ctype === "merchant") return;
      if (!cfg?.merchantAssist?.enabled) return;
      if (cfg?.merchantAssist?.requesterEnabled === false) return;

      const { installUnpackRequester } =
        await require("routines/unpack_requester.js");
      installUnpackRequester({ cfg });
    } catch (e) {
      console.log("Failed to start unpack requester", e);
    }
  };

  const maybeStartOrchestrator = async () => {
    try {
      const runOn = cfg?.orchestrator?.runOnCtype || "merchant";
      if (!cfg?.orchestrator?.enabled) return;
      if (character.ctype !== runOn) return;

      const { Orchestrator } = await require("./orchestrator.js");
      OrchestratorCtor = Orchestrator;
      orchestrator = new OrchestratorCtor();
      module.exports.orchestrator = orchestrator;
      module.exports.Orchestrator = OrchestratorCtor;

      if (typeof orchestrator.init === "function") await orchestrator.init();
    } catch (e) {
      console.log("Failed to start orchestrator", e);
    }
  };

  switch (character.ctype) {
    case "merchant": {
      // Current implementation exports `Merchant` (extends BotCharacter).
      const { Merchant } = await require("./merchant");
      MerchantCtor = Merchant;
      bot = new MerchantCtor();
      module.exports.bot = bot;
      module.exports.Merchant = MerchantCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await maybeStartOrchestrator();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Merchant bot loaded, but no botLoop() found.");

      break;
    }

    case "mage": {
      const { Mage } = await require("./mage.js");
      MageCtor = Mage;
      bot = new MageCtor();

      module.exports.bot = bot;
      module.exports.Mage = MageCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await maybeStartUnpackRequester();

      // Orchestrator typically runs on merchant, but allow override.
      await maybeStartOrchestrator();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Mage bot loaded, but no botLoop() found.");

      break;
    }

    default:
      // Minimal "passive" bot: install shared CM handlers (join + magiport prepare)
      // so this character can participate in orchestrated tasks.
      bot = new BotCharacterCtor();
      module.exports.bot = bot;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await maybeStartUnpackRequester();

      // Orchestrator typically runs on merchant, but allow override.
      await maybeStartOrchestrator();

      console.log(
        `No class bot is implemented for ctype='${character.ctype}'. Running passive CM handlers only.`,
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
  orchestrator: {
    enumerable: true,
    get: () => orchestrator,
  },
  BotCharacter: {
    enumerable: true,
    get: () => BotCharacterCtor,
  },
  Merchant: {
    enumerable: true,
    get: () => MerchantCtor,
  },
  Mage: {
    enumerable: true,
    get: () => MageCtor,
  },
  Orchestrator: {
    enumerable: true,
    get: () => OrchestratorCtor,
  },
});
