let inventoryWhitelist = [
  "hpot0",
  "hpot1",
  "mpot0",
  "mpot1",
  "stand0",
  "tracker",
  "rod",
  "pickaxe",
  "offering",
  "scroll0",
  "scroll1",
  "scroll2",
  "cscroll0",
  "cscroll1",
  "cscroll2",
  "elixirluck",
  "computer",
];
let inventoryBlacklist = ["hpamulet", "hpbelt"];
// TODO
// setup character and ctype specific whitelists / blacklists
let merch_inventoryWhitelist = [
  "seashell",
  "egg0",
  "egg1",
  "egg2",
  "egg3",
  "egg4",
  "egg5",
  "egg6",
  "egg7",
  "egg8",
  "essenceoffire",
  "feather0",
  "gemo0",
  "candycane",
  "mistletoe",
  "basketofeggs",
  "offeringp",
];
let famer_inventoryWhitelist = [];
let merch_inventoryBlacklist = [];
let farmer_inventoryBlacklist = [];

function getItemAndSlot(itemName) {
  let invSlot = locate_item(itemName);
  if (!invSlot) return false;
  let item = character.items[invSlot];
  if (!item) return false;

  return { item: item, slot: invSlot };
  // {
  // 		item: {name: 'broom', level: 2},
  //	 	slot: 2
  // }
}
function equipItem(itemName, eqSlot) {
  let itemAndSlot = this.getItemAndSlot(itemName);
  if (!itemAndSlot) return;

  // access object's item & slot
  let { item: item, slot: invSlot } = itemAndSlot;

  // declarations
  let invName = item.name;
  let invlevel = item.level;
  let eqItem = character.slots[eqSlot];

  // nothing equipped, equip item
  if (!eqItem) {
    equip(invSlot);
    return;
  }

  // access equipped's name & level
  let { name: eqName, level: eqLevel } = eqItem;

  // don't EQ if ours is better
  if (eqName == invName && eqLevel > invlevel) return;
  // do EQ if wearing different item
  equip(invSlot);
}

function full_sell() {
  if (this.current_action != "unpacking") return;
  if (character.esize > 0) return; // only do if full
  if (!hasItem("ringsj")) return; // has items to sell
  let ringsj_array = locate_items("ringsj", 0); // array of items slot position
  if (ringsj_array.length < 1) ringsj_array = locate_items("ringsj", 1);
  if (ringsj_array.length < 1) ringsj_array = locate_items("ringsj", 2);
  if (ringsj_array.length < 1) ringsj_array = locate_items("ringsj", 3);
  for (let idx of ringsj_array) {
    sell(idx);
  }
}
async function crumbDump() {
  // quick, dirty solution to full character.
  if (!character.bank) await doBank();
  for (let idx in character.items) {
    let item = character.items[idx];
    if (!item) continue;

    let itemName = item.name;

    // if not in keep dict, or is shiny, or is upgradable and level > 4 then store
    if (item.l) continue; // locked
    if (sell_dict["merch_keep"].includes(itemName)) continue; // keep dict
    if (isUpgradable(itemName) && item.level < 5 && !item.p) continue; // upgrade non-shinys

    bank_store(idx);
  }
}

//
//

module.exports = {
  whitelist: inventoryWhitelist,
  blacklist: inventoryBlacklist,
};
