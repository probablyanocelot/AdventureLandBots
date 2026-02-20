const { getConfig } = await require("./al_config.js");
const { sleepMs } = await require("./fn_time.js");
const { warn, info } = await require("./al_debug_log.js");
const { getActiveNames } = await require("./group_party.js");
const { waitForCm } = await require("./event_listeners.js");

const getActiveStateMap = () => {
  try {
    const active = get_active_characters();
    return active && typeof active === "object" ? active : {};
  } catch {
    return {};
  }
};

const isRunningState = (state) =>
  state === "self" ||
  state === "active" ||
  state === "code" ||
  state === "starting" ||
  state === "loading";

const pickSubOut = (activeState, activeNames, priestName, cfg) => {
  const stateCandidates = Object.keys(activeState || {}).filter(
    (n) =>
      n !== character.name &&
      n !== priestName &&
      activeState[n] !== "self" &&
      activeState[n] !== "starting" &&
      activeState[n] !== "loading",
  );

  const onlineCandidates = (
    Array.isArray(activeNames) ? activeNames : []
  ).filter((n) => n !== character.name && n !== priestName);

  const candidates = stateCandidates.length
    ? stateCandidates
    : onlineCandidates;

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
      if (
        !priestName ||
        codeSlotOrName === undefined ||
        codeSlotOrName === null ||
        codeSlotOrName === ""
      )
        return;

      const activeNames = getActiveNames();
      const activeState = getActiveStateMap();
      const priestState = activeState?.[priestName];
      const priestOnline =
        Array.isArray(activeNames) && activeNames.includes(priestName);

      if (isRunningState(priestState) || priestOnline) {
        return;
      }

      const now = Date.now();
      if (now - st.lastAttemptAt < 10000) return;
      st.lastAttemptAt = now;

      const subOut = pickSubOut(activeState, activeNames, priestName, cfg);
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
        return;
      }

      // Wait for priest to come online and (ideally) signal code loaded.
      const start = Date.now();
      while (Date.now() - start < 30000) {
        try {
          const namesNow = getActiveNames();
          const stateNow = getActiveStateMap();
          const onlineNow =
            Array.isArray(namesNow) && namesNow.includes(priestName);

          if (onlineNow || isRunningState(stateNow?.[priestName])) {
            const remainingMs = Math.max(250, 30000 - (Date.now() - start));
            const ack = await waitForCm({
              from: priestName,
              cmd: "bot:code_loaded",
              timeoutMs: Math.min(1500, remainingMs),
            });

            if (ack || isRunningState(getActiveStateMap()?.[priestName])) break;
          }
        } catch {
          // ignore
        }

        await sleepMs(500);
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
