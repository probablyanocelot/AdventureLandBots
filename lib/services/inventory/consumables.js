/**
 * Description placeholder
 *
 * @param {*} item
 */
function drinkFn(item) {
  // Placeholder for the actual drink function, which would interact with the game API.
  console.log(`Drinking ${item.name}...`);
}

/**
 * Checks for a specific consumable in slots or items, drinks if needed.
 * @param {object} character - The character object with .slots and .items arrays.
 * @param {string} consumable - The name of the consumable to check for.
 * @param {function} drinkFn - Function to call to drink the item (e.g., character.drink).
 */
function ensureConsumable(character, consumable, drinkFn) {
  const hasInSlots = character.slots?.some(
    (item) => item && item.name === consumable,
  );
  const elixirInItems = character.items?.find(
    (item) => item && item.name === consumable,
  );
  if (!hasInSlots && elixirInItems) {
    drinkFn(elixirInItems);
    return true;
  }
  return false;
}

function getConsumable(character, consumable) {
  const inSlots = character.slots?.find(
    (item) => item && item.name === consumable,
  );
  const inItems = character.items?.find(
    (item) => item && item.name === consumable,
  );
  return inSlots || inItems;
}

module.exports = {
  drinkFn,
  ensureConsumable,
  getConsumable,
};
