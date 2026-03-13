const { getActiveNames } = await require("../party/party.js");

const getKnownCharacters = () => {
  try {
    const chars = get_characters?.();
    return Array.isArray(chars) ? chars : [];
  } catch {
    return [];
  }
};

const resolveCharacterName = (name) => {
  try {
    if (!name) return null;
    const chars = get_characters?.();
    if (!Array.isArray(chars)) return name;
    const exact = chars.find((c) => c?.name === name)?.name;
    if (exact) return exact;
    const lower = String(name).toLowerCase();
    const ci = chars.find(
      (c) => String(c?.name || "").toLowerCase() === lower,
    )?.name;
    return ci || name;
  } catch {
    return name;
  }
};

const isKnownCharacterName = (name) => {
  try {
    if (!name) return false;
    const chars = get_characters?.();
    if (!Array.isArray(chars)) return false;
    return chars.some((c) => c?.name === name);
  } catch {
    return false;
  }
};

const getKnownOnlineNames = () => {
  const online = new Set();
  try {
    for (const entry of getKnownCharacters()) {
      if (!entry?.name) continue;
      if (Number(entry?.online || 0) > 0) online.add(entry.name);
    }
  } catch {
    // ignore
  }

  if (character?.name) online.add(character.name);
  return Array.from(online);
};

const listOfflineFarmerNamesByType = ({
  activeRoster = [],
  includeTypes = [],
} = {}) => {
  const active = new Set(
    [
      ...(Array.isArray(activeRoster) ? activeRoster : []),
      ...getKnownOnlineNames(),
    ].filter(Boolean),
  );
  const typeSet = new Set(
    (Array.isArray(includeTypes) ? includeTypes : []).map((t) =>
      String(t || "").toLowerCase(),
    ),
  );
  if (!typeSet.size) return [];

  return getKnownCharacters()
    .filter((c) => {
      const name = c?.name;
      const type = String(c?.type || c?.ctype || "").toLowerCase();
      if (!name || !typeSet.has(type)) return false;
      return !active.has(name);
    })
    .map((c) => c.name)
    .filter(Boolean);
};

const isCharacterOnline = (name) => {
  try {
    const resolved = resolveCharacterName(name);
    if (!resolved) return false;
    const active = getActiveNames();
    return Array.isArray(active) && active.includes(resolved);
  } catch {
    return false;
  }
};

module.exports = {
  getKnownCharacters,
  resolveCharacterName,
  isKnownCharacterName,
  getKnownOnlineNames,
  listOfflineFarmerNamesByType,
  isCharacterOnline,
};
