const { getConfig } = await require("./config.js");
const { sleepMs } = await require("../util/time.js");
const { warn, info } = await require("../util/logger.js");

const pickSubOut = (active, priestName, cfg) => {
  const candidates = Object.keys(active || {}).filter(
    (n) => n !== character.name && n !== priestName && active[n] !== "self",
  );

  if (!candidates.length) return null;

  const pref = cfg.priestSwap?.swapPriorityList;
  if (Array.isArray(pref) && pref.length) {
    for (const name of pref) {
      if (candidates.includes(name)) return name;
    }
  }

  return candidates[0];
};

const installPriestSwap = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastAttemptAt: 0,
    busy: false,
  };

  const loop = async () => {
    if (st.stopped || st.busy) return;

    try {
      if (!cfg.priestSwap?.enabled) return;
      const priestName = cfg.priestSwap?.priestName;
      const codeSlotOrName = cfg.priestSwap?.codeSlotOrName;
      if (!priestName || !codeSlotOrName) return;

      const active = get_active_characters();
      const priestState = active?.[priestName];

      if (
        priestState === "self" ||
        priestState === "active" ||
        priestState === "code"
      ) {
        return;
      }

      const now = Date.now();
      if (now - st.lastAttemptAt < 10000) return;
      st.lastAttemptAt = now;

      const subOut = pickSubOut(active, priestName, cfg);
      if (!subOut) {
        warn("No eligible character to swap out for priest");
        return;
      }

      st.busy = true;
      info("Swapping out", subOut, "to start priest", priestName);

      try {
        stop_character(subOut);
        await sleepMs(500);
      } catch {
        // ignore
      }

      try {
        await start_character(priestName, codeSlotOrName);
      } catch (e) {
        warn("Failed to start priest character", e);
      }
    } catch (e) {
      warn("Priest swap loop error", e);
    } finally {
      st.busy = false;
      setTimeout(loop, 2000);
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
  installPriestSwap,
};
