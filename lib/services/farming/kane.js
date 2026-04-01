const now = () => Date.now();

const CITIZEN0_DEFAULTS = Object.freeze({
  enabled: true,
  leashDistancePx: 140,
  pullDistancePx: 90,
  notCloseDistancePx: 140,
  walkingAwayDeltaPx: 6,
  returnDurationMs: 12000,
  confettiCooldownMs: 20000,
  firecrackersCooldownMs: 200000,
  confettiThrillMs: 20000,
  firecrackersThrillMs: 200000,
  proximityDistancePx: 90,
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

const getCitizen0ReadyItem = (st, cfg) => {
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
    return {
      name: "confetti",
      slot: confettiSlot,
      lureDurationMs: Number(
        citizenConfig.confettiThrillMs || citizenConfig.confettiCooldownMs,
      ),
    };
  }

  if (firecrackersReady && firecrackerSlot >= 0) {
    return {
      name: "firecrackers",
      slot: firecrackerSlot,
      lureDurationMs: Number(
        citizenConfig.firecrackersThrillMs ||
          citizenConfig.firecrackersCooldownMs,
      ),
    };
  }

  return null;
};

const useCitizen0Consumable = ({ st, item }) => {
  if (!item || item.slot < 0) return null;

  const nowMs = now();
  try {
    throw_item(item.slot, character.real_x, character.real_y);
  } catch {
    return null;
  }

  if (item.name === "confetti") {
    st.lastKaneConfettiAt = nowMs;
  }
  if (item.name === "firecrackers") {
    st.lastKaneFirecrackersAt = nowMs;
  }

  st.lastKaneConsumableAt = nowMs;
  st.kaneLureActiveUntil = nowMs + Number(item.lureDurationMs || 0);
  st.kaneLastUsedItem = item.name;
  return item.name;
};

const getKaneDriftState = ({ st, kane, farmPoint, cfg }) => {
  const citizenConfig = getCitizen0Config(cfg);
  const notCloseDistancePx = Number(
    citizenConfig.notCloseDistancePx ?? citizenConfig.leashDistancePx ?? 140,
  );
  const walkingAwayDeltaPx = Number(citizenConfig.walkingAwayDeltaPx ?? 6);

  const sameMap =
    kane?.map && farmPoint?.map
      ? String(kane.map) === String(farmPoint.map)
      : true;
  const distanceToFarm = sameMap ? distanceBetween(kane, farmPoint) : Infinity;
  const prevDistanceToFarm = Number(st.kaneLastDistanceToFarmPx);

  const walkingAway =
    sameMap &&
    Number.isFinite(prevDistanceToFarm) &&
    distanceToFarm > prevDistanceToFarm + walkingAwayDeltaPx;
  const notClose = !sameMap || distanceToFarm > notCloseDistancePx;

  st.kaneLastDistanceToFarmPx = distanceToFarm;

  return { walkingAway, notClose, distanceToFarm };
};

const moveToPoint = ({ target, st, mover, cfg, proximityOverridePx }) => {
  if (!target || !target.map) return;
  const dist = distanceBetween(character, target);
  const citizenConfig = getCitizen0Config(cfg);
  const proximity = Number.isFinite(Number(proximityOverridePx))
    ? Number(proximityOverridePx)
    : Number(
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

  if (st.kaneActionState === "approach") {
    st.kaneActionState = "return";
  }

  const leashDistancePx = Number(citizenConfig.leashDistancePx || 140);
  const pullDistancePx = Number(citizenConfig.pullDistancePx || 90);
  const farmPoint = st.kaneFarmPoint || getFormCrabSpot(cfg);
  st.kaneFarmPoint = farmPoint;

  const distanceToKane = distanceBetween(character, kane);
  const hasConsumable =
    locate_item("confetti") >= 0 || locate_item("firecrackers") >= 0;
  const readyItem = hasConsumable ? getCitizen0ReadyItem(st, cfg) : null;
  const drift = getKaneDriftState({ st, kane, farmPoint, cfg });
  const shouldChaseForLeash = drift.notClose || drift.walkingAway;

  if (shouldChaseForLeash && distanceToKane > leashDistancePx) {
    moveToPoint({
      target: { map: kane.map || character.map, x: kane.x, y: kane.y },
      st,
      mover,
      cfg,
      proximityOverridePx: leashDistancePx,
    });
    return true;
  }

  const shouldRelure = Boolean(readyItem) && shouldChaseForLeash;

  if (shouldRelure) {
    if (distanceToKane > pullDistancePx) {
      moveToPoint({
        target: { map: kane.map || character.map, x: kane.x, y: kane.y },
        st,
        mover,
        cfg,
        proximityOverridePx: pullDistancePx,
      });
      return true;
    }

    const item = useCitizen0Consumable({ st, item: readyItem });
    if (item) {
      st.kaneActionState = "return";
      st.kaneReturnUntil =
        nowMs + Number(citizenConfig.returnDurationMs || 12000);
      return true;
    }
  }

  if (st.kaneActionState === "return" && nowMs <= st.kaneReturnUntil) {
    moveToPoint({ target: farmPoint, st, mover, cfg });
    return true;
  }

  if (st.kaneActionState && nowMs > st.kaneReturnUntil) {
    st.kaneActionState = null;
    return false;
  }

  return false;
};

module.exports = {
  handleKaneCrabRoutine,
};
