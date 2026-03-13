const { waitForCm } = await require("../events/listeners.js");
const { now } = await require("../../fn_time.js");
const { ensureCharacterRunningBySwap } = await require("../party/swap.js");
const { resolveCharacterName, isKnownCharacterName, isCharacterOnline } =
  await require("./character_registry.js");

const requestMageMagiport = ({ mageName, targetName, taskId, task } = {}) => {
  try {
    if (!mageName || !targetName) return false;
    const resolvedMage = resolveCharacterName(mageName) || mageName;
    const resolvedTarget = resolveCharacterName(targetName);
    if (!resolvedTarget || !isKnownCharacterName(resolvedTarget)) return false;
    send_cm(resolvedMage, {
      cmd: "mage:magiport",
      taskId: taskId || `huntchain:${Date.now()}`,
      mageName: resolvedMage,
      task:
        task && typeof task === "object"
          ? task
          : {
              target: null,
            },
      targets: [resolvedTarget],
      force: true,
      ttlMs: 15000,
    });
    return true;
  } catch {
    return false;
  }
};

const waitForMageMagiportResult = async ({
  mageName,
  taskId,
  timeoutMs = 12000,
} = {}) => {
  try {
    const resolvedMage = resolveCharacterName(mageName);
    if (!resolvedMage || !taskId) return null;
    return await waitForCm({
      from: resolvedMage,
      cmd: "mage:magiport_result",
      predicate: (m) => m?.message?.taskId === taskId,
      timeoutMs,
    });
  } catch {
    return null;
  }
};

const stopCharacterSafe = (name) => {
  try {
    const resolved = resolveCharacterName(name);
    if (!resolved || resolved === character?.name) return false;
    stop_character(resolved);
    return true;
  } catch {
    return false;
  }
};

const ensureChainMageRunning = async ({
  cfg,
  mageName,
  chainCfg,
  preferredSubOut = [],
  excludeSubOutNames = [],
  label = "chain-mage",
} = {}) => {
  try {
    const resolvedMage = resolveCharacterName(mageName) || mageName;
    if (!resolvedMage) return { ok: false, reason: "missing-mage" };
    if (isCharacterOnline(resolvedMage)) {
      return { ok: true, alreadyRunning: true, mageName: resolvedMage };
    }

    const codeSlotOrName =
      chainCfg?.codeSlotOrName ?? cfg?.mageSwap?.codeSlotOrName;
    if (
      codeSlotOrName === undefined ||
      codeSlotOrName === null ||
      codeSlotOrName === ""
    ) {
      return { ok: false, reason: "missing-code-slot", mageName };
    }

    const swapPriorityList = Array.from(
      new Set([
        ...(Array.isArray(preferredSubOut) ? preferredSubOut : []),
        ...(Array.isArray(chainCfg?.swapPriorityList)
          ? chainCfg.swapPriorityList
          : []),
        ...(Array.isArray(cfg?.mageSwap?.swapPriorityList)
          ? cfg.mageSwap.swapPriorityList
          : []),
      ]),
    ).filter(Boolean);

    const timeoutMs = Math.max(
      4000,
      Number(chainCfg?.pendingTimeoutMs || 12000),
    );
    const result = await ensureCharacterRunningBySwap({
      targetName: resolvedMage,
      codeSlotOrName,
      swapPriorityList,
      excludeSubOutNames,
      label,
      timeoutMs,
    });

    const waitForOnline = async (name, maxWaitMs = 2500) => {
      const started = now();
      while (now() - started < maxWaitMs) {
        if (isCharacterOnline(name)) return true;
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      return isCharacterOnline(name);
    };

    const online =
      Boolean(result?.alreadyRunning) ||
      (await waitForOnline(
        resolvedMage,
        Math.min(4000, Math.max(1500, timeoutMs)),
      ));
    const ready = result?.ready !== false;

    return {
      ok: Boolean(result?.ok) && Boolean(online) && Boolean(ready),
      mageName: resolvedMage,
      ready,
      online,
      result,
    };
  } catch (e) {
    return {
      ok: false,
      mageName: resolveCharacterName(mageName) || mageName,
      reason: "swap-error",
      error: e,
    };
  }
};

module.exports = {
  requestMageMagiport,
  waitForMageMagiportResult,
  stopCharacterSafe,
  ensureChainMageRunning,
};
