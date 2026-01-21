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

module.exports = {
  whitelist: inventoryWhitelist,
  blacklist: inventoryBlacklist,
};
