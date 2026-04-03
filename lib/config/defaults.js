const envModule = await require("../al_env_config.js");
const { logCatch } = await require("../al_debug_log.js");

const resolvedEnv =
  envModule && typeof envModule.then === "function" ? null : envModule;

const getRemoteTelemetryWsPortSafe = () => {
  try {
    if (typeof window === "undefined") return null;
    if (typeof window.TELEMETRY_WS_PORT === "number") {
      return Number.isFinite(window.TELEMETRY_WS_PORT)
        ? window.TELEMETRY_WS_PORT
        : null;
    }
    const cfg = window.AL_BOTS_CONFIG;
    const telemetry = cfg && typeof cfg === "object" ? cfg.telemetry : null;
    if (telemetry && typeof telemetry.wsPort === "number") {
      return Number.isFinite(telemetry.wsPort) ? telemetry.wsPort : null;
    }
    if (telemetry && typeof telemetry.wsUrl === "string") {
      try {
        const url = new URL(telemetry.wsUrl);
        const port = Number(url.port);
        return Number.isFinite(port) ? port : null;
      } catch (e) {
        logCatch("getRemoteTelemetryWsPortSafe parse failed", e);
        return null;
      }
    }
  } catch (e) {
    logCatch("getRemoteTelemetryWsPortSafe failed", e);
    return null;
  }
  return null;
};

const getCharactersSafe = () => {
  try {
    if (typeof get_characters !== "function") return [];
    const chars = get_characters();
    return Array.isArray(chars) ? chars : [];
  } catch (e) {
    logCatch("getCharactersSafe failed", e);
    return [];
  }
};

const pickHighestLevelByType = (type) => {
  if (!type) return null;
  const chars = getCharactersSafe().filter((c) => c?.type === type);
  if (!chars.length) return null;

  chars.sort((a, b) => {
    const onlineA = Number(a?.online || 0) > 0 ? 1 : 0;
    const onlineB = Number(b?.online || 0) > 0 ? 1 : 0;
    if (onlineB !== onlineA) return onlineB - onlineA;
    const levelDiff = Number(b?.level || 0) - Number(a?.level || 0);
    if (levelDiff) return levelDiff;
    return String(a?.name || "").localeCompare(String(b?.name || ""));
  });

  return chars[0]?.name || null;
};

const buildLocalWsUrl =
  resolvedEnv && typeof resolvedEnv.buildLocalWsUrl === "function"
    ? resolvedEnv.buildLocalWsUrl
    : (port) => (port ? `wss://127.0.0.1:${port}` : null);
const getTelemetryWsPort =
  resolvedEnv && typeof resolvedEnv.getTelemetryWsPort === "function"
    ? resolvedEnv.getTelemetryWsPort
    : () => getRemoteTelemetryWsPortSafe();

