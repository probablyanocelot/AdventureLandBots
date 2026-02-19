// Central configuration for the rework bots.
// This code runs inside the Adventure Land code iframe (browser-like environment).

const envModule = require("./env.js");
const resolvedEnv =
  envModule && typeof envModule.then === "function" ? null : envModule;

const getRemoteTelemetryWsPort = () => {
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
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
  return null;
};

const buildLocalWsUrl =
  resolvedEnv && typeof resolvedEnv.buildLocalWsUrl === "function"
    ? resolvedEnv.buildLocalWsUrl
    : (port) => (port ? `ws://localhost:${port}` : null);
const getTelemetryWsPort =
  resolvedEnv && typeof resolvedEnv.getTelemetryWsPort === "function"
    ? resolvedEnv.getTelemetryWsPort
    : () => getRemoteTelemetryWsPort();

const DEFAULT_CONFIG = Object.freeze({
  // Primary mage used for magiport operations.
  mageName: "Hoodlamb",

  // Safe magiport: only accept requests from these mage names (when expecting a port).
  // Add other trusted mages here.
  trustedMages: ["Hoodlamb"],

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
    codeSlotOrName: null,
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
    priestName: null,
    // REQUIRED: passed to start_character(name, code_slot_or_name)
    codeSlotOrName: null,
    // Optional: list names in the order you'd prefer to swap OUT first.
    swapPriorityList: [],
  },

  // Event combat: basic auto-attack during joinable events.
  eventCombat: {
    enabled: true,
  },

  // No-event farming behavior (no joinable events active).
  noEventFarming: {
    enabled: true,
    crabRangerName: "camelCase",
    // Weak target thresholds (prefer burst comps / rangers).
    weakMaxHp: 900,
    weakMaxAttack: 60,
    // High reward thresholds to justify 3 farmers on one target.
    highRewardXp: 6000,
    highRewardGold: 2000,
    // Difficulty thresholds for pairing.
    highAttack: 120,
    highHp: 7000,
    longFightHp: 9000,
    lowAttack: 70,
  },

  autoParty: {
    enabled: true,
  },

  // Merchant assistance for inventory unloading.
  merchantAssist: {
    enabled: true,
    // Who should receive unpack requests from non-merchants.
    // This should be the character name of the merchant running the orchestrator.
    merchantName: "VendorGuy",

    // Farmer-side requester (runs on all non-merchants).
    requesterEnabled: true,
    // Throttle between unpack requests per character.
    requestCooldownMs: 45000,
    // Trigger when free slots <= threshold.
    inventoryFreeSlotsThreshold: 4,

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
  } catch {
    // ignore
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

  // Normalize
  cfg.trustedMages = Array.isArray(cfg.trustedMages)
    ? cfg.trustedMages.filter(Boolean)
    : [DEFAULT_CONFIG.mageName];
  if (!cfg.trustedMages.includes(cfg.mageName))
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
  cfg.noEventFarming = cfg.noEventFarming || DEFAULT_CONFIG.noEventFarming;
  cfg.autoParty = cfg.autoParty || DEFAULT_CONFIG.autoParty;
  cfg.merchantAssist = cfg.merchantAssist || DEFAULT_CONFIG.merchantAssist;
  cfg.telemetry = cfg.telemetry || DEFAULT_CONFIG.telemetry;

  // Merchant assist normalization
  cfg.merchantAssist.enabled = Boolean(cfg.merchantAssist.enabled);
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
