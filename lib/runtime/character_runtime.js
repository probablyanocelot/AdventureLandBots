// Character runtime boot orchestrator.
// Purpose: create a scoped runtime, install policies/modules, and start the right class bot.
// Inputs: previous runtime scope + constructor cache.
// Side effects: installs global listeners/modules and starts bot loops.
// Cleanup: all installables are registered into `LifecycleScope` for deterministic disposal.

const { warn } = await require("../al_debug_log.js");
const { LifecycleScope } = await require("./lifecycle.js");
const { createModuleRegistry } = await require("./module_registry.js");
const { installGlobalRuntimeListeners } =
  await require("../domains/events/listeners.js");

const CLASS_REGISTRY = {
  merchant: {
    file: "../characters/merchant_character.js",
    exportName: "Merchant",
    missingLoopWarning: "Merchant bot loaded, but no botLoop() found.",
  },
  mage: {
    file: "../characters/mage_character.js",
    exportName: "Mage",
    missingLoopWarning: "Mage bot loaded, but no botLoop() found.",
  },
  warrior: {
    file: "../characters/warrior_character.js",
    exportName: "Warrior",
    missingLoopWarning: "Warrior bot loaded, but no botLoop() found.",
  },
  ranger: {
    file: "../characters/ranger_character.js",
    exportName: "Ranger",
    missingLoopWarning: "Ranger bot loaded, but no botLoop() found.",
  },
  priest: {
    file: "../characters/priest_character.js",
    exportName: "Priest",
    missingLoopWarning: "Priest bot loaded, but no botLoop() found.",
  },
  rogue: {
    file: "../characters/rogue_character.js",
    exportName: "Rogue",
    missingLoopWarning: "Rogue bot loaded, but no botLoop() found.",
  },
  paladin: {
    file: "../characters/paladin_character.js",
    exportName: "Paladin",
    missingLoopWarning: "Paladin bot loaded, but no botLoop() found.",
  },
};

const updateCtorCache = (cache, exportName, Ctor) => {
  const next = { ...(cache || {}) };
  switch (exportName) {
    case "Merchant":
      next.MerchantCtor = Ctor;
      break;
    case "Mage":
      next.MageCtor = Ctor;
      break;
    case "Warrior":
      next.WarriorCtor = Ctor;
      break;
    case "Ranger":
      next.RangerCtor = Ctor;
      break;
    case "Priest":
      next.PriestCtor = Ctor;
      break;
    case "Rogue":
      next.RogueCtor = Ctor;
      break;
    case "Paladin":
      next.PaladinCtor = Ctor;
      break;
    default:
      break;
  }
  return next;
};

const runBotLoop = async (instance, missingLoopWarning) => {
  if (typeof instance?.botLoop === "function") {
    await instance.botLoop();
    return;
  }
  warn(missingLoopWarning || "Bot loaded, but no botLoop() found.");
};

const ensureBotCharacterCtor = async (ctorCache) => {
  if (ctorCache?.BotCharacterCtor) return ctorCache.BotCharacterCtor;
  const botLib = await require("../characters/base_character.js");
  return botLib.BotCharacter;
};

const startClassBot = async ({
  spec,
  runtimeScope,
  BotCharacterCtor,
  ctorCache,
}) => {
  const mod = await require(spec.file);
  const Ctor = mod[spec.exportName];
  if (!Ctor) {
    warn(
      `Failed to load class constructor '${spec.exportName}' from ${spec.file}`,
    );
    return {
      bot: null,
      ctorCache,
    };
  }

  const nextCtorCache = updateCtorCache(ctorCache, spec.exportName, Ctor);

  const instance = new Ctor();
  runtimeScope?.use?.(instance);

  if (typeof instance.init === "function") await instance.init();

  return {
    bot: instance,
    ctorCache: {
      ...nextCtorCache,
      BotCharacterCtor,
    },
  };
};

const bootCharacterRuntime = async ({
  previousRuntimeScope = null,
  ctorCache = {},
} = {}) => {
  if (previousRuntimeScope && !previousRuntimeScope.disposed) {
    previousRuntimeScope.dispose();
  }

  const runtimeScope = new LifecycleScope(
    `runtime:${character?.name || "unknown"}`,
  );

  // Ensure global listener side-effects (CM logging/death handling) are
  // installed for this runtime and disposed on runtime shutdown.
  runtimeScope?.use?.(installGlobalRuntimeListeners());

  let nextCtorCache = { ...(ctorCache || {}) };

  const BotCharacterCtor = await ensureBotCharacterCtor(nextCtorCache);
  nextCtorCache.BotCharacterCtor = BotCharacterCtor;

  const { getConfig, getRuntimeContext } = await require("../al_config.js");
  const cfg = getConfig();
  const runtime = getRuntimeContext();

  let orchestrator = null;
  nextCtorCache.OrchestratorCtor = nextCtorCache.OrchestratorCtor || null;

  const moduleRegistry = createModuleRegistry({
    cfg,
    runtimeScope,
    onInstalled: (moduleName, installed) => {
      if (moduleName !== "orchestrator" || !installed?.resource) return;
      orchestrator = installed.resource;
      nextCtorCache.OrchestratorCtor =
        orchestrator?.constructor || nextCtorCache.OrchestratorCtor;
    },
  });

  if (!runtime.inIframe && typeof performance_trick === "function") {
    try {
      performance_trick();
    } catch (e) {
      warn("Failed to run performance_trick", e);
    }
  }

  await moduleRegistry.startPolicy("preBot");

  const classSpec = CLASS_REGISTRY[character.ctype];

  if (classSpec) {
    const started = await startClassBot({
      spec: classSpec,
      runtimeScope,
      BotCharacterCtor,
      ctorCache: nextCtorCache,
    });
    nextCtorCache = started.ctorCache;
    const bot = started.bot;
    if (!bot) {
      return {
        runtimeScope,
        bot: null,
        orchestrator,
        ctorCache: nextCtorCache,
      };
    }

    await moduleRegistry.startResolvedPolicy("postBot", {
      ctype: character.ctype,
      isPassive: false,
    });

    await runBotLoop(bot, classSpec.missingLoopWarning);

    return {
      runtimeScope,
      bot,
      orchestrator,
      ctorCache: nextCtorCache,
      activeClassExportName: classSpec.exportName,
    };
  }

  // Minimal "passive" bot: install shared CM handlers.
  const bot = new BotCharacterCtor();
  runtimeScope?.use?.(bot);

  if (typeof bot.init === "function") await bot.init();

  await moduleRegistry.startResolvedPolicy("postBot", {
    ctype: character.ctype,
    isPassive: true,
  });

  console.log(
    `No class bot is implemented for ctype='${character.ctype}'. Running passive CM handlers only.`,
  );

  return {
    runtimeScope,
    bot,
    orchestrator,
    ctorCache: nextCtorCache,
    activeClassExportName: null,
  };
};

module.exports = {
  CLASS_REGISTRY,
  bootCharacterRuntime,
};
