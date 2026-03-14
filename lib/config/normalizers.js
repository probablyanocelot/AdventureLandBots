const { DEFAULT_CONFIG, pickHighestLevelByType } = require("./defaults.js");

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

const normalizeConfig = (cfgInput) => {
  const cfg = cfgInput;

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
    120,
    Number(cfg.magiportNearbyDistance || DEFAULT_CONFIG.magiportNearbyDistance),
  );
  cfg.magiportSkipIfNearby = Boolean(cfg.magiportSkipIfNearby);

  cfg.orchestrator = cfg.orchestrator || DEFAULT_CONFIG.orchestrator;
  cfg.mageSwap = cfg.mageSwap || DEFAULT_CONFIG.mageSwap;
  cfg.priestSwap = cfg.priestSwap || DEFAULT_CONFIG.priestSwap;
  cfg.swapRouting = cfg.swapRouting || DEFAULT_CONFIG.swapRouting;
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

  cfg.swapRouting.enabled = Boolean(cfg.swapRouting.enabled);
  cfg.swapRouting.hookName =
    typeof cfg.swapRouting.hookName === "string" &&
    cfg.swapRouting.hookName.trim()
      ? cfg.swapRouting.hookName.trim()
      : DEFAULT_CONFIG.swapRouting.hookName;
  cfg.swapRouting.serverRegion =
    typeof cfg.swapRouting.serverRegion === "string" &&
    cfg.swapRouting.serverRegion.trim()
      ? cfg.swapRouting.serverRegion.trim()
      : null;
  cfg.swapRouting.serverIdentifier =
    typeof cfg.swapRouting.serverIdentifier === "string" &&
    cfg.swapRouting.serverIdentifier.trim()
      ? cfg.swapRouting.serverIdentifier.trim()
      : null;

  const detectedRanger = pickHighestLevelByType("ranger");
  if (!cfg.noEventFarming.crabRangerName && detectedRanger)
    cfg.noEventFarming.crabRangerName = detectedRanger;
  cfg.noEventFarming.manualFarmMob =
    typeof cfg.noEventFarming.manualFarmMob === "string" &&
    cfg.noEventFarming.manualFarmMob.trim()
      ? cfg.noEventFarming.manualFarmMob.trim().toLowerCase()
      : null;
  cfg.noEventFarming.manualFarmMobSelf =
    typeof cfg.noEventFarming.manualFarmMobSelf === "string" &&
    cfg.noEventFarming.manualFarmMobSelf.trim()
      ? cfg.noEventFarming.manualFarmMobSelf.trim().toLowerCase()
      : null;
  cfg.noEventFarming.crabHoldSelf =
    cfg.noEventFarming.crabHoldSelf == null
      ? null
      : Boolean(cfg.noEventFarming.crabHoldSelf);

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

  const chainNpcMage = cfg.noEventFarming.aggroLockChain.npcMageName || null;
  const chainHuntMage = cfg.noEventFarming.aggroLockChain.huntMageName || null;
  const trustSet = new Set(
    (Array.isArray(cfg.trustedMages) ? cfg.trustedMages : [])
      .filter(Boolean)
      .map((n) => String(n).trim().toLowerCase()),
  );
  for (const mageName of [cfg.mageName, chainNpcMage, chainHuntMage]) {
    if (!mageName) continue;
    trustSet.add(String(mageName).trim().toLowerCase());
  }
  cfg.trustedMages = Array.from(trustSet);

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

  cfg.telemetry.enabled = cfg.telemetry.enabled !== false;
  cfg.telemetry.intervalMs = Math.max(
    500,
    Number(cfg.telemetry.intervalMs || DEFAULT_CONFIG.telemetry.intervalMs),
  );
  cfg.telemetry.wsUrl = cfg.telemetry.wsUrl || DEFAULT_CONFIG.telemetry.wsUrl;

  return cfg;
};

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
  deepMerge,
  normalizeConfig,
  getRuntimeContext,
};
