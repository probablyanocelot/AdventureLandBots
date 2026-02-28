const EVENT_PRIORITY_ORDER = [
  // Highest: goobrawl can spawn rgoo/bgoo (rgoo can drop any item in game).
  "goobrawl",

  // Seasonal world events.
  "dragold",
  "pinkgoo",
  "mrpumpkin",
  "mrgreen",
  "grinch",
  "snowman",

  // World events.
  "franky",
  "icegolem",
  "crabxx",
  "goldenbat",
  "tinyp",
  "cutebee",

  // Lower priority: recurring daily-style events.
  "abtesting",
  "greenjr",
  "jr",
  "phoenix",
];

const EVENT_PRIORITY_BY_NAME = new Map(
  EVENT_PRIORITY_ORDER.map((name, idx) => [name, idx]),
);

const getEventPriorityRank = (name) => {
  if (!name) return Number.POSITIVE_INFINITY;
  const rank = EVENT_PRIORITY_BY_NAME.get(String(name));
  return Number.isFinite(rank) ? rank : 1000;
};

const compareEventsByPriority = (a, b) => {
  const ar = getEventPriorityRank(a?.name ?? a);
  const br = getEventPriorityRank(b?.name ?? b);
  if (ar !== br) return ar - br;

  const ah = Number(a?.max_hp ?? a?.hp ?? 0);
  const bh = Number(b?.max_hp ?? b?.hp ?? 0);
  if (ah !== bh) return bh - ah;

  return String(a?.name ?? a).localeCompare(String(b?.name ?? b));
};

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
    return Object.keys(active)
      .filter((name) => isJoinableEvent(name) && isEventLive(name))
      .sort(compareEventsByPriority);
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
  return events.slice().sort(compareEventsByPriority)[0];
};

module.exports = {
  EVENT_PRIORITY_ORDER,
  getEventPriorityRank,
  compareEventsByPriority,
  isJoinableEvent,
  isEventLive,
  getActiveJoinableEvents,
  getActiveWorldEvents,
  pickWorldEvent,
};
