const getFreeSlots = () => {
  try {
    if (typeof character?.esize === "number") return character.esize;
  } catch {
    // ignore
  }

  try {
    const items = character?.items;
    if (Array.isArray(items)) return items.filter((it) => !it).length;
  } catch {
    // ignore
  }

  return 0;
};

const hasAtMostFreeSlots = (maxFreeSlots) => {
  const max = Number(maxFreeSlots);
  if (!Number.isFinite(max)) return false;
  return getFreeSlots() <= max;
};

module.exports = {
  getFreeSlots,
  hasAtMostFreeSlots,
};
