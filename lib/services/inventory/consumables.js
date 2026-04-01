/**
 * Checks for a specific consumable in slots or items, drinks if needed.
 * @param {object} character - The character object with .slots and .items arrays.
 * @param {string} consumable - The name of the consumable to check for.
 */
function hasConsumableInSlots(character, consumable) {
  const slots = character?.slots;
  if (!slots) return false;
  if (Array.isArray(slots)) {
    return slots.some((item) => item && item.name === consumable);
  }
  if (typeof slots === "object") {
    return Object.values(slots).some(
      (item) => item && item.name === consumable,
    );
  }
  return false;
}

function ensureConsumable(character, consumable) {
  // Prefer explicit elixir slot check in runtime data structures.
  if (character?.slots?.elixir?.name === consumable) {
    return true;
  }

  if (hasConsumableInSlots(character, consumable)) {
    return true;
  }

  const consumableItem = character.items?.find(
    (item) => item && item.name === consumable,
  );

  if (consumableItem) {
    const slot = locate_item(consumable);
    if (slot >= 0) {
      try {
        use(slot);
      } catch {
        // fallback to equip for non-consumable-like items (if required)
        try {
          equip(slot);
        } catch {
          // ignore
        }
      }
      return true;
    }
  }

  return false;
}

function getConsumable(character, consumable) {
  if (hasConsumableInSlots(character, consumable)) {
    if (Array.isArray(character.slots)) {
      return character.slots.find((item) => item && item.name === consumable);
    }
    if (typeof character.slots === "object") {
      return Object.values(character.slots).find(
        (item) => item && item.name === consumable,
      );
    }
  }

  return character.items?.find((item) => item && item.name === consumable);
}

module.exports = {
  ensureConsumable,
  getConsumable,
  hasConsumableInSlots,
};
