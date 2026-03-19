// Party service-native priest-swap runtime.
// Purpose: ensure required characters (priest/etc.) are running, swapping slots when needed.

const { getConfig } = await require("../../config/index.js");
const { warn, info } = await require("../../al_debug_log.js");
const { getActiveNames } = await require("./auto_party_runtime.js");

const sleepMs = (ms) =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));
const now = () => Date.now();

const onCharacter = (event, handler) => {
  try {
    if (!event || typeof handler !== "function") return () => {};
    if (!character || typeof character.on !== "function") return () => {};
    character.on(event, handler);
    if (typeof character.off === "function") {
      return () => {
        try {
          character.off(event, handler);
        } catch {
          // ignore
        }
      };
    }
    return () => {};
  } catch {
    return () => {};
  }
};

const waitForCharacterEvent = ({ event, predicate, timeoutMs = 2000 } = {}) =>
  new Promise((resolve) => {
    let done = false;
    const finish = (val) => {
      if (done) return;
      done = true;
      try {
        off();
      } catch {
        // ignore
      }
      resolve(val);
    };

    const handler = (...args) => {
      try {
        if (predicate && !predicate(...args)) return;
        finish(args.length <= 1 ? args[0] : args);
      } catch {
        // ignore
      }
    };

    const off = onCharacter(event, handler);
    setTimeout(() => finish(null), Math.max(1, timeoutMs));
  });

const waitForCm = ({ from, cmd, predicate, timeoutMs = 2000 } = {}) =>
  waitForCharacterEvent({
    event: "cm",
    timeoutMs,
    predicate: (m) => {
      if (!m || !m.name || !m.message) return false;
      if (from && m.name !== from) return false;
      if (cmd && m.message.cmd !== cmd) return false;
      if (predicate && !predicate(m)) return false;
      return true;
    },
  });

const getActiveStateMap = () => {
  try {
    const out = {};
    const activeNames = getActiveNames();
    for (const name of activeNames || []) out[name] = "active";
    if (character?.name) out[character.name] = "self";
    return out;
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

const normalizeCharacterName = (value) => {
  const normalized = normalizeOptionalString(value);
  return normalized ? normalized.toLowerCase() : null;
};

const namesMatch = (a, b) => {
  const normalizedA = normalizeCharacterName(a);
  const normalizedB = normalizeCharacterName(b);
  return Boolean(normalizedA && normalizedB && normalizedA === normalizedB);
};

const getLocalActiveStateMap = () => {
  const fallback = {};
  try {
    if (character?.name) fallback[character.name] = "self";
  } catch {
    // ignore
  }

  try {
    if (typeof get_active_characters !== "function") return fallback;
    const active = get_active_characters();
    if (!active || typeof active !== "object") return fallback;
    return active;
  } catch {
    return fallback;
  }
};

const getLocalActiveNames = () => {
  try {
    return Object.entries(getLocalActiveStateMap())
      .filter(([, state]) => isRunningState(state))
      .map(([name]) => name)
      .filter(Boolean);
  } catch {
    return character?.name ? [character.name] : [];
  }
};

const buildCharacterDescriptor = (entry = {}, fallbackName = null) => {
  const name = normalizeOptionalString(entry?.name || fallbackName);
  if (!name) return null;

  const ctype = normalizeOptionalString(
    entry?.ctype || entry?.type || entry?.class || getCharacterTypeByName(name),
  );
  return {
    name,
    ctype,
    online: Number(entry?.online || 0),
    isMerchant: ctype === "merchant",
    isFarmer: Boolean(ctype && ctype !== "merchant"),
  };
};

const getAccountOnlineCharacters = () => {
  const byName = new Map();
  const upsert = (entry, fallbackName = null) => {
    const descriptor = buildCharacterDescriptor(entry, fallbackName);
    if (!descriptor?.name) return;
    const key = normalizeCharacterName(descriptor.name);
    if (!key) return;

    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, descriptor);
      return;
    }

    byName.set(key, {
      ...existing,
      ...descriptor,
      name: existing.name || descriptor.name,
      ctype: existing.ctype || descriptor.ctype,
      online: Math.max(
        Number(existing.online || 0),
        Number(descriptor.online || 0),
      ),
      isMerchant:
        Boolean(existing.isMerchant) || Boolean(descriptor.isMerchant),
      isFarmer: Boolean(existing.isFarmer) || Boolean(descriptor.isFarmer),
    });
  };

  try {
    const chars = get_characters();
    if (Array.isArray(chars)) {
      for (const entry of chars) {
        if (!entry?.name || Number(entry?.online || 0) <= 0) continue;
        upsert(entry, entry.name);
      }
    }
  } catch {
    // ignore
  }

  try {
    const localStateMap = getLocalActiveStateMap();
    for (const [name, state] of Object.entries(localStateMap)) {
      if (!isRunningState(state)) continue;
      upsert({ name, online: 1 }, name);
    }
  } catch {
    // ignore
  }

  try {
    if (character?.name) {
      upsert(
        {
          name: character.name,
          ctype: character.ctype,
          online: 1,
        },
        character.name,
      );
    }
  } catch {
    // ignore
  }

  return Array.from(byName.values());
};

