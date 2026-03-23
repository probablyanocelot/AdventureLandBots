const {
  getEnv,
  getTelemetryWsPort,
  buildLocalWsUrl,
} = require("../al_env_config.js");
const { logCatch } = require("../al_debug_log.js");

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

// Use directly from al_env_config.js

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
      excludeItemNames: ["lostearring"],
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
    crabRangerName: "camelCase",
    crabJoinPolicy: {
      enabled: true,
      minOnlineFarmers: 3,
      requireCapableNonRangerPair: true,
      requireDifficultTarget: false,
      onlyTargets: [],
      denyTargets: ["porcupine"],
    },
    manualFarmMob: null,
    huntMapDenyByTarget: {
      mummy: ["spookytown"],
      cgoo: ["arena"],
    },
    huntMapPreferByTarget: {
      bat: ["cave"],
      // Example:
      // crabx: ["main"],
    },
    huntMapAllowByTarget: {
      // Example:
      // skeletor: ["arena"],
    },
    weakMaxHp: 900,
    weakMaxAttack: 120,
    highAttack: 500,
    highHp: 15000,
    longFightHp: 30000,
    lowAttack: 350,
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
    ],
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
  telemetry: {
    enabled: true,
    wsUrl: buildLocalWsUrl(getTelemetryWsPort()),
    intervalMs: 2000,
  },
});

module.exports = {
  DEFAULT_CONFIG,
  pickHighestLevelByType,
};
