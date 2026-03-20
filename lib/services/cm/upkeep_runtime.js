// Upkeep service routine.
// Purpose: keep HP/MP healthy using regen and potions with MP-first prioritization.

const { getConfig } = await require("../../config/index.js");
const { warn } = await require("../../al_debug_log.js");
const { runPriestSupport } = await require("../combat/index.js");
const { createItemUpgradeService } = await require("./item_upgrade_runtime.js");

const COMPUTER_AUTO_SELL_NAMES = new Set([
  "hpamulet",
  "hpbelt",
  "wcap",
  "wattire",
  "wbreeches",
  "wshoes",
  "wgloves",
]);
const DEFAULT_COMPOUNDABLE_EXCHANGE_EXCLUDES = Object.freeze(["lostearring"]);

const REGEN_BYPASS_MULTIPLIER = 1.75;
const HP_EMERGENCY_PRIORITY_RATIO = 0.2;
const GATHERING_MP_RECOVERY_RATIO = 0.6;

const now = () => Date.now();
const getLoc = () => ({
  map: character?.map,
  x: Number(character?.x || 0),
  y: Number(character?.y || 0),
});

const installUpkeep = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const upkeepCfg = cfg?.upkeep || {};
  const exchangeCfg =
    upkeepCfg.exchange && typeof upkeepCfg.exchange === "object"
      ? upkeepCfg.exchange
      : {};
  const allowCompoundableExchange = Boolean(exchangeCfg.allowCompoundableItems);
  const excludedExchangeItemNames = new Set(
    (Array.isArray(exchangeCfg.excludeItemNames)
      ? exchangeCfg.excludeItemNames
      : DEFAULT_COMPOUNDABLE_EXCHANGE_EXCLUDES
    )
      .map((name) => (typeof name === "string" ? name.trim() : ""))
      .filter(Boolean),
  );

  const st = {
    stopped: false,
    lastRequestAt: 0,
    lastExchangeAt: 0,
    lastSellAt: 0,
    timer: null,
  };
  const itemUpgrade = createItemUpgradeService({ cfg });

  const merchantName = cfg?.merchantAssist?.merchantName || null;

  const requestMerchantPots = ({ hpQty = 0, mpQty = 0 } = {}) => {
    if (!cfg?.merchantAssist?.enabled) return;
    if (!merchantName) return;

    const nowMs = now();
    if (nowMs - st.lastRequestAt < 30000) return;
    st.lastRequestAt = nowMs;

    try {
      send_cm(merchantName, {
        cmd: "unpack:request",
        requestId: `pots:${nowMs}:${Math.random().toString(16).slice(2)}`,
        reason: "pots",
        loc: getLoc(),
        pots: {
          h: { type: "hpot1", qty: hpQty },
          m: { type: "mpot1", qty: mpQty },
        },
        at: nowMs,
      });
    } catch (e) {
      warn("Failed to request merchant potions", e);
    }
  };

  const ensurePotion = (name, qty) => {
    const slot = locate_item(name);
    if (slot >= 0) return slot;

    if (locate_item("computer") >= 0) {
      try {
        buy(name, qty);
      } catch (e) {
        warn("Failed to buy potion", name, e);
      }
      return -1;
    }

    if (name === "hpot1") requestMerchantPots({ hpQty: qty, mpQty: 0 });
    if (name === "mpot1") requestMerchantPots({ hpQty: 0, mpQty: qty });
    return -1;
  };

  const findComputerSellSlot = () => {
    try {
      if (locate_item("computer") < 0) return -1;
      const items = character?.items;
      if (!Array.isArray(items)) return -1;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.l || item.locked) continue;
        if (!COMPUTER_AUTO_SELL_NAMES.has(item.name)) continue;
        if (item.level > 0) continue;
        return i;
      }
    } catch {
      // ignore
    }

    return -1;
  };

  const getExchangeRequirement = (item) => {
    if (!item) return 0;
    const fromItem = Number(item.e || 0);
    if (Number.isFinite(fromItem) && fromItem > 0) return fromItem;

    try {
      const fromG = Number(G?.items?.[item.name]?.e || 0);
      return Number.isFinite(fromG) && fromG > 0 ? fromG : 0;
    } catch {
      return 0;
    }
  };

  const isCompoundableItem = (itemName) => {
    if (!itemName) return false;
    try {
      return Boolean(G?.items?.[itemName]?.compound);
    } catch {
      return false;
    }
  };

  const isExchangeEligible = (item) => {
    if (!item?.name) return false;
    if (excludedExchangeItemNames.has(item.name)) return false;
    if (!allowCompoundableExchange && isCompoundableItem(item.name)) {
      return false;
    }
    return true;
  };

  const findComputerExchangeSlot = () => {
    try {
      if (locate_item("computer") < 0) return -1;
      const items = character?.items;
      if (!Array.isArray(items)) return -1;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.l || item.locked) continue;
        if (!isExchangeEligible(item)) continue;

        const requiredQty = getExchangeRequirement(item);
        if (requiredQty <= 0) continue;

        const qty = Number(item.q || 1);
        if (!Number.isFinite(qty) || qty < requiredQty) continue;

        return i;
      }
    } catch {
      // ignore
    }

    return -1;
  };

  const tryComputerAutoExchange = () => {
    const nowMs = now();
    if (nowMs - st.lastExchangeAt < 1000) return false;

    const slot = findComputerExchangeSlot();
    if (slot < 0) return false;

    try {
      exchange(slot);
      st.lastExchangeAt = nowMs;
      return true;
    } catch (e) {
      warn("Failed to auto-exchange item with computer", e);
    }

    return false;
  };

  const tryComputerAutoSell = () => {
    const nowMs = now();
    if (nowMs - st.lastSellAt < 750) return false;

    const slot = findComputerSellSlot();
    if (slot < 0) return false;

    const item = character?.items?.[slot];
    if (!item) return false;

    const qty = item.q ? item.q : 1;

    try {
      sell(slot, qty);
      st.lastSellAt = nowMs;
      return true;
    } catch (e) {
      warn("Failed to auto-sell item with computer", item.name, e);
    }

    return false;
  };

  const tryUpkeep = (kind) => {
    const isActivelyGathering = Boolean(
      character?.c?.fishing || character?.c?.mining,
    );

    if (kind === "hp") {
      const missing = character.max_hp - character.hp;
      if (missing <= 0) return false;

      const regenAmount = G?.skills?.regen_hp?.output ?? 0;
      const regenThreshold = regenAmount * REGEN_BYPASS_MULTIPLIER;
      const shouldPreferRegen = regenAmount > 0 && missing <= regenThreshold;

      if (shouldPreferRegen) {
        if (!is_on_cooldown("regen_hp")) {
          use_skill("regen_hp");
          return true;
        }
      }

      if (is_on_cooldown("use_hp")) return false;
      let slot = ensurePotion("hpot1", 100);
      if (slot < 0) slot = ensurePotion("hpot0", 100);
      if (slot >= 0) {
        use(slot);
        return true;
      }
      return false;
    }

    if (kind === "mp") {
      const missing = character.max_mp - character.mp;
      if (missing <= 0) return false;

      const mpRatio =
        Number(character?.max_mp || 0) > 0
          ? Number(character?.mp || 0) / Number(character?.max_mp || 1)
          : 1;
      const regenAmount = G?.skills?.regen_mp?.output ?? 0;
      const regenThreshold = regenAmount * REGEN_BYPASS_MULTIPLIER;
      const shouldPreferRegen = regenAmount > 0 && missing <= regenThreshold;
      const canInterruptGatheringForMp =
        !isActivelyGathering || mpRatio <= GATHERING_MP_RECOVERY_RATIO;

      if (!canInterruptGatheringForMp) return false;

      if (shouldPreferRegen) {
        if (!is_on_cooldown("regen_mp")) {
          use_skill("regen_mp");
          return true;
        }
      }

      if (is_on_cooldown("use_mp")) return false;
      let slot = ensurePotion("mpot1", 100);
      if (slot < 0) slot = ensurePotion("mpot0", 100);
      if (slot >= 0) {
        use(slot);
        return true;
      }

      if (!is_on_cooldown("regen_mp")) {
        use_skill("regen_mp");
        return true;
      }
      return false;
    }

    return false;
  };

  const loop = () => {
    if (st.stopped) return;

    try {
      if (character?.rip) return;

      if (character?.ctype === "priest") {
        runPriestSupport({ cfg });
      }

      const hpRatio =
        Number(character?.max_hp || 0) > 0
          ? Number(character?.hp || 0) / Number(character?.max_hp || 1)
          : 1;
      const hpEmergency = hpRatio <= HP_EMERGENCY_PRIORITY_RATIO;

      if (hpEmergency) {
        const usedHp = tryUpkeep("hp");
        if (!usedHp) tryUpkeep("mp");
      } else {
        const usedMp = tryUpkeep("mp");
        if (!usedMp) tryUpkeep("hp");
      }

      tryComputerAutoExchange();
      tryComputerAutoSell();
      itemUpgrade.tryAutoUpgrade();
    } catch {
      // ignore
    } finally {
      if (st.stopped) return;
      st.timer = setTimeout(loop, 250);
    }
  };

  loop();

  const stopRoutine = () => {
    st.stopped = true;

    try {
      itemUpgrade.stopRoutine?.();
    } catch {
      // ignore
    }

    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  return {
    stopRoutine,
    dispose: () => {
      stopRoutine();
    },
    [Symbol.dispose]: () => {
      stopRoutine();
    },
    [Symbol.asyncDispose]: async () => {
      stopRoutine();
    },
  };
};

module.exports = {
  installUpkeep,
};
