const now = () => Date.now();

const CITIZEN0_DEFAULTS = Object.freeze({
  enabled: true,
  movementThresholdPx: 150,
  auraGraceMs: 1200,
  auraStopWaitMs: 500,
  approachDurationMs: 9000,
  returnDurationMs: 12000,
  confettiCooldownMs: 20000,
  firecrackersCooldownMs: 200000,
  proximityDistancePx: 80,
});

const getCitizen0Config = (cfg) => {
  const raw = cfg?.noEventFarming?.citizen0;
  if (raw === false) {
    return { ...CITIZEN0_DEFAULTS, enabled: false };
  }
  if (raw === true || raw == null) {
    return { ...CITIZEN0_DEFAULTS, enabled: raw === false ? false : true };
  }
  if (typeof raw === "object") {
    return {
      ...CITIZEN0_DEFAULTS,
      ...raw,
      enabled:
        raw.enabled === undefined
          ? CITIZEN0_DEFAULTS.enabled
          : Boolean(raw.enabled),
    };
  }
  return { ...CITIZEN0_DEFAULTS };
};

const findKaneEntity = () => {
  try {
    const entities = parent?.entities || {};
    return Object.values(entities).find((entity) => {
      if (!entity) return false;
      const name = String(entity?.name || "").toLowerCase();
      const id = String(entity?.id || "").toLowerCase();
      return id === "citizen0" || name === "kane";
    });
  } catch {
    return null;
  }
};

const distanceBetween = (a, b) => {
  if (!a || !b) return Infinity;
  const dx = Number(a.x || 0) - Number(b.x || 0);
  const dy = Number(a.y || 0) - Number(b.y || 0);
  return Math.hypot(dx, dy);
};

const recordKaneMovement = (st, kane, cfg) => {
  if (!kane) return;

  if (!st.kaneInitialPosition) {
    st.kaneInitialPosition = { x: Number(kane.x || 0), y: Number(kane.y || 0) };
  }

  const dx = Math.abs(
    Number(kane.x || 0) - Number(st.kaneInitialPosition.x || 0),
  );
  const dy = Math.abs(
    Number(kane.y || 0) - Number(st.kaneInitialPosition.y || 0),
  );

  const citizenConfig = getCitizen0Config(cfg);
  const threshold = Number(citizenConfig.movementThresholdPx || 50);

  if (dx >= threshold || dy >= threshold) {
    st.kaneMovedThresholdReached = true;
  }
};

const shouldUseCitizen0Consumable = (st, cfg) => {
  const citizenConfig = getCitizen0Config(cfg);
  const nowMs = now();
  const auraStoppedAt = Number(st.kaneAuraStoppedAt || 0);
  if (!auraStoppedAt) return false;

  if (!st.kaneMovedThresholdReached) return false;

  const neededDelay = Number(citizenConfig.auraStopWaitMs || 400);
  if (nowMs - auraStoppedAt < neededDelay) return false;

  const confettiReady =
    !Number.isFinite(st.lastKaneConfettiAt) ||
    nowMs - st.lastKaneConfettiAt >=
      Number(citizenConfig.confettiCooldownMs || 20000);

  const firecrackersReady =
    !Number.isFinite(st.lastKaneFirecrackersAt) ||
    nowMs - st.lastKaneFirecrackersAt >=
      Number(citizenConfig.firecrackersCooldownMs || 200000);

  return confettiReady || firecrackersReady;
};

const useCitizen0Consumable = (st, cfg) => {
  const nowMs = now();
  const citizenConfig = getCitizen0Config(cfg);

  const firecrackerSlot = locate_item("firecrackers");
  const confettiSlot = locate_item("confetti");

  const firecrackersCooldownMs = Number(
    citizenConfig.firecrackersCooldownMs || 200000,
  );
  const confettiCooldownMs = Number(citizenConfig.confettiCooldownMs || 20000);

  const firecrackersReady =
    !Number.isFinite(st.lastKaneFirecrackersAt) ||
    nowMs - st.lastKaneFirecrackersAt >= firecrackersCooldownMs;
  const confettiReady =
    !Number.isFinite(st.lastKaneConfettiAt) ||
    nowMs - st.lastKaneConfettiAt >= confettiCooldownMs;

  if (confettiReady && confettiSlot >= 0) {
    try {
      throw_item(confettiSlot, character.real_x, character.real_y);
      st.lastKaneConfettiAt = nowMs;
      st.lastKaneConsumableAt = nowMs;
      st.kaneAuraStoppedAt = null;
      st.kaneAuraLastRenewAt = nowMs;
      return "confetti";
    } catch {
      // ignore
    }
  }

  if (firecrackersReady && firecrackerSlot >= 0) {
    try {
      throw_item(firecrackerSlot, character.real_x, character.real_y);
      st.lastKaneFirecrackersAt = nowMs;
      st.lastKaneConsumableAt = nowMs;
      st.kaneAuraStoppedAt = null;
      st.kaneAuraLastRenewAt = nowMs;
      return "firecrackers";
    } catch {
      // ignore
    }
  }

  return null;
};

