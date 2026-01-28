// const tradeStorageItems = ["essenceoffire", "spidersilk", "feather0"];

// function do_trade_manipulation(fn, name=null) {
// 	for (let slot of Object.keys(character.slots)) {
// 		if (slot.includes("trade")) {
// 			fn(slot, name)
// 		}
// 	}
// }
// function pull_trade_item(slot, name=name) {
// 	if (character.slots[slot] != null) {
// 		parent.socket.emit("trade_cancel", {num: slot[5]})
// 	}
// }

let activeTraderSlots = [];

function getActiveTradeSlots() {
  for (let slot in character.slots) {
    let regex = /trade/;
    let match = regex.test(slot);
    if (!match) continue;

    let mySlot = character.slots[slot];
    if (!mySlot) continue;
    activeTraderSlots.push(slot);
  }
}

function pull_or_store() {
  // TODO: some way to pull or store ingredient if/not crafting base in inventory

  // some item in inventory that is part of a recipe. e.g. throwingstars
  let craftItem = getCraftItem();
  if (character.items[locate_item(craftItem)].level > 0) return;
  let tradeIngredientName = craftDict[craftItem]["recipe"]["items"][1][1];

  if (
    !has_trade_item(tradeIngredientName) &&
    locate_item(tradeIngredientName) < 0
  )
    return;
}

function has_trade_item(name) {
  // checks trade slots for item, if found, returns slot - else returns false
  for (let slot of Object.keys(character.slots)) {
    if (slot.includes("trade")) {
      let itemInTrade = character.slots[slot];

      if (!itemInTrade) continue;

      if (itemInTrade.name == name) {
        return slot;
      }
    }
  }
  return false;
}

function store_trade_item(name) {
  // checks inventory for item, if found, puts it in first open trade slot
  for (let slot of Object.keys(character.slots)) {
    if (slot.includes("trade") && !character.slots[slot]) {
      let itemSlot = locate_item(name);

      if (itemSlot === -1) return;

      let quantity = character.items[itemSlot].q || 1;

      trade(locate_item(name), slot, 99999999999, quantity);
      return;
    }
  }
}

function buy_tool(tool_name) {
  for (let slot of Object.keys(character.slots)) {
    if (slot.includes("trade") && !character.slots[slot]) {
      parent.socket.emit("trade_wishlist", {
        q: 1,
        slot: slot,
        price: 1000000,
        level: 0,
        name: tool_name,
      });
      send_tg_bot_message("Buying tool: " + tool_name);
      return;
    }
  }
}

function sellToMerch() {
  for (itemSlot in character.items) {
    if (!itemSlot) continue;

    let item = character.items[itemSlot];
    if (!item) continue;

    let itemName = item.name;
    if (!itemName) continue;

    if (sell_dict["merchSell"].includes(itemName)) {
      log(item);
    }
  }
}
