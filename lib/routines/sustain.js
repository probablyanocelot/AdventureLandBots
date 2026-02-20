// Sustain routine: use regen skills or potions based on missing HP/MP.

const { getConfig } = await require("../config.js");
const { warn } = await require("../util/logger.js");

const avg = (arr) =>
  arr.length ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0;

const nowMs = () => Date.now();

const getLoc = () => ({ map: character.map, x: character.x, y: character.y });

const installSustain = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    hpSamples: [],
    mpSamples: [],
    lastRequestAt: 0,
  };

  const merchantName = cfg?.merchantAssist?.merchantName || null;

  const requestMerchantPots = ({ hpQty = 0, mpQty = 0 } = {}) => {
    if (!cfg?.merchantAssist?.enabled) return;
    if (!merchantName) return;

    const now = nowMs();
    if (now - st.lastRequestAt < 30000) return;
    st.lastRequestAt = now;

    try {
      send_cm(merchantName, {
        cmd: "unpack:request",
        requestId: `pots:${now}:${Math.random().toString(16).slice(2)}`,
        reason: "pots",
        loc: getLoc(),
        pots: {
          h: { type: "hpot1", qty: hpQty },
          m: { type: "mpot1", qty: mpQty },
        },
        at: now,
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

  const trySustain = (kind) => {
    if (kind === "hp") {
      const missing = character.max_hp - character.hp;
      if (missing <= 0) return;

      const regenAmount = G?.skills?.regen_hp?.output ?? 0;

      // Always try to regen first if available.
      if (!is_on_cooldown("regen_hp")) use_skill("regen_hp");

      // If we're still meaningfully missing HP, use a potion.
      const needsPot = missing > regenAmount || avg(st.hpSamples) > regenAmount;

      if (!needsPot) return;
      if (is_on_cooldown("use_hp")) return;
      const slot = ensurePotion("hpot1", 100);
      if (slot < 0) slot = ensurePotion("hpot0", 100);
      if (slot >= 0) use(slot);
      return;
    }

    if (kind === "mp") {
      const missing = character.max_mp - character.mp;
      if (missing <= 0) return;

      const regenAmount = G?.skills?.regen_mp?.output ?? 0;

      // Always try to regen first if available.
      if (!is_on_cooldown("regen_mp")) use_skill("regen_mp");

      // If we're still meaningfully missing MP, use a potion.
      const needsPot = missing > regenAmount || avg(st.mpSamples) > regenAmount;

      if (!needsPot) return;
      if (is_on_cooldown("use_mp")) return;
      const slot = ensurePotion("mpot1", 100);
      if (slot < 0) slot = ensurePotion("mpot0", 100);
      if (slot >= 0) use(slot);
      return;
    }
  };

  const loop = () => {
    if (st.stopped) return;

    try {
      if (character?.rip) return;

      st.hpSamples.push(character.max_hp - character.hp);
      st.mpSamples.push(character.max_mp - character.mp);
      if (st.hpSamples.length > 5) st.hpSamples.shift();
      if (st.mpSamples.length > 5) st.mpSamples.shift();

      trySustain("hp");
      trySustain("mp");
    } catch {
      // ignore
    } finally {
      setTimeout(loop, 250);
    }
  };

  loop();

  return {
    stop: () => {
      st.stopped = true;
    },
  };
};

module.exports = {
  installSustain,
};