const moveToPoint = ({ target, st, mover, cfg }) => {
  if (!target || !target.map) return;
  const dist = distanceBetween(character, target);
  const citizenConfig = getCitizen0Config(cfg);
  const proximity = Number(
    citizenConfig.proximityDistancePx || st.kaneApproachDistancePx || 70,
  );
  if (dist <= proximity) return;

  if (mover) {
    try {
      mover.request({
        dest: { map: target.map, x: target.x, y: target.y },
        key: "kane_proximity",
        priority: 3,
        cooldownMs: 1000,
      });
      return;
    } catch {
      // ignore
    }
  }

  try {
    smart_move({ map: target.map, x: target.x, y: target.y });
  } catch {
    // ignore
  }
};

const getFormCrabSpot = (cfg) => {
  const defaultSpot = cfg?.noEventFarming?.huntSpotsByTarget?.crab?.[0];
  if (
    defaultSpot &&
    defaultSpot.map &&
    Number.isFinite(defaultSpot.x) &&
    Number.isFinite(defaultSpot.y)
  ) {
    return {
      map: defaultSpot.map,
      x: Number(defaultSpot.x),
      y: Number(defaultSpot.y),
    };
  }
  return {
    map: character.map,
    x: Number(character.x || character.real_x || 0),
    y: Number(character.y || character.real_y || 0),
  };
};

const handleKaneCrabRoutine = async ({
  cfg,
  st,
  mover,
  effectiveIsTinyForKane,
}) => {
  if (!effectiveIsTinyForKane) return false;

  const citizenConfig = getCitizen0Config(cfg);
  if (!citizenConfig.enabled) return false;

  const nowMs = now();
  const kane = findKaneEntity();
  if (!kane) {
    return false;
  }

  recordKaneMovement(st, kane, cfg);

  const auraSaved = (character?.s?.citizen0aura?.ms || 0) > 0;
  if (auraSaved) {
    st.kaneAuraLastSeenAt = nowMs;
  }

  const auraGraceMs = Number(citizenConfig.auraGraceMs || 1200);
  if (auraSaved) {
    st.kaneAuraLastRenewAt = nowMs;
  } else if (
    Number.isFinite(st.kaneAuraLastRenewAt) &&
    nowMs - st.kaneAuraLastRenewAt > auraGraceMs
  ) {
    if (!st.kaneAuraStoppedAt) st.kaneAuraStoppedAt = nowMs;
  }

  const shouldUse = shouldUseCitizen0Consumable(st, cfg);
  if (shouldUse) {
    const item = useCitizen0Consumable(st, cfg);
    if (item) {
      st.kaneActionState = "approach";
      st.kaneApproachUntil =
        nowMs + Number(citizenConfig.approachDurationMs || 9000);
      st.kaneReturnUntil =
        st.kaneApproachUntil + Number(citizenConfig.returnDurationMs || 12000);
      st.kaneFarmPoint = getFormCrabSpot(cfg);
      st.kaneLastUsedItem = item;
      return true;
    }
  }

  if (st.kaneActionState === "approach" && nowMs <= st.kaneApproachUntil) {
    moveToPoint({
      target: { map: kane.map, x: kane.x, y: kane.y },
      st,
      mover,
      cfg,
    });
    return true;
  }

  if (st.kaneActionState === "approach" && nowMs > st.kaneApproachUntil) {
    st.kaneActionState = "return";
  }

  if (st.kaneActionState === "return" && nowMs <= st.kaneReturnUntil) {
    const farmPoint = st.kaneFarmPoint || getFormCrabSpot(cfg);
    moveToPoint({ target: farmPoint, st, mover, cfg });
    return true;
  }

  if (st.kaneActionState && nowMs > st.kaneReturnUntil) {
    st.kaneActionState = null;
    st.kaneMovedThresholdReached = false;
    st.kaneInitialPosition = { x: Number(kane.x || 0), y: Number(kane.y || 0) };
    return false;
  }

  return false;
};

module.exports = {
  handleKaneCrabRoutine,
};
