let sell_dict = {
  merch_keep: [
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
    "elixirluck", // 'jacko',
    "seashell",
    "computer",
    "egg0",
    "egg1",
    "egg2",
    "egg3",
    "egg4",
    "egg5",
    "egg6",
    "egg7",
    "egg8",

    // CRAFTING
    "essenceoffire",
    "feather0",

    // EXCHANGE
    "gemo0",
    "candycane",
    "mistletoe",
    "basketofeggs",
    "offeringp",
    // 'candy1', 'candy0',
  ],
  farmer_keep: [
    "hpot0",
    "hpot1",
    "mpot0",
    "mpot1",
    "tracker",
    "luckbooster",
    "jacko",
    "mshield",
    "sshield", // ! TODO: block sending loadout gear in unpack code instead
    // 'egg0', 'egg1', 'egg2', 'egg3', 'egg4', 'egg5', 'egg6', 'egg7', 'egg8',
  ],
  low: [
    "hpamulet",
    "hpbelt",
    "wattire",
    "wcap",
    "wbreeches",
    "wgloves",
    "stinger",
    "cclaw",
    "ringsj",
    "vitearring",
  ],
  toMerch: ["ringsj", "gem0", "gem1", "seashell"],
  merchSell: [
    "coat1",
    "helmet1",
    "hpbelt",
    "hpamulet",
    "whiteegg",
    "smoke",
    "phelmet",
    "gphelmet",
    "pants1",
    "gloves1",
    "shoes1",
    "pmaceofthedead",
    "warmscarf",
    "snowball",
    "wcap",
    "wshoes",
    "spear",
    "pstem",
    "frogt",
    "bandages",
    "smush",
    "dstones",
    "lspores",
    "slimestaff",
    "stinger",
    "mushroomstaff",
    "iceskates",
    "sword",

    "epyjamas",
    "carrotsword",
    "xmassweater",
  ], // 'xmasshoes', 'xmashat', 'eears', 'eslippers',
  merchTradeSell: [],
};

function sell_extras() {
  merchantBot.full_sell();
  // index of item in inv
  for (let itemSlot in character.items) {
    // idx, 0-41
    let item = character.items[itemSlot];
    if (!item) continue;

    if (item.level && item.level > 3) continue;

    let itemName = item.name;
    // don't sell if not in list or is shiny
    if (!sell_dict["merchSell"].includes(itemName) || item.p || item.acc)
      continue;

    log(`selling ${itemName}`);
    if (item.q) {
      sell(itemSlot, item.q);
      continue;
    }
    if (sell_dict["merchSell"].includes(itemName) && item.level <= 2)
      sell(itemSlot);
  }
  setTimeout(sell_extras, 3000); //1440 * 1000
}

module.exports = {
  sell_dict,
  sell_extras,
};
