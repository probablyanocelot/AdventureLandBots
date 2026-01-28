const craftbalesToKeep = ["pickaxe", "fishingrod"];
const craftItems = [
  "throwingstars", // 'feather0', 'spidersilk', 'mbones',
];
const simpleCrafts = ["feather0", "spidersilk", "mbones"];

const craftDict = {
  // G.craft.item example:
  // {
  // 	"items": [
  // 		[
  // 			1,
  // 			"throwingstars"
  // 		],
  // 		[
  // 			1,
  // 			"essenceoffire"
  // 		]
  // 	],
  // 	"cost": 180000
  // }
  throwingstars: {
    name: "firestars",
    recipe: G.craft.firestars,
  },
  feather0: {
    name: "wingedboots",
    recipe: G.craft.wingedboots,
  },
  spidersilk: {},
};

function getCraftItem() {
  for (let item of character.items) {
    // continue if item==null or not in craftItems
    if (!item) continue;
    if (!craftItems.includes(item.name)) continue;

    let craftItem = item.name;
    return craftItem;
  }
  return false;
}

function hasComponents(itemName) {
  // TODO replace with more modular code
  for (let ingredient of G.craft[itemName].items) {
    if (locate_item(ingredient[1]) < 0) return false;
  }
  return true;
}

// TODO: Create searchBank which returns both the item and its index in the bank
// TODO: Create getComponentsForCrafting which returns item and amount needed

async function replaceCraftable(itemName) {
  if (character.items[itemName] > -1) return; // already have one
  let components = getComponentsForCrafting(itemName);
  let wholeItem = searchBank(itemName);
  if (!character.bank && !smart.moving) await smart_move("bank");
  // if wholeItem found in bank, withdraw it
  if (wholeItem) {
    await bankWithdraw(itemName, 1);
    return;
  }
  // else, withdraw components
  if (components[0]) await bankWithdraw(components[0], 1);
  if (components[1]) await bankWithdraw(components[1], 1);
  //   leave bank

  //   else check if merchants selling components or whole item
  //  await auto_craft(itemName);
}

// TODO cleanse these abominations
function craft_basket() {
  // doesn't clear interval properly; is temporary solution to quickly crafting baskets
  let basketWeaving;
  if (character.bank && basketWeaving) {
    clearInterval(basketWeaving);
    return;
  }
  if (has_eggs() && !basketWeaving)
    basketWeaving = setInterval(auto_craft, 50, "basketofeggs");
  if (!has_eggs() && basketWeaving) clearInterval(basketWeaving);
}

function simple_craft() {
  //
  if (
    merchantBot.current_action == "unpacking" ||
    merchantBot.current_action == "fishing" ||
    merchantBot.current_action == "mining"
  )
    return;

  for (let craftable of simpleCrafts) {
    let craftableIdx = locate_item(craftable);
    if (craftableIdx < 0 && !has_trade_item(craftable)) continue;

    if (craftableIdx < 0 && has_trade_item(craftable))
      unequip(has_trade_item(craftable));

    craftableIdx = locate_item(craftable);

    let item = character.items[craftableIdx];

    if (craftable == "feather0") {
      // must have 20+ for recipe
      if (item.q < 20) continue;
      // buy shoes if needed
      if (locate_item("shoes") < 0 && character.esize > 2)
        buy_with_gold("shoes", 1);
      auto_craft("wingedboots");
    }
  }
  return;
}

function craft_master() {
  // some item in inventory that is part of a recipe. e.g. throwingstars
  let craftItem = getCraftItem();
  if (!getCraftItem()) return; // no item, stop

  let craftBase = character.items[locate_item(craftItem)];
  if (craftBase.level > 0) return;
  let tradeIngredientName = craftDict[craftItem]["recipe"]["items"][1][1];

  if (
    !has_trade_item(tradeIngredientName) &&
    locate_item(tradeIngredientName) < 0
  )
    return;

  let tradeSlot = has_trade_item(tradeIngredientName);

  unequip(tradeSlot);

  if (locate_item("computer") < 0) {
    smart_move(find_npc("craftsman"))
      .then(auto_craft(craftItem.name))
      .catch(smart_move(find_npc("craftsman")));
  }

  auto_craft(craftDict[craftItem].name);

  if (!getCraftItem()) store_trade_item(tradeIngredientName);
}
