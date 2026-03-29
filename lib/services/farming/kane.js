const now = () => Date.now();

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

  const dx = Number(kane.x || 0) - Number(st.kaneInitialPosition.x || 0);
  const dy = Number(kane.y || 0) - Number(st.kaneInitialPosition.y || 0);

  const threshold = Number(
    cfg?.noEventFarming?.citizen0?.movementThresholdPx || 150,
  );
  if (dx >= threshold || dy >= threshold) {
    st.kaneMovedThresholdReached = true;
  }
};

const shouldUseCitizen0Consumable = (st, cfg) => {
  const nowMs = now();
  const auraStoppedAt = Number(st.kaneAuraStoppedAt || 0);
  if (!auraStoppedAt) return false;

  const neededDelay = Number(
    cfg?.noEventFarming?.citizen0?.auraStopWaitMs || 400,
  );
  if (nowMs - auraStoppedAt < neededDelay) return false;

  if (!st.kaneMovedThresholdReached) return false;

  const confettiReady =
    !Number.isFinite(st.lastKaneConfettiAt) ||
    nowMs - st.lastKaneConfettiAt >=
      Number(cfg?.noEventFarming?.citizen0?.confettiCooldownMs || 20000);

  const firecrackersReady =
    !Number.isFinite(st.lastKaneFirecrackersAt) ||
    nowMs - st.lastKaneFirecrackersAt >=
      Number(cfg?.noEventFarming?.citizen0?.firecrackersCooldownMs || 200000);

  return confettiReady || firecrackersReady;
};

const useCitizen0Consumable = (st) => {
  const nowMs = now();

  const firecrackerSlot = locate_item("firecrackers");
  const confettiSlot = locate_item("confetti");

  const firecrackersReady =
    !Number.isFinite(st.lastKaneFirecrackersAt) ||
    nowMs - st.lastKaneFirecrackersAt >= 200000;
  const confettiReady =
    !Number.isFinite(st.lastKaneConfettiAt) ||
    nowMs - st.lastKaneConfettiAt >= 20000;

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

  return null;
};

const moveToPoint = ({ target, st, mover, cfg }) => {
  if (!target || !target.map) return;
  const dist = distanceBetween(character, target);
  const proximity = Number(
    cfg?.noEventFarming?.citizen0?.proximityDistancePx ||
      st.kaneApproachDistancePx ||
      70,
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

const handleKaneCrabRoutine = async ({ cfg, st, mover, effectiveIsTiny }) => {
  if (!effectiveIsTiny) return false;
  if (!cfg?.noEventFarming?.citizen0?.enabled) return false;

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

  const auraGraceMs = Number(
    cfg?.noEventFarming?.citizen0?.auraGraceMs || 1200,
  );
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
    const item = useCitizen0Consumable(st);
    if (item) {
      st.kaneActionState = "approach";
      st.kaneApproachUntil =
        nowMs +
        Number(cfg?.noEventFarming?.citizen0?.approachDurationMs || 9000);
      st.kaneReturnUntil =
        st.kaneApproachUntil +
        Number(cfg?.noEventFarming?.citizen0?.returnDurationMs || 12000);
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