const DEFAULT_CONFIG = Object.freeze({
  mageName: "Hoodlamb",
  trustedMages: ["Hoodlamb", "GoodLamb"],
  magiportSkipIfNearby: true,
  magiportNearbyDistance: 400,
  orchestrator: {
    enabled: true,
    runOnCtype: "merchant",
  },
  mageSwap: {
    enabled: false,
    codeSlotOrName: 93,
    strategy: "lowest_priority",
    swapPriorityList: [],
  },
  priestSwap: {
    enabled: false,
    priestName: "prayerBeads",
    codeSlotOrName: 93,
    swapPriorityList: [],
  },
  swapRouting: {
    enabled: false,
    hookName: "AL_BOTS_ROUTE_CHARACTER",
    serverRegion: null,
    serverIdentifier: null,
  },
  debug: {
    combat: true,
    blockerTracking: true,
    pickHuntDestination: false,
  },
  eventCombat: {
    enabled: true,
    // Optional fixed attack loop cadence override in milliseconds.
    // When null, cadence auto-derives from attack frequency + ping.
    attackIntervalMs: null,
  },
  upkeep: {
    priestHpPotEmergencyRatio: 0.45,
    exchange: {
      allowCompoundableItems: false,
      excludeItemNames: ["lostearring", "mistletoe"],
    },
    upgrade: {
      enabled: true,
      requireComputer: true,
      maxLevelAnyClass: 2,
      maxLevelMerchant: 8,
      attemptCooldownMs: 1000,
      excludeItemNames: ["rod", "pickaxe"],
    },
  },
  noEventFarming: {
    enabled: true,
    // citizen0 can be true/false (legacy) or object for fine-tuned behavior.
    crabRangerName: "camelCase",
    crabJoinPolicy: {
      enabled: true,
      minOnlineFarmers: 1,
      requireCapableNonRangerPair: false,
      requireDifficultTarget: false,
      onlyTargets: ["crab", "porcupine"],
      denyTargets: [],
    },
    highestLuckRangerCrabHold: true,
    highestLuckRangerRareMobRadius: 320,
    highestLuckRangerEggLuckThresholdMs: 4 * 3600 * 1000,
    manualFarmMob: null,
    huntMapDenyByTarget: {
      mummy: ["spookytown"],
      cgoo: ["arena"],
    },
    huntMapPreferByTarget: {
      bat: ["cave"],
      mummy: ["level3"],
      cgoo: ["level2s"],
      // Example:
      // crabx: ["main"],
    },
    huntMapAllowByTarget: {
      // Example:
      // skeletor: ["arena"],
    },
    huntSpotsByTarget: {
      bat: [{ map: "cave", x: 1235, y: -9 }],
      crab: [{ map: "main", x: -1192.3, y: -115 }],
      bee: [{ map: "main", x: 526.028025025507, y: 1089.6377422678054 }],
    },
    weakMaxHp: 10000,
    weakMaxAttack: 350,
    highAttack: 600,
    highHp: 30000,
    longFightHp: 100000,
    lowAttack: 350,
    disableHuntBlockers: true,
    requirePriestForWarriorHardPull: false,
    minHuntHitsToDie: 3,
    assistDangerHpRatio: 0.55,
    priestPartyHealOutputMod: 0.7,
    priestPartyHealMinTargets: 2,
    partyWipesBeforeAbort: 2,
    groupSafeSpot: "poisio",
    aggroLockChain: {
      enabled: false,
      warriorName: "Boink",
      priestName: "prayerBeads",
      npcMageName: "GoodLamb",
      huntMageName: "Hoodlamb",
      codeSlotOrName: 93,
      swapPriorityList: [],
      stopNpcMageAfterChainPort: true,
      requirePriestAggro: true,
      sameTargetOnly: true,
      requestCooldownMs: 6000,
      pendingTimeoutMs: 12000,
    },
    blockerTracking: {
      enabled: true,
    },
    citizen0: {
      enabled: true,
      movementThresholdPx: 50,
      auraGraceMs: 1200,
      auraStopWaitMs: 500,
      approachDurationMs: 9000,
      returnDurationMs: 12000,
      confettiCooldownMs: 19000,
      firecrackersCooldownMs: 199000,
      proximityDistancePx: 25,
      leashRadiusPx: 18,
    },
  },
  autoParty: {
    enabled: true,
  },
  merchantAssist: {
    enabled: true,
    merchantName: "VendorGuy" || "TesterGuy",
    requesterEnabled: true,
    // How often to evaluate whether unpack should be requested.
    unpackCheckIntervalMs: 1000,
    // How often to attempt sending one inventory item during unpack handoff.
    unpackSendIntervalMs: 250,
    requestCooldownMs: 45000,
    inventoryFreeSlotsThreshold: 4,
    doNotSendItemNames: [
      "tracker",
      "computer",
      "supercomputer",
      "mpot0",
      "mpot1",
      "hpot0",
      "hpot1",
      "firecrackers",
      "confetti",
      "elixirluck",
    ],
    skipPumpkinSpiceWhenRogue: true,
    whenCannotJoin: "stay_main",
  },
  merchantRole: {
    bankCraftingEnabled: false,
    crafting: {
      enabled: false,
      includeBankInCraftability: true,
      includeAllGameRecipes: false,
      recipeNames: [],
      recipeTargets: [],
    },
  },
  merchantRuntime: {
    // Runtime extras that can be toggled on/off without code edits.
    massExchange: {
      enabled: true,
    },
    mluck: {
      enabled: true,
      range: 320,
      // Refresh our own mluck slightly before expiry.
      refreshMsThreshold: 50 * 60 * 1000,
    },
    emotions: {
      enabled: false,
      emotionName: "hearts_single",
      intervalMs: 2000,
    },
    keybinds: {
      enabled: false,
      giveSparesKey: "0",
      devToolsKey: "F12",
    },
    telegram: {
      enabled: false,
      token: null,
      chatId: null,
      minIntervalMs: 5000,
    },
    rareMobScan: {
      enabled: true,
      names: [
        "tiger",
        "cutebee",
        "grinch",
        "goldenbat",
        "mvampire",
        "phoenix",
        "greenjr",
        "jr",
        "rudolph",
      ],
      scanIntervalMs: 2000,
      alertRepeatMs: 5 * 60 * 1000,
      announceToGameLog: true,
    },
    discountBuy: {
      enabled: false,
      scanIntervalMs: 1500,
      maxDistance: 300,
      maxPriceRatio: 0.85,
      includeItemNames: [],
      excludeItemNames: [],
      maxPriceByItem: {},
      maxQtyPerPurchase: 1,
    },
    bankOverview: {
      enabled: false,
    },
    bankHanoi: {
      enabled: false,
      intervalMs: 30000,
    },
    compound: {
      enabled: false,
      intervalMs: 1500,
      maxItemLevel: 1,
      allowItemNames: [],
      denyItemNames: [],
    },
    citizen0Lure: {
      enabled: false,
    },
  },
  telemetry: {
    enabled: false,
    wsUrl: buildLocalWsUrl(getTelemetryWsPort()),
    intervalMs: 2000,
  },
});

module.exports = {
  DEFAULT_CONFIG,
  pickHighestLevelByType,
};
