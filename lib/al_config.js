// Central configuration for the rework bots.
// This code runs inside the Adventure Land code iframe (browser-like environment).
const envModule = require("./al_env_config.js");
const { logCatch } = require("./al_debug_log.js");

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

  // Prefer online > offline, then highest level, then name for stability.
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
    : (port) => (port ? `ws://localhost:${port}` : null);
const getTelemetryWsPort =
  resolvedEnv && typeof resolvedEnv.getTelemetryWsPort === "function"
    ? resolvedEnv.getTelemetryWsPort
    : () => getRemoteTelemetryWsPortSafe();

const DEFAULT_CONFIG = Object.freeze({
  // Primary mage used for magiport operations.
  mageName: "HoodLamb",

  // Safe magiport: only accept requests from these mage names (when expecting a port).
  // Populated dynamically from get_characters(); you can override at runtime.
  trustedMages: ["HoodLamb"],

  // Skip magiport if already nearby (same map AND visible distance <= threshold).
  magiportSkipIfNearby: true,
  magiportNearbyDistance: 400,

  // Orchestrator host selection.
  // Default: run on merchant characters.
  orchestrator: {
    enabled: true,
    runOnCtype: "merchant",
  },

  // Hybrid mage management: keep non-mage fighters active, swap mage in only to port.
  // NOTE: Requires the in-game multi-character runner functions start_character/stop_character.
  mageSwap: {
    enabled: true,
    // REQUIRED for swap mode: passed to start_character(name, code_slot_or_name)
    // Set this to the code slot/name that runs the remote loader (e.g., a slot number or slot name).
    // If null/empty, swap mode will be disabled at runtime.
    codeSlotOrName: 90,
    // Pick a character to stop when we need to temporarily run the mage.
    // Strategy: "lowest_priority" uses `swapPriorityList` if provided, otherwise picks the first eligible.
    strategy: "lowest_priority",
    // Optional: list names in the order you'd prefer to swap OUT first.
    swapPriorityList: [],
  },

  // Ensure a priest is running; swap out another bot if needed.
  priestSwap: {
    enabled: true,
    // Name of the priest character to start if missing.
    priestName: "prayerBeads",
    // REQUIRED: passed to start_character(name, code_slot_or_name)
    codeSlotOrName: 90,
    // Optional: list names in the order you'd prefer to swap OUT first.
    swapPriorityList: [],
  },

  // Event combat: basic auto-attack during joinable events.
  eventCombat: {
    enabled: true,
  },

  // Upkeep behavior (pots/regen thresholds).
  upkeep: {
    priestHpPotEmergencyRatio: 0.45,
  },

  // No-event farming behavior (no joinable events active).
  noEventFarming: {
    enabled: true,
    crabRangerName: "camelCase",
    // Avoid known-dangerous hunt maps per target.
    huntMapDenyByTarget: {
      mummy: ["spookytown"],
    },
    // Weak target thresholds (prefer burst comps / rangers).
    weakMaxHp: 900,
    weakMaxAttack: 120,
    // Difficulty thresholds for pairing.
    highAttack: 500,
    highHp: 15000,
    longFightHp: 30000,
    lowAttack: 350,
    // Safety margin for hunts: if estimated hits to die drop below this, ask for help.
    minHuntHitsToDie: 3,
    // Team assist: flag a farmer as danger when hp ratio drops below this while under attack.
    assistDangerHpRatio: 0.55,
    // Priest support: groupheal output fallback estimate when game data has no explicit output.
    priestGroupHealOutputMod: 0.7,
    // Priest support: minimum nearby injured targets before preferring groupheal.
    priestGroupHealMinTargets: 2,
    // If priest is active and full group wipes this many times on same task, abort + regroup.
    partyWipesBeforeAbort: 2,
    // Group fallback location used for regroup/idle safety.
    groupSafeSpot: "poisio",
    // Experimental monsterhunt chaining: keep priest aggro while warrior refreshes task.
    aggroLockChain: {
      enabled: true,
      // Warrior that handles NPC interaction + hunt combat refresh loop.
      warriorName: "Boink",
      // Priest expected to hold aggro of last hunt target during task refresh.
      priestName: "prayerBeads",
      // Mage parked at monsterhunter NPC to port warrior for task interaction.
      npcMageName: "GoodLamb",
      // Mage parked at hunt location to port warrior back to combat.
      huntMageName: "Hoodlamb",
      // Optional swap code slot override for chain mages. Falls back to mageSwap.codeSlotOrName.
      codeSlotOrName: 90,
      // Optional swap preference while starting role-specific chain mages.
      swapPriorityList: [],
      // After hunt-side magiport, stop NPC mage to free slots for farming composition.
      stopNpcMageAfterChainPort: true,
      // Require priest to be holding same mtype aggro before attempting chain.
      requirePriestAggro: true,
      // Only port back to hunt if refreshed task matches previous target.
      sameTargetOnly: true,
      // CM/magiport throttles.
      requestCooldownMs: 6000,
      pendingTimeoutMs: 12000,
    },
  },

  autoParty: {
    enabled: true,
  },

  // Merchant assistance for inventory unloading.
  merchantAssist: {
    enabled: true,
    // Who should receive unpack requests from non-merchants.
    // This should be the character name of the merchant running the orchestrator.
    merchantName: "VendorGuy" || "TesterGuy",

    // Farmer-side requester (runs on all non-merchants).
    requesterEnabled: true,
    // Throttle between unpack requests per character.
    requestCooldownMs: 45000,
    // Trigger when free slots <= threshold.
    inventoryFreeSlotsThreshold: 4,
    // Additional exact item names farmers should keep and not hand to merchant.
    doNotSendItemNames: [],

    // If the merchant cannot join an event, keep it in main and rely on porting when needed.
    whenCannotJoin: "stay_main",
  },

  // Telemetry stream for dashboards.
  telemetry: {
    enabled: true,
    wsUrl: buildLocalWsUrl(getTelemetryWsPort()),
    intervalMs: 2000,
  },
});

