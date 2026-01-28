function send_equip(receiver, item_name, item_level) {
  send_slot = locate_items(item_name, item_level)[0];
  send_item(receiver, send_slot);
  send_cm(receiver, { cmd: "sent_equip", item: item_name, level: item_level });
}

module.exports = { send_equip };
