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
let WarriorCtor = null;
let RangerCtor = null;
let PriestCtor = null;
let RogueCtor = null;
let PaladinCtor = null;

// Load environment variables from .env file
// const { secrets } = await require("dotenv").config(); // must run before you read process.env

// const key = process.env.TELEGRAM_API_KEY;

const { warn, logCatch } = await require("./al_debug_log.js");

async function main() {
  // Make base classes available for remote inspection.
  // (This is a lightweight module; safe to load for any character.)
  if (!BotCharacterCtor) {
    const botLib = await require("./class_bot.js");
    BotCharacterCtor = botLib.BotCharacter;
  }

  const { getConfig, getRuntimeContext } = await require("./al_config.js");
  const cfg = getConfig();
  const runtime = getRuntimeContext();

  if (!runtime.inIframe && typeof performance_trick === "function") {
    try {
      performance_trick();
    } catch (e) {
      warn("Failed to run performance_trick", e);
    }
  }

  const startUnpackRequesterIfEnabled = async () => {
    try {
      // Runs on all non-merchants (including mage and any passive bots)
      if (character.ctype === "merchant") return;
      if (!cfg?.merchantAssist?.enabled) return;
      if (cfg?.merchantAssist?.requesterEnabled === false) return;

      const { installUnpackRequester } = await require("./cm_unpack.js");
      installUnpackRequester({ cfg });
    } catch (e) {
      warn("Failed to start unpack requester", e);
    }
  };

  const startEventCombatIfEnabled = async () => {
    try {
      if (character.ctype === "merchant") return;
      if (cfg?.eventCombat?.enabled === false) return;

      const { installEventCombat } = await require("./combat_event.js");
      installEventCombat({ cfg });
    } catch (e) {
      warn("Failed to start event combat", e);
    }
  };

  const startSustainIfEnabled = async () => {
    try {
      const { installSustain } = await require("./cm_sustain.js");
      installSustain({ cfg });
    } catch (e) {
      warn("Failed to start sustain routine", e);
    }
  };

  const joinActiveEventIfAvailable = async () => {
    try {
      if (character.ctype === "merchant") return;

      const { isJoinableEvent } = await require("./fn_server_events.js");
      const active = parent?.S || {};

      for (const name of Object.keys(active)) {
        if (!isJoinableEvent(name)) continue;
        if (character.in && character.in === name) return;

        try {
          await join(name);
          return;
        } catch (e) {
          logCatch("Auto-join event failed", e);
        }
      }
    } catch (e) {
      warn("Failed to auto-join active event", e);
    }
  };

  const startNoEventFarmingIfEnabled = async () => {
    try {
      if (character.ctype === "merchant") return;
      if (cfg?.noEventFarming?.enabled === false) return;

      const { installNoEventFarming } = await require("./al_farming_config.js");
      installNoEventFarming({ cfg });
    } catch (e) {
      warn("Failed to start no-event farming", e);
    }
  };

  const startAutoPartyIfEnabled = async () => {
    try {
      if (cfg?.autoParty?.enabled === false) return;
      const { installAutoParty } = await require("./util/auto_party.js");
      installAutoParty({ cfg });
    } catch (e) {
      warn("Failed to start auto-party", e);
    }
  };

  const startPriestSwapIfEnabled = async () => {
    try {
      if (cfg?.priestSwap?.enabled === false) return;
      const { installPriestSwap } = await require("./farming/priest_swap.js");
      installPriestSwap({ cfg });
    } catch (e) {
      warn("Failed to start priest swap", e);
    }
  };

  const startOrchestratorIfEligible = async () => {
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
      warn("Failed to start orchestrator", e);
    }
  };

  switch (character.ctype) {
    case "merchant": {
      // Current implementation exports `Merchant` (extends BotCharacter).
      const { Merchant } = await require("./characters/merchant.js");
      MerchantCtor = Merchant;
      bot = new MerchantCtor();
      module.exports.bot = bot;
      module.exports.Merchant = MerchantCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await startSustainIfEnabled();
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else warn("Merchant bot loaded, but no botLoop() found.");

      break;
    }

    case "mage": {
      const { Mage } = await require("./characters/mage.js");
      MageCtor = Mage;
      bot = new MageCtor();

      module.exports.bot = bot;
      module.exports.Mage = MageCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else warn("Mage bot loaded, but no botLoop() found.");

      break;
    }

    case "warrior": {
      const { Warrior } = await require("./characters/warrior.js");
      WarriorCtor = Warrior;
      bot = new WarriorCtor();

      module.exports.bot = bot;
      module.exports.Warrior = WarriorCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Warrior bot loaded, but no botLoop() found.");

      break;
    }

    case "ranger": {
      const { Ranger } = await require("./characters/ranger.js");
      RangerCtor = Ranger;
      bot = new RangerCtor();

      module.exports.bot = bot;
      module.exports.Ranger = RangerCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Ranger bot loaded, but no botLoop() found.");

      break;
    }

    case "priest": {
      const { Priest } = await require("./characters/priest.js");
      PriestCtor = Priest;
      bot = new PriestCtor();

      module.exports.bot = bot;
      module.exports.Priest = PriestCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Priest bot loaded, but no botLoop() found.");

      break;
    }

    case "rogue": {
      const { Rogue } = await require("./characters/rogue.js");
      RogueCtor = Rogue;
      bot = new RogueCtor();

      module.exports.bot = bot;
      module.exports.Rogue = RogueCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Rogue bot loaded, but no botLoop() found.");

      break;
    }

    case "paladin": {
      const { Paladin } = await require("./characters/paladin.js");
      PaladinCtor = Paladin;
      bot = new PaladinCtor();

      module.exports.bot = bot;
      module.exports.Paladin = PaladinCtor;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

      if (typeof bot.botLoop === "function") await bot.botLoop();
      else console.log("Paladin bot loaded, but no botLoop() found.");

      break;
    }

    default:
      // Minimal "passive" bot: install shared CM handlers (join + magiport prepare)
      // so this character can participate in orchestrated tasks.
      bot = new BotCharacterCtor();
      module.exports.bot = bot;
      module.exports.BotCharacter = BotCharacterCtor;

      if (typeof bot.init === "function") await bot.init();

      await startPriestSwapIfEnabled();
      await startAutoPartyIfEnabled();
      await joinActiveEventIfAvailable();
      await startUnpackRequesterIfEnabled();
      await startEventCombatIfEnabled();
      await startSustainIfEnabled();
      await startNoEventFarmingIfEnabled();

      // Orchestrator typically runs on merchant, but allow override.
      await startOrchestratorIfEligible();

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
  Warrior: {
    enumerable: true,
    get: () => WarriorCtor,
  },
  Ranger: {
    enumerable: true,
    get: () => RangerCtor,
  },
  Priest: {
    enumerable: true,
    get: () => PriestCtor,
  },
  Rogue: {
    enumerable: true,
    get: () => RogueCtor,
  },
  Paladin: {
    enumerable: true,
    get: () => PaladinCtor,
  },
});
