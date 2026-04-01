const DEFAULT_INTERVAL_MS = 1500;

const normalizeItemList = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((name) =>
          typeof name === "string" ? name.trim().toLowerCase() : "",
        )
        .filter(Boolean),
    ),
  );

const isEligibleCompoundItem = ({ item, maxItemLevel, allowSet, denySet }) => {
  const name = String(item?.name || "").toLowerCase();
  if (!name) return false;
  if (denySet.has(name)) return false;
  if (allowSet.size && !allowSet.has(name)) return false;

  const level = Number(item?.level || 0);
  if (!Number.isFinite(level) || level < 0) return false;
  if (level > maxItemLevel) return false;

  const itemDef = G?.items?.[name];
  return Boolean(itemDef?.compound);
};

const findTriple = ({ maxItemLevel, allowSet, denySet }) => {
  const groups = new Map();
  const items = Array.isArray(character?.items) ? character.items : [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    if (!item) continue;
    if (!isEligibleCompoundItem({ item, maxItemLevel, allowSet, denySet })) {
      continue;
    }

    const name = String(item.name).toLowerCase();
    const level = Number(item.level || 0);
    const key = `${name}:${level}`;
    const entry = groups.get(key) || { indexes: [], name, level };
    entry.indexes.push(i);
    groups.set(key, entry);
  }

  for (const entry of groups.values()) {
    if (entry.indexes.length >= 3) return entry;
  }

  return null;
};

const getCompoundScrollName = (level) =>
  Number(level || 0) <= 1 ? "cscroll0" : "cscroll1";

const createMerchantCompounder = ({
  enabled = false,
  intervalMs = DEFAULT_INTERVAL_MS,
  maxItemLevel = 1,
  allowItemNames = [],
  denyItemNames = [],
} = {}) => {
  const allowSet = new Set(normalizeItemList(allowItemNames));
  const denySet = new Set(normalizeItemList(denyItemNames));

  const st = {
    enabled: Boolean(enabled),
    intervalMs: Math.max(250, Number(intervalMs || DEFAULT_INTERVAL_MS)),
    maxItemLevel: Math.max(0, Number(maxItemLevel || 0)),
    lastRunAt: 0,
  };

  const tick = () => {
    try {
      if (!st.enabled) return false;
      if (character?.q?.compound) return false;

      const now = Date.now();
      if (now - st.lastRunAt < st.intervalMs) return false;
      st.lastRunAt = now;

      const triple = findTriple({
        maxItemLevel: st.maxItemLevel,
        allowSet,
        denySet,
      });
      if (!triple) return false;

      const scrollName = getCompoundScrollName(triple.level);
      let scrollSlot = locate_item(scrollName);
      if (scrollSlot < 0) {
        if (typeof buy_with_gold === "function") {
          buy_with_gold(scrollName, 1);
        }
        return false;
      }

      try {
        compound(
          triple.indexes[0],
          triple.indexes[1],
          triple.indexes[2],
          scrollSlot,
        );
        return true;
      } catch {
        scrollSlot = locate_item(scrollName);
        if (scrollSlot < 0 && typeof buy_with_gold === "function") {
          buy_with_gold(scrollName, 1);
        }
      }
    } catch {
      // ignore
    }

    return false;
  };

  const stopRoutine = () => {
    st.lastRunAt = 0;
  };

  return {
    tick,
    stopRoutine,
  };
};

module.exports = {
  createMerchantCompounder,
};
