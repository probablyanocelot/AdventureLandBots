// start the appropriate bot based on character class

// Expose the currently running bot instance (if any).
// NOTE: exporting a variable directly won't auto-update on reassignment, so we
// also write to module.exports.bot when we create it.
let bot = null;
let orchestrator = null;
let runtimeScope = null;

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

const { bootCharacterRuntime } =
  await require("./runtime/character_runtime.js");

async function main() {
  const result = await bootCharacterRuntime({
    previousRuntimeScope: runtimeScope,
    ctorCache: {
      BotCharacterCtor,
      MerchantCtor,
      MageCtor,
      OrchestratorCtor,
      WarriorCtor,
      RangerCtor,
      PriestCtor,
      RogueCtor,
      PaladinCtor,
    },
  });

  runtimeScope = result?.runtimeScope || null;
  bot = result?.bot || null;
  orchestrator = result?.orchestrator || null;

  const nextCtors = result?.ctorCache || {};
  BotCharacterCtor = nextCtors.BotCharacterCtor || BotCharacterCtor;
  MerchantCtor = nextCtors.MerchantCtor || MerchantCtor;
  MageCtor = nextCtors.MageCtor || MageCtor;
  OrchestratorCtor = nextCtors.OrchestratorCtor || OrchestratorCtor;
  WarriorCtor = nextCtors.WarriorCtor || WarriorCtor;
  RangerCtor = nextCtors.RangerCtor || RangerCtor;
  PriestCtor = nextCtors.PriestCtor || PriestCtor;
  RogueCtor = nextCtors.RogueCtor || RogueCtor;
  PaladinCtor = nextCtors.PaladinCtor || PaladinCtor;

  module.exports.runtimeScope = runtimeScope;
  module.exports.bot = bot;
  module.exports.orchestrator = orchestrator;

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
  runtimeScope: {
    enumerable: true,
    get: () => runtimeScope,
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
