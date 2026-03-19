// Upkeep domain routine.
// Purpose: keep HP/MP healthy using regen and potions with MP-first prioritization.
// Inputs: `cfg` (optional), live character/game globals.
// Side effects: uses skills/items and may request potions from merchant via CM.
// Cleanup: returns disposable (`stop` / `Symbol.dispose`) that stops the upkeep loop.

const { getConfig } = await require("../../config/index.js");
const { warn } = await require("../../al_debug_log.js");
const { now, getLoc } = await require("../shared/index.js");
const { runPriestSupport } = await require("../../domains/combat/index.js");

const COMPUTER_AUTO_SELL_NAMES = new Set([
  "hpamulet",
  "hpbelt",
  "wcap",
  "wattire",
  "wbreeches",
  "wshoes",
  "wgloves",
]);

const avg = (arr) =>
  arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;

// Lower multiplier = more aggressive potion usage. 1.2 means potions trigger at 1.2x regen output.
const REGEN_BYPASS_MULTIPLIER = 1.2;
// Trigger aggressive HP healing if below this threshold
const CRITICAL_HP_THRESHOLD = 0.5;
// Trigger aggressive MP healing if below this threshold
const CRITICAL_MP_THRESHOLD = 0.4;

const installUpkeep = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    hpSamples: [],
    mpSamples: [],
    lastRequestAt: 0,
    lastExchangeAt: 0,
    lastSellAt: 0,
    timer: null,
  };

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

  const findComputerExchangeSlot = () => {
    try {
      if (locate_item("computer") < 0) return -1;
      const items = character?.items;
      if (!Array.isArray(items)) return -1;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item) continue;
        if (item.l || item.locked) continue;

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

      const hpRatio =
        character.max_hp > 0 ? character.hp / character.max_hp : 1;
      const regenAmount = G?.skills?.regen_hp?.output ?? 0;
      const hpAvgMissing = avg(st.hpSamples);
      const regenBypassed =
        regenAmount > 0 && missing > regenAmount * REGEN_BYPASS_MULTIPLIER;
      const withinRegenWindow =
        regenAmount > 0 &&
        !regenBypassed &&
        missing <= regenAmount * REGEN_BYPASS_MULTIPLIER &&
        hpAvgMissing <= regenAmount * REGEN_BYPASS_MULTIPLIER;

      // Critical HP: always use potion first
      if (hpRatio <= CRITICAL_HP_THRESHOLD) {
        if (is_on_cooldown("use_hp")) return false;
        let slot = ensurePotion("hpot1", 100);
        if (slot < 0) slot = ensurePotion("hpot0", 100);
        if (slot >= 0) {
          use(slot);
          return true;
        }
        return false;
      }

      // Regen is allowed for light/moderate deficits; bypass when missing is too large.
      if (withinRegenWindow) {
        if (!is_on_cooldown("regen_hp")) {
          use_skill("regen_hp");
          return true;
        }
        return false;
      }

      // Large deficit: use potions aggressively
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
      // Gathering channels (fishing/mining) can be interrupted by MP recovery actions.
      // Defer MP upkeep while actively channeling so merchants don't drop gathering loops.
      if (isActivelyGathering) return false;

      const missing = character.max_mp - character.mp;
      if (missing <= 0) return false;

      const mpRatio =
        character.max_mp > 0 ? character.mp / character.max_mp : 1;
      const regenAmount = G?.skills?.regen_mp?.output ?? 0;
      const mpAvgMissing = avg(st.mpSamples);
      const regenBypassed =
        regenAmount > 0 && missing > regenAmount * REGEN_BYPASS_MULTIPLIER;
      const withinRegenWindow =
        regenAmount > 0 &&
        !regenBypassed &&
        missing <= regenAmount * REGEN_BYPASS_MULTIPLIER &&
        mpAvgMissing <= regenAmount * REGEN_BYPASS_MULTIPLIER;

      // Critical MP: always use potion first
      if (mpRatio <= CRITICAL_MP_THRESHOLD) {
        if (is_on_cooldown("use_mp")) return false;
        let slot = ensurePotion("mpot1", 100);
        if (slot < 0) slot = ensurePotion("mpot0", 100);
        if (slot >= 0) {
          use(slot);
          return true;
        }
        return false;
      }

      // Regen is allowed for light/moderate deficits; bypass when missing is too large.
      if (withinRegenWindow) {
        if (!is_on_cooldown("regen_mp")) {
          use_skill("regen_mp");
          return true;
        }
        return false;
      }

      // Large deficit: use potions aggressively
      if (is_on_cooldown("use_mp")) return false;
      let slot = ensurePotion("mpot1", 100);
      if (slot < 0) slot = ensurePotion("mpot0", 100);
      if (slot >= 0) {
        use(slot);
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

      // Priests should continuously support party healing whenever possible.
      // Run this opportunistically, but don't short-circuit upkeep recovery.
      if (character?.ctype === "priest") {
        runPriestSupport({ cfg });
      }

      st.hpSamples.push(character.max_hp - character.hp);
      st.mpSamples.push(character.max_mp - character.mp);
      if (st.hpSamples.length > 5) st.hpSamples.shift();
      if (st.mpSamples.length > 5) st.mpSamples.shift();

      const hpRatio =
        Number(character?.max_hp || 0) > 0
          ? Number(character?.hp || 0) / Number(character?.max_hp || 1)
          : 1;
      const mpRatio =
        Number(character?.max_mp || 0) > 0
          ? Number(character?.mp || 0) / Number(character?.max_mp || 1)
          : 1;

      // Aggressive healing: heal BOTH if either is critical, otherwise prioritize lower ratio
      const hpCritical = hpRatio <= CRITICAL_HP_THRESHOLD;
      const mpCritical = mpRatio <= CRITICAL_MP_THRESHOLD;

      if (hpCritical || mpCritical) {
        // Emergency mode: try both heals to recover quickly
        if (hpCritical) tryUpkeep("hp");
        if (mpCritical) tryUpkeep("mp");
      } else if (hpRatio <= mpRatio) {
        // Normal mode: prioritize lower ratio, try other if first succeeds
        const usedHp = tryUpkeep("hp");
        if (!usedHp) tryUpkeep("mp");
      } else {
        const usedMp = tryUpkeep("mp");
        if (!usedMp) tryUpkeep("hp");
      }

      // Economy actions should be strictly opportunistic and never block upkeep checks.
      tryComputerAutoExchange();
      tryComputerAutoSell();
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