const getLocalActiveCharacters = () => {
  try {
    return getLocalActiveNames()
      .map((name) => buildCharacterDescriptor({ name }, name))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const pickSubOut = ({
  activeCharacters,
  activeNames,
  selfName,
  targetName,
  targetCtype,
  swapPriorityList,
  excludeSubOutNames,
} = {}) => {
  const excluded = new Set(
    (Array.isArray(excludeSubOutNames) ? excludeSubOutNames : []).filter(
      Boolean,
    ),
  );
  const onlineCandidates = (
    Array.isArray(activeNames) ? activeNames : []
  ).filter((n) => n !== selfName && n !== targetName && !excluded.has(n));

  const byName = new Map(
    (Array.isArray(activeCharacters) ? activeCharacters : []).map((c) => [
      c.name,
      c,
    ]),
  );

  const targetIsMerchant = targetCtype === "merchant";

  const preferred = onlineCandidates.filter((name) => {
    const c = byName.get(name);
    if (!c) return false;
    if (targetIsMerchant) return c.isMerchant;
    return c.isFarmer;
  });

  const candidates = preferred.length ? preferred : onlineCandidates;
  if (!candidates.length) return null;

  const pref = Array.isArray(swapPriorityList) ? swapPriorityList : [];
  if (pref.length) {
    for (const name of pref) {
      if (candidates.includes(name)) return name;
    }
  }

  return candidates[0];
};

const waitForCharacterReady = async ({
  name,
  timeoutMs = 30000,
  readyCmd = "bot:code_loaded",
} = {}) => {
  if (!name) return false;

  const start = now();
  let probeSeq = 0;
  while (now() - start < timeoutMs) {
    try {
      const activeNames = getActiveNames();
      const onlineNow =
        Array.isArray(activeNames) && activeNames.includes(name);

      if (onlineNow) {
        const remainingMs = Math.max(250, timeoutMs - (now() - start));
        const probeTaskId = `ready:${name}:${Date.now()}:${probeSeq++}`;

        try {
          send_cm(name, {
            cmd: "bot:ping",
            taskId: probeTaskId,
          });
        } catch {
          // ignore and continue waiting
        }

        const pong = await waitForCm({
          from: name,
          cmd: "bot:pong",
          predicate: (m) => m?.message?.taskId === probeTaskId,
          timeoutMs: Math.min(1200, remainingMs),
        });
        if (pong) return true;

        const loaded = await waitForCm({
          from: name,
          cmd: readyCmd,
          timeoutMs: Math.min(400, remainingMs),
        });
        if (loaded) return true;
      }
    } catch {
      // ignore
    }

    await sleepMs(500);
  }

  return false;
};

const getCharacterTypeByName = (name) => {
  try {
    const chars = get_characters();
    if (!Array.isArray(chars)) return null;
    const found = chars.find((c) => c?.name === name);
    return found?.type || found?.ctype || found?.class || null;
  } catch {
    return null;
  }
};

const normalizeOptionalString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const findSatisfiedCharacter = ({
  activeCharacters,
  activeNames,
  targetName,
  satisfiedByName,
  satisfiedByCtype,
} = {}) => {
  const namesToMatch = new Set(
    [targetName, satisfiedByName].map(normalizeOptionalString).filter(Boolean),
  );
  const ctypeToMatch = normalizeOptionalString(satisfiedByCtype);
  const activeList = Array.isArray(activeCharacters) ? activeCharacters : [];

  for (const entry of activeList) {
    const name = normalizeOptionalString(entry?.name);
    const ctype = normalizeOptionalString(entry?.ctype);
    if (
      name &&
      Array.from(namesToMatch).some((candidate) => namesMatch(name, candidate))
    ) {
      return { name, ctype, match: "name" };
    }
    if (
      ctypeToMatch &&
      normalizeCharacterName(ctype) === normalizeCharacterName(ctypeToMatch)
    ) {
      return { name, ctype, match: "ctype" };
    }
  }

  const activeNameList = (Array.isArray(activeNames) ? activeNames : [])
    .map(normalizeOptionalString)
    .filter(Boolean);
  for (const name of namesToMatch) {
    if (activeNameList.some((activeName) => namesMatch(activeName, name))) {
      return { name, ctype: null, match: "name" };
    }
  }

  return null;
};

const getSwapRoutingConfig = () => {
  try {
    return getConfig()?.swapRouting || null;
  } catch {
    return null;
  }
};

const buildCharacterRouteFallback = ({
  targetName,
  serverRegion,
  serverIdentifier,
} = {}) => {
  const resolvedTarget = normalizeOptionalString(targetName);
  const resolvedRegion =
    normalizeOptionalString(serverRegion) ||
    normalizeOptionalString(server?.region);
  const resolvedIdentifier =
    normalizeOptionalString(serverIdentifier) ||
    normalizeOptionalString(server?.id);

  if (!resolvedTarget || !resolvedRegion || !resolvedIdentifier) return null;

  return {
    targetName: resolvedTarget,
    currentCharacterName: normalizeOptionalString(character?.name),
    serverRegion: resolvedRegion,
    serverIdentifier: resolvedIdentifier,
    href: `/character/${encodeURIComponent(resolvedTarget)}/in/${encodeURIComponent(
      resolvedRegion,
    )}/${encodeURIComponent(resolvedIdentifier)}/`,
  };
};

const requestCharacterRouteFallback = ({
  targetName,
  label,
  reason,
  subOut,
} = {}) => {
  const routing = getSwapRoutingConfig();
  const route = buildCharacterRouteFallback({
    targetName,
    serverRegion: routing?.serverRegion,
    serverIdentifier: routing?.serverIdentifier,
  });
  const enabled = routing?.enabled === true;
  const hookName = normalizeOptionalString(routing?.hookName);
  const hook = hookName ? globalThis?.[hookName] : null;

  if (enabled && typeof hook === "function" && route) {
    try {
      const hookResult = hook({
        label,
        reason,
        subOut: normalizeOptionalString(subOut),
        route,
        targetName: normalizeOptionalString(targetName),
      });
      return {
        requested: true,
        handled: true,
        hookName,
        route,
        hookResult,
      };
    } catch (e) {
      warn("Swap routing hook failed", e);
      return {
        requested: true,
        handled: false,
        hookName,
        route,
        error: e,
      };
    }
  }

  if (enabled && route) {
    info("Swap routing available but not yet handled", {
      label,
      reason,
      targetName,
      hookName,
      route,
    });
  }

  return {
    requested: enabled,
    handled: false,
    hookName,
    route,
  };
};

const ensureCharacterRunningBySwap = async ({
  targetName,
  codeSlotOrName,
  swapPriorityList = [],
  excludeSubOutNames = [],
  label = "character",
  timeoutMs = 30000,
  skipStartIfSatisfied = false,
  satisfiedByName = null,
  satisfiedByCtype = null,
} = {}) => {
  if (!targetName) return { ok: false, reason: "missing-target" };
  if (
    codeSlotOrName === undefined ||
    codeSlotOrName === null ||
    codeSlotOrName === ""
  ) {
    return { ok: false, reason: "missing-code-slot" };
  }

  const localActiveNames = getLocalActiveNames();
  const localActiveCharacters = getLocalActiveCharacters();
  const accountOnlineCharacters = getAccountOnlineCharacters();
  const accountOnlineNames = accountOnlineCharacters.map((c) => c.name);
  const activeCounts = {
    merchant: accountOnlineCharacters.filter((c) => c.isMerchant).length,
    farmer: accountOnlineCharacters.filter((c) => c.isFarmer).length,
    total: accountOnlineCharacters.length,
  };
  const alreadyOnline = findSatisfiedCharacter({
    activeCharacters: accountOnlineCharacters,
    activeNames: accountOnlineNames,
    targetName,
    satisfiedByName: targetName,
  });
  const targetCtype = getCharacterTypeByName(targetName);

  if (alreadyOnline) {
    return {
      ok: true,
      alreadyRunning: true,
      ready: true,
      runningAs: alreadyOnline.name || targetName,
      runningMatch: alreadyOnline.match,
    };
  }

  const targetIsMerchant = targetCtype === "merchant";
  const merchantSlotsFull = activeCounts.merchant >= 1;
  const farmerSlotsFull = activeCounts.farmer >= 3;
  const shouldSwap = targetIsMerchant ? merchantSlotsFull : farmerSlotsFull;
  const satisfiedBy =
    skipStartIfSatisfied && shouldSwap
      ? findSatisfiedCharacter({
          activeCharacters: accountOnlineCharacters,
          activeNames: accountOnlineNames,
          targetName,
          satisfiedByName,
          satisfiedByCtype,
        })
      : null;

  if (satisfiedBy) {
    info(
      `Skipping ${label} start because need is already satisfied while slots are full`,
      satisfiedBy,
    );
    return {
      ok: true,
      alreadySatisfied: true,
      ready: true,
      satisfiedBy: satisfiedBy.name || null,
      satisfiedByMatch: satisfiedBy.match,
    };
  }

  if (!shouldSwap) {
    info(
      `Starting ${label} without swap (active: m=${activeCounts.merchant}, f=${activeCounts.farmer})`,
      targetName,
    );

    try {
      await start_character(targetName, codeSlotOrName);
    } catch (e) {
      warn(`Failed to start ${label} character`, e);
      return { ok: false, reason: "start-failed", error: e };
    }

    const ready = await waitForCharacterReady({
      name: targetName,
      timeoutMs,
      readyCmd: "bot:code_loaded",
    });

    return { ok: true, started: true, ready, swapped: false };
  }

  const subOut = pickSubOut({
    activeCharacters: localActiveCharacters,
    activeNames: localActiveNames,
    selfName: character.name,
    targetName,
    targetCtype,
    swapPriorityList,
    excludeSubOutNames,
  });

  if (!subOut) {
    return {
      ok: false,
      reason: "no-sub-out",
      routeFallback: requestCharacterRouteFallback({
        targetName,
        label,
        reason: "no-sub-out",
      }),
    };
  }

  info("Swapping out", subOut, `to start ${label}`, targetName);

  try {
    stop_character(subOut);
    await sleepMs(500);
  } catch {
    // ignore
  }

  try {
    await start_character(targetName, codeSlotOrName);
  } catch (e) {
    warn(`Failed to start ${label} character`, e);
    return {
      ok: false,
      reason: "start-failed",
      error: e,
      routeFallback: requestCharacterRouteFallback({
        targetName,
        label,
        reason: "start-failed",
        subOut,
      }),
    };
  }

  const ready = await waitForCharacterReady({
    name: targetName,
    timeoutMs,
    readyCmd: "bot:code_loaded",
  });

  return { ok: true, started: true, ready, subOut };
};

const installPriestSwap = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastAttemptAt: 0,
    busy: false,
    timer: null,
  };

  const stopRoutine = () => {
    st.stopped = true;
    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;
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
      ) {
        return;
      }

      const nowMs = now();
      if (nowMs - st.lastAttemptAt < 10000) return;
      st.lastAttemptAt = nowMs;

      st.busy = true;
      const result = await ensureCharacterRunningBySwap({
        targetName: priestName,
        codeSlotOrName,
        swapPriorityList: cfg.priestSwap?.swapPriorityList,
        label: "priest",
        timeoutMs: 30000,
        skipStartIfSatisfied: true,
        satisfiedByCtype: "priest",
      });

      if (!result.ok && result.reason === "no-sub-out") {
        warn("No eligible character to swap out for priest");
      }
    } catch (e) {
      warn("Priest swap loop error", e);
    } finally {
      st.busy = false;
      if (st.stopped) return;
      st.timer = setTimeout(loop, 2000);
    }
  };

  loop();

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
  getActiveStateMap,
  isRunningState,
  pickSubOut,
  waitForCharacterReady,
  ensureCharacterRunningBySwap,
  installPriestSwap,
};