const getUserConfig = () => {
  try {
    // Allow runtime override from console/snippets
    //   window.AL_BOTS_CONFIG = { trustedMages:["Hoodlamb","OtherMage"], ... }
    if (typeof window !== "undefined" && window.AL_BOTS_CONFIG) {
      const cfg = window.AL_BOTS_CONFIG;
      if (cfg && typeof cfg === "object") return cfg;
    }
  } catch (e) {
    logCatch("getUserConfig failed", e);
  }
  return null;
};

const deepMerge = (base, override) => {
  if (!override || typeof override !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(override)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      base &&
      typeof base[k] === "object"
    ) {
      out[k] = deepMerge(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
};

const getConfig = () => {
  const userCfg = getUserConfig();
  const cfg = deepMerge(DEFAULT_CONFIG, userCfg);

  // Normalize + dynamic character discovery
  const detectedMage = pickHighestLevelByType("mage");
  if (!cfg.mageName && detectedMage) cfg.mageName = detectedMage;

  cfg.trustedMages = Array.isArray(cfg.trustedMages)
    ? cfg.trustedMages.filter(Boolean)
    : [];
  if (!cfg.trustedMages.length && detectedMage)
    cfg.trustedMages = [detectedMage];
  if (cfg.mageName && !cfg.trustedMages.includes(cfg.mageName))
    cfg.trustedMages.unshift(cfg.mageName);

  cfg.magiportNearbyDistance = Math.max(
    50,
    Number(cfg.magiportNearbyDistance || DEFAULT_CONFIG.magiportNearbyDistance),
  );
  cfg.magiportSkipIfNearby = Boolean(cfg.magiportSkipIfNearby);

  cfg.orchestrator = cfg.orchestrator || DEFAULT_CONFIG.orchestrator;
  cfg.mageSwap = cfg.mageSwap || DEFAULT_CONFIG.mageSwap;
  cfg.priestSwap = cfg.priestSwap || DEFAULT_CONFIG.priestSwap;
  cfg.eventCombat = cfg.eventCombat || DEFAULT_CONFIG.eventCombat;
  cfg.upkeep = cfg.upkeep || DEFAULT_CONFIG.upkeep;
  cfg.noEventFarming = cfg.noEventFarming || DEFAULT_CONFIG.noEventFarming;
  cfg.autoParty = cfg.autoParty || DEFAULT_CONFIG.autoParty;
  cfg.merchantAssist = cfg.merchantAssist || DEFAULT_CONFIG.merchantAssist;
  cfg.telemetry = cfg.telemetry || DEFAULT_CONFIG.telemetry;

  cfg.upkeep.priestHpPotEmergencyRatio = Math.max(
    0.1,
    Math.min(
      0.9,
      Number(
        cfg.upkeep.priestHpPotEmergencyRatio ||
          DEFAULT_CONFIG.upkeep.priestHpPotEmergencyRatio,
      ),
    ),
  );

  // Merchant assist normalization
  cfg.merchantAssist.enabled = Boolean(cfg.merchantAssist.enabled);
  const detectedMerchant = pickHighestLevelByType("merchant");
  if (!cfg.merchantAssist.merchantName && detectedMerchant)
    cfg.merchantAssist.merchantName = detectedMerchant;
  cfg.merchantAssist.requesterEnabled =
    cfg.merchantAssist.requesterEnabled !== false;
  cfg.merchantAssist.requestCooldownMs = Math.max(
    5000,
    Number(
      cfg.merchantAssist.requestCooldownMs ||
        DEFAULT_CONFIG.merchantAssist.requestCooldownMs,
    ),
  );
  cfg.merchantAssist.inventoryFreeSlotsThreshold = Math.max(
    1,
    Number(
      cfg.merchantAssist.inventoryFreeSlotsThreshold ||
        DEFAULT_CONFIG.merchantAssist.inventoryFreeSlotsThreshold,
    ),
  );
  cfg.merchantAssist.doNotSendItemNames = Array.isArray(
    cfg.merchantAssist.doNotSendItemNames,
  )
    ? cfg.merchantAssist.doNotSendItemNames.filter(Boolean)
    : [...DEFAULT_CONFIG.merchantAssist.doNotSendItemNames];

  // No-event farming normalization
  const detectedRanger = pickHighestLevelByType("ranger");
  if (!cfg.noEventFarming.crabRangerName && detectedRanger)
    cfg.noEventFarming.crabRangerName = detectedRanger;

  const chain =
    cfg.noEventFarming.aggroLockChain ||
    DEFAULT_CONFIG.noEventFarming.aggroLockChain;
  cfg.noEventFarming.aggroLockChain = {
    ...DEFAULT_CONFIG.noEventFarming.aggroLockChain,
    ...(chain && typeof chain === "object" ? chain : {}),
  };
  cfg.noEventFarming.aggroLockChain.enabled = Boolean(
    cfg.noEventFarming.aggroLockChain.enabled,
  );
  cfg.noEventFarming.aggroLockChain.warriorName =
    cfg.noEventFarming.aggroLockChain.warriorName || null;
  cfg.noEventFarming.aggroLockChain.priestName =
    cfg.noEventFarming.aggroLockChain.priestName || null;
  cfg.noEventFarming.aggroLockChain.npcMageName =
    cfg.noEventFarming.aggroLockChain.npcMageName || null;
  cfg.noEventFarming.aggroLockChain.huntMageName =
    cfg.noEventFarming.aggroLockChain.huntMageName || null;
  cfg.noEventFarming.aggroLockChain.codeSlotOrName =
    cfg.noEventFarming.aggroLockChain.codeSlotOrName ?? null;
  cfg.noEventFarming.aggroLockChain.swapPriorityList = Array.isArray(
    cfg.noEventFarming.aggroLockChain.swapPriorityList,
  )
    ? cfg.noEventFarming.aggroLockChain.swapPriorityList.filter(Boolean)
    : [];
  cfg.noEventFarming.aggroLockChain.stopNpcMageAfterChainPort =
    cfg.noEventFarming.aggroLockChain.stopNpcMageAfterChainPort !== false;
  cfg.noEventFarming.aggroLockChain.requirePriestAggro =
    cfg.noEventFarming.aggroLockChain.requirePriestAggro !== false;
  cfg.noEventFarming.aggroLockChain.sameTargetOnly =
    cfg.noEventFarming.aggroLockChain.sameTargetOnly !== false;
  cfg.noEventFarming.aggroLockChain.requestCooldownMs = Math.max(
    1500,
    Number(
      cfg.noEventFarming.aggroLockChain.requestCooldownMs ||
        DEFAULT_CONFIG.noEventFarming.aggroLockChain.requestCooldownMs,
    ),
  );
  cfg.noEventFarming.aggroLockChain.pendingTimeoutMs = Math.max(
    3000,
    Number(
      cfg.noEventFarming.aggroLockChain.pendingTimeoutMs ||
        DEFAULT_CONFIG.noEventFarming.aggroLockChain.pendingTimeoutMs,
    ),
  );

  const denyByTarget = cfg.noEventFarming.huntMapDenyByTarget;
  if (!denyByTarget || typeof denyByTarget !== "object") {
    cfg.noEventFarming.huntMapDenyByTarget = {
      ...DEFAULT_CONFIG.noEventFarming.huntMapDenyByTarget,
    };
  } else {
    const normalized = {};
    for (const [target, maps] of Object.entries(denyByTarget)) {
      if (!target) continue;
      normalized[target] = Array.isArray(maps) ? maps.filter(Boolean) : [];
    }
    cfg.noEventFarming.huntMapDenyByTarget = normalized;
  }

  // Telemetry normalization
  cfg.telemetry.enabled = cfg.telemetry.enabled !== false;
  cfg.telemetry.intervalMs = Math.max(
    500,
    Number(cfg.telemetry.intervalMs || DEFAULT_CONFIG.telemetry.intervalMs),
  );
  cfg.telemetry.wsUrl = cfg.telemetry.wsUrl || DEFAULT_CONFIG.telemetry.wsUrl;

  return cfg;
};

// Detect whether this character was loaded by a parent (iframe) or standalone.
const getRuntimeContext = () => {
  if (typeof window === "undefined") {
    return {
      inBrowser: false,
      inIframe: false,
      hasOpener: false,
      loadedByParent: false,
      standalone: false,
    };
  }

  const inIframe = !!(window.parent && window.parent !== window);
  const hasOpener = !!window.opener;

  return {
    inBrowser: true,
    inIframe,
    hasOpener,
    loadedByParent: inIframe,
    standalone: !inIframe && !hasOpener,
  };
};

module.exports = {
  DEFAULT_CONFIG,
  getConfig,
  getRuntimeContext,
};
