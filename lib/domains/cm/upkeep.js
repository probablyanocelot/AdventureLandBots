// Upkeep domain routine.
// Purpose: keep HP/MP healthy using regen and potions with MP-first prioritization.
// Inputs: `cfg` (optional), live character/game globals.
// Side effects: uses skills/items and may request potions from merchant via CM.
// Cleanup: returns disposable (`stop` / `Symbol.dispose`) that stops the upkeep loop.

const { getConfig } = await require("../../al_config.js");
const { warn } = await require("../../al_debug_log.js");
const { now } = await require("../../fn_time.js");
const { getLoc } = await require("../../fn_loc.js");
const { runPriestSupport } =
  await require("../../domains/combat/standard_combat.js");

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

const hasPriestSupport = () => {
  try {
    if (character?.ctype === "priest") return true;
  } catch {
    // ignore
  }

  try {
    const partyNames = Object.keys(parent?.party || {});
    if (!partyNames.length) return false;

    for (const name of partyNames) {
      if (!name) continue;

      try {
        const p = get_player?.(name);
        const ctype = p?.ctype || p?.type || p?.class || null;
        if (ctype === "priest") return true;
      } catch {
        // ignore
      }

      try {
        const chars = get_characters?.();
        if (Array.isArray(chars)) {
          const found = chars.find((c) => c?.name === name);
          const ctype = found?.ctype || found?.type || found?.class || null;
          if (ctype === "priest") return true;
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return false;
};

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
    if (kind === "hp") {
      const missing = character.max_hp - character.hp;
      if (missing <= 0) return false;

      const regenAmount = G?.skills?.regen_hp?.output ?? 0;
      const hpAvgMissing = avg(st.hpSamples);
      const withinRegenWindow =
        regenAmount > 0 &&
        missing <= regenAmount &&
        hpAvgMissing <= regenAmount;

      // Regen only when it can fully replace the current missing amount.
      if (withinRegenWindow) {
        if (!is_on_cooldown("regen_hp")) {
          use_skill("regen_hp");
          return true;
        }
        return false;
      }

      // Outside regen window, prefer MP upkeep; avoid HP pots when priest support exists
      // unless we're in an emergency HP range.
      const priestEmergencyRatio = Math.max(
        0.1,
        Math.min(0.9, Number(cfg?.upkeep?.priestHpPotEmergencyRatio ?? 0.45)),
      );
      const hpRatio =
        Number(character?.max_hp || 0) > 0
          ? Number(character?.hp || 0) / Number(character?.max_hp || 1)
          : 1;
      const allowHpPot = !hasPriestSupport() || hpRatio <= priestEmergencyRatio;

      if (!allowHpPot) return false;
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

      const regenAmount = G?.skills?.regen_mp?.output ?? 0;
      const mpAvgMissing = avg(st.mpSamples);
      const withinRegenWindow =
        regenAmount > 0 &&
        missing <= regenAmount &&
        mpAvgMissing <= regenAmount;

      // Regen only when it can fully replace the current missing amount.
      if (withinRegenWindow) {
        if (!is_on_cooldown("regen_mp")) {
          use_skill("regen_mp");
          return true;
        }
        return false;
      }

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

      // Don't interrupt gather channels (fishing/mining) with upkeep actions.
      if (character?.c?.fishing || character?.c?.mining) return;

      // Priests should continuously support party healing whenever possible.
      if (character?.ctype === "priest") {
        const usedPriestSupport = runPriestSupport({ cfg });
        if (usedPriestSupport) return;
      }

      if (tryComputerAutoExchange()) return;

      if (tryComputerAutoSell()) return;

      st.hpSamples.push(character.max_hp - character.hp);
      st.mpSamples.push(character.max_mp - character.mp);
      if (st.hpSamples.length > 5) st.hpSamples.shift();
      if (st.mpSamples.length > 5) st.mpSamples.shift();

      // Prefer MP upkeep actions first (especially with priest support).
      const usedMp = tryUpkeep("mp");
      if (!usedMp) {
        tryUpkeep("hp");
      }
    } catch {
      // ignore
    } finally {
      if (st.stopped) return;
      st.timer = setTimeout(loop, 250);
    }
  };

  loop();

  const stop = () => {
    st.stopped = true;
    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
  };

  return {
    stop,
    dispose: () => {
      stop();
    },
    [Symbol.dispose]: () => {
      stop();
    },
    [Symbol.asyncDispose]: async () => {
      stop();
    },
  };
};

module.exports = {
  installUpkeep,
};
