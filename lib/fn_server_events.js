const isJoinableEvent = (name) => {
  try {
    return Boolean(name && G?.events?.[name]?.join);
  } catch {
    return false;
  }
};

const isEventLive = (name) => {
  try {
    const s = parent?.S?.[name];
    if (!s) return false;
    if (typeof s.live === "boolean") return s.live;
    // Some server entries omit `live` while active.
    return true;
  } catch {
    return false;
  }
};

const getActiveJoinableEvents = () => {
  try {
    const active = parent?.S || {};
    return Object.keys(active).filter(
      (name) => isJoinableEvent(name) && isEventLive(name),
    );
  } catch {
    return [];
  }
};

const getActiveWorldEvents = () => {
  try {
    const active = parent?.S || {};
    const out = [];
    for (const [name, val] of Object.entries(active)) {
      if (!val || typeof val !== "object") continue;
      if (isJoinableEvent(name)) continue;
      if (!val.live) continue;
      if (!val.map) continue;
      if (typeof val.x !== "number" || typeof val.y !== "number") continue;
      out.push({ name, ...val });
    }
    return out;
  } catch {
    return [];
  }
};

const pickWorldEvent = (events) => {
  if (!Array.isArray(events) || !events.length) return null;
  return events.slice().sort((a, b) => {
    const ah = Number(a.max_hp ?? a.hp ?? 0);
    const bh = Number(b.max_hp ?? b.hp ?? 0);
    if (ah !== bh) return bh - ah;
    return String(a.name).localeCompare(String(b.name));
  })[0];
};

module.exports = {
  isJoinableEvent,
  isEventLive,
  getActiveJoinableEvents,
  getActiveWorldEvents,
  pickWorldEvent,
};
