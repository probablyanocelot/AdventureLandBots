log("12 - Utility.12.js");

function is_off_timeout(last_action, time_ms) {
  if (last_action == null || new Date() - last_action >= time_ms) return true;
  return false;
}

function locate_items(item_name, item_level) {
  // start w/ empty array
  let itemArray = [];

  // iterate through items
  for (var i = 0; i < character.items.length; i++) {
    let item = character.items[i];
    // if the item exists
    if (item) {
      // if the item matches our query
      if (item.name == item_name && item.level == item_level) {
        // push the index to our array
        itemArray.push(i);
      }
    }
  }

  return itemArray;
}

function send_equip(receiver, item_name, item_level) {
  send_slot = locate_items(item_name, item_level)[0];
  send_item(receiver, send_slot);
  send_cm(receiver, { cmd: "sent_equip", item: item_name, level: item_level });
}
