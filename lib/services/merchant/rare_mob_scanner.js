const DEFAULT_MONSTER_NAMES = Object.freeze([
  "tiger",
  "cutebee",
  "grinch",
  "goldenbat",
  "mvampire",
  "phoenix",
  "greenjr",
  "jr",
  "rudolph",
]);

const DEFAULT_SCAN_INTERVAL_MS = 2000;
const DEFAULT_ALERT_REPEAT_MS = 5 * 60 * 1000;

const normalizeMonsterNames = (value) => {
  const source = Array.isArray(value) ? value : DEFAULT_MONSTER_NAMES;
  return Array.from(
    new Set(
      source
        .map((name) =>
          typeof name === "string" ? name.trim().toLowerCase() : "",
        )
        .filter(Boolean),
    ),
  );
};

const createRareMobScanner = ({
  enabled = false,
  names,
  scanIntervalMs = DEFAULT_SCAN_INTERVAL_MS,
  alertRepeatMs = DEFAULT_ALERT_REPEAT_MS,
  announceToGameLog = true,
  notify,
} = {}) => {
  const st = {
    enabled: Boolean(enabled),
    names: normalizeMonsterNames(names),
    scanIntervalMs: Math.max(
      250,
      Number(scanIntervalMs || DEFAULT_SCAN_INTERVAL_MS),
    ),
    alertRepeatMs: Math.max(
      1000,
      Number(alertRepeatMs || DEFAULT_ALERT_REPEAT_MS),
    ),
    announceToGameLog: announceToGameLog !== false,
    seenAtByEntityId: new Map(),
    lastScanAt: 0,
  };

  const shouldAlertEntity = (entity, now) => {
    const id = String(entity?.id || "");
    if (!id) return false;
    const last = Number(st.seenAtByEntityId.get(id) || 0);
    return now - last >= st.alertRepeatMs;
  };

  const scan = () => {
    try {
      if (!st.enabled) return;
      if (!st.names.length) return;

      const now = Date.now();
      if (now - st.lastScanAt < st.scanIntervalMs) return;
      st.lastScanAt = now;

      const entities = parent?.entities || {};
      const activeIds = new Set();

      for (const id in entities) {
        const e = entities[id];
        if (!e || e.type !== "monster") continue;
        activeIds.add(String(e.id || id));

        const name = String(e.name || "").toLowerCase();
        if (!st.names.includes(name)) continue;
        if (!shouldAlertEntity(e, now)) continue;

        const entityId = String(e.id || id);
        st.seenAtByEntityId.set(entityId, now);

        const msg = `rare mob ${e.name} @ ${e.map} (${Math.round(
          Number(e.x || 0),
        )}, ${Math.round(Number(e.y || 0))})`;
        if (st.announceToGameLog && typeof game_log === "function") {
          game_log(msg);
        }
        if (typeof notify === "function") {
          notify({ text: msg, key: `rare:${entityId}` });
        }
      }

      for (const seenId of Array.from(st.seenAtByEntityId.keys())) {
        if (!activeIds.has(seenId)) {
          st.seenAtByEntityId.delete(seenId);
        }
      }
    } catch {
      // ignore runtime failures
    }
  };

  const stopRoutine = () => {
    st.seenAtByEntityId.clear();
    st.lastScanAt = 0;
  };

  return {
    scan,
    stopRoutine,
  };
};

module.exports = {
  DEFAULT_MONSTER_NAMES,
  createRareMobScanner,
};
