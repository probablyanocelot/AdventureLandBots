const { logCatch } = await require("../al_debug_log.js");
const { deepMerge } = await require("./normalizers.js");

const normalizeOptionalMonsterName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const normalizeOptionalIntervalMs = (value, { min = 50, max = 60000 } = {}) => {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
};

const installWindowFarmHelpers = () => {
  try {
    if (typeof window === "undefined") return;
    if (window.__AL_BOTS_FARM_HELPERS_INSTALLED__) return;

    const setAlias = (key, value) => {
      try {
        window[key] = value == null ? null : value;
      } catch {
        // ignore
      }
      return window[key];
    };

    const setConfigFarmingValue = (key, value) => {
      try {
        const base =
          window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
            ? window.AL_BOTS_CONFIG
            : {};
        const farming =
          base.farming && typeof base.farming === "object" ? base.farming : {};
        window.AL_BOTS_CONFIG = {
          ...base,
          farming: {
            ...farming,
            [key]: value,
          },
          noEventFarming: {
            ...(base.noEventFarming && typeof base.noEventFarming === "object"
              ? base.noEventFarming
              : {}),
            [key]: value,
          },
        };
      } catch {
        // ignore
      }
    };

    const setConfigNoEventValue = (key, value) => {
      setConfigFarmingValue(key, value);
    };

    const setConfigEventCombatValue = (key, value) => {
      try {
        const base =
          window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
            ? window.AL_BOTS_CONFIG
            : {};
        const ec =
          base.eventCombat && typeof base.eventCombat === "object"
            ? base.eventCombat
            : {};
        window.AL_BOTS_CONFIG = {
          ...base,
          eventCombat: {
            ...ec,
            [key]: value,
          },
        };
      } catch {
        // ignore
      }
    };

    const setConfigMerchantAssistValue = (key, value) => {
      try {
        const base =
          window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
            ? window.AL_BOTS_CONFIG
            : {};
        const ma =
          base.merchantAssist && typeof base.merchantAssist === "object"
            ? base.merchantAssist
            : {};
        window.AL_BOTS_CONFIG = {
          ...base,
          merchantAssist: {
            ...ma,
            [key]: value,
          },
        };
      } catch {
        // ignore
      }
    };

    window.farm = (monster) => {
      const next = normalizeOptionalMonsterName(monster);
      setConfigNoEventValue("manualFarmMob", next);
      return setAlias("weFarm", next);
    };

    window.farmMe = (monster) => {
      const next = normalizeOptionalMonsterName(monster);
      setConfigNoEventValue("manualFarmMobSelf", next);
      return setAlias("iFarm", next);
    };

    window.clearFarm = () => {
      setConfigNoEventValue("manualFarmMob", null);
      setConfigNoEventValue("manualFarmMobSelf", null);
      setAlias("weFarm", null);
      setAlias("iFarm", null);
      return { weFarm: null, iFarm: null };
    };

    const setCrabHoldSelf = (enabled) => {
      const next = enabled == null ? null : Boolean(enabled);
      setConfigNoEventValue("crabHoldSelf", next);
      try {
        window.iCrabHold = next;
      } catch {
        // ignore
      }
      return next;
    };

    const sendCrabHoldCm = (name, enabled) => {
      if (!name || typeof send_cm !== "function") return false;
      try {
        send_cm(name, {
          cmd: "farm:crab_hold",
          name,
          enabled: Boolean(enabled),
        });
        return true;
      } catch {
        return false;
      }
    };

    window.holdCrab = (name = character?.name) => {
      const target =
        typeof name === "string" && name.trim() ? name.trim() : character?.name;
      if (!target || target === character?.name) return setCrabHoldSelf(true);
      return sendCrabHoldCm(target, true);
    };

    window.releaseCrab = (name = character?.name) => {
      const target =
        typeof name === "string" && name.trim() ? name.trim() : character?.name;
      if (!target || target === character?.name) return setCrabHoldSelf(false);
      return sendCrabHoldCm(target, false);
    };

    window.setAttackInterval = (ms) => {
      const next = normalizeOptionalIntervalMs(ms, { min: 80, max: 5000 });
      setConfigEventCombatValue("attackIntervalMs", next);
      return next;
    };
    window.attackInterval = window.setAttackInterval;

    window.clearAttackInterval = () => {
      setConfigEventCombatValue("attackIntervalMs", null);
      return null;
    };

    window.setUnpackInterval = (ms) => {
      const next = normalizeOptionalIntervalMs(ms, { min: 100, max: 10000 });
      if (next == null) {
        setConfigMerchantAssistValue("unpackCheckIntervalMs", null);
        setConfigMerchantAssistValue("unpackSendIntervalMs", null);
        return null;
      }

      setConfigMerchantAssistValue(
        "unpackCheckIntervalMs",
        Math.max(250, next),
      );
      setConfigMerchantAssistValue(
        "unpackSendIntervalMs",
        Math.max(100, Math.min(1500, Math.round(next / 2))),
      );
      return {
        unpackCheckIntervalMs: Math.max(250, next),
        unpackSendIntervalMs: Math.max(
          100,
          Math.min(1500, Math.round(next / 2)),
        ),
      };
    };
    window.unpackInterval = window.setUnpackInterval;

    window.__AL_BOTS_FARM_HELPERS_INSTALLED__ = true;
  } catch {
    // ignore
  }
};

const getUserConfig = () => {
  try {
    installWindowFarmHelpers();

    const readWindowAlias = (key, { includeAncestors = false } = {}) => {
      if (typeof window === "undefined")
        return { found: false, value: undefined };

      const targets = [window];
      if (includeAncestors) {
        try {
          if (window.parent && window.parent !== window)
            targets.push(window.parent);
        } catch {
          // ignore
        }
        try {
          if (window.top && !targets.includes(window.top))
            targets.push(window.top);
        } catch {
          // ignore
        }
      }

      for (const target of targets) {
        try {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            return { found: true, value: target[key] };
          }
        } catch {
          // ignore
        }
      }

      return { found: false, value: undefined };
    };

    const aliasCfg = {};
    const blanketFarmAlias = readWindowAlias("weFarm", {
      includeAncestors: true,
    });
    const selfFarmAlias = readWindowAlias("iFarm");
    const selfCrabHoldAlias = readWindowAlias("iCrabHold");

    if (
      blanketFarmAlias.found ||
      selfFarmAlias.found ||
      selfCrabHoldAlias.found
    ) {
      aliasCfg.noEventFarming = {};
      if (blanketFarmAlias.found) {
        aliasCfg.noEventFarming.manualFarmMob = blanketFarmAlias.value;
      }
      if (selfFarmAlias.found) {
        aliasCfg.noEventFarming.manualFarmMobSelf = selfFarmAlias.value;
      }
      if (selfCrabHoldAlias.found) {
        aliasCfg.noEventFarming.crabHoldSelf = selfCrabHoldAlias.value;
      }
    }

    if (typeof window !== "undefined" && window.AL_BOTS_CONFIG) {
      const cfg = window.AL_BOTS_CONFIG;
      if (cfg && typeof cfg === "object") return deepMerge(cfg, aliasCfg);
    }

    if (aliasCfg.noEventFarming) return aliasCfg;
  } catch (e) {
    logCatch("getUserConfig failed", e);
  }
  return null;
};

module.exports = {
  getUserConfig,
};
