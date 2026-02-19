const isJoinableEvent = (name) => {
  try {
    return Boolean(
      name && G && G.events && G.events[name] && G.events[name].join,
    );
  } catch {
    return false;
  }
};

const getActiveJoinableEvents = () => {
  try {
    const active = parent?.S || {};
    return Object.keys(active).filter((name) => isJoinableEvent(name));
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
  getActiveJoinableEvents,
  getActiveWorldEvents,
  pickWorldEvent,
};
