// TODO separate upgrading and compounding into different files
let upBlackList = {
  2: ["vitring", "talkingskull"],
};
let upWhiteList = {
  upgrade_all: [
    "xmaspants",
    "xmashat",
    "xmasshoes", // 'xmassweater',
    "eslippers",
    "eears", // "epyjamas", "stinger", "swifty",
    "mittens",

    "wattire",
    "wbreeches",
    "wgloves",
    "wshoes",
    "wcap",
    "hbow",
    "sshield",
    "quiver",
    "cclaw",

    "ololipop",
    "glolipop",
    "broom",
    "wingedboots",
  ],
  high_upgrade_all: [
    // 'xmasshoes', 'xmaspants', 'xmassweater',
    // "quiver", "xmashat", "epyjamas", "eears",

    "ecape",
    "ornamentstaff",
    // 'staffofthedead', 'swordofthedead', // 'pmaceofthedead',
    "daggerofthedead", // 'bowofthedead', 'maceofthedead',
    "candycanesword",
    "bowofthedead",

    "oozingterror",
    "harbringer",
    "basher",
    "pinkie",
    "t2bow",
    "merry",
    "firestaff",
    "fireblade",
    "bataxe",
    "dagger",
    "tigerhelmet",
    "tigershield",
    "xmace",

    "firestars",
    "snowflakes",

    "hpants",
    "hgloves",
    "fierygloves",
    "pmace",
  ],
  compound: [
    "intamulet",
    "intring",
    "intbelt",
    "intearring",
    "strring",
    "strearring",
    "stramulet",
    "strbelt",
    "dexamulet",
    "dexring",
    "dexbelt",
    "dexearring",
    "skullamulet",
    "book0",
    "hpamulet",
    "hpbelt",
    "ringsj",
    "wbook0",
    "vitring",
    "jacko",
    "talkingskull",
    "vitearring",
    "rednose",
    "santasbelt",
    //'lantern',
  ],
};

function isUpgradable(itemName) {
  if (G.items[itemName].upgrade) return true;
  return false;
}

function isCompoundable(itemName) {
  if (G.items[itemName].compound) return true;
  return false;
}

function buy_compound_scroll(scrollSlot, COMPOUND_SCROLL) {
  // TODO: modularize for all scroll types
  if (!character.items[scrollSlot]) {
    buy_with_gold(COMPOUND_SCROLL);
  }
}

function doCompound(item_name) {
  let COMPOUND_SCROLL = "cscroll0";

  let scrollSlot = locate_item(COMPOUND_SCROLL);
  // buy scroll if not in inventory

  let levelArray = [0, 1, 2, 3];
  for (let level in levelArray) {
    // limited level 3 support
    // if (level == 3 && item_name != 'ringsj') continue

    // get a list of items
    let itemIdxList = locate_items(item_name, level);
    for (idx in itemIdxList) {
      if (!character.items[idx]?.p) continue;
      if (character.items[idx].p != "shiny") {
        // compoundAlert = new Date()
        // send_tg_bot_message(`Found a ${itemList[item].p} ${item_name}`)
        return;
      }
    }
    if (itemIdxList.length >= 3) {
      // check if need different scroll
      if (level == 3 || item_grade(character.items[itemIdxList[0]]) == 1) {
        COMPOUND_SCROLL = "cscroll1";
      }
      scrollSlot = locate_item(COMPOUND_SCROLL);
      buy_compound_scroll(scrollSlot, COMPOUND_SCROLL);

      if (item_name == "vitring" && level == 2) {
        continue;
      }

      // do the compound
      if (!parent.character.q.compound) {
        if (
          character.ctype == "merchant" &&
          character.mp > 400 &&
          !character.s.massproductionpp
        )
          use_skill("massproductionpp");
        compound(itemIdxList[0], itemIdxList[1], itemIdxList[2], scrollSlot);
      }
    }
  }
}
let compoundAlert;

function canUpgrade() {
  if (parent.character.q.upgrade) return; // currently upgrading
  return true;
}

function doUpgrade(scrollType, itemIndex) {
  scrollSlot = locate_item(scrollType);
  if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1);

  if (
    character.ctype == "merchant" &&
    !character.s.massproductionpp &&
    character.mp > 400
  )
    use_skill("massproductionpp");
  if (canUpgrade) upgrade(itemIndex, scrollSlot);
}

function upgrade_replacement() {
  let TIMEOUT = 1000;
  let maxLevel = 8;
  for (let level = 0; level <= maxLevel; level++) {
    for (let itemIndex in character.items) {
      let item = character.items[itemIndex];
      if (!item || item.level != level) continue;

      let itemName = item.name;
      if (itemName == "rod" || itemName == "pickaxe") continue;

      if (!isUpgradable(itemName)) continue;

      let grade = item_grade(item);
      if (item.p && item.p != "shiny") continue;
      if (item.ps || item.acc || item.ach) continue;
      if (item.p && grade >= 1) continue;
      if (grade == 0) {
        doUpgrade("scroll0", itemIndex);
      }
      if (grade == 1 && item.level < 7) {
        doUpgrade("scroll1", itemIndex);
      }
      if (grade == 1 && item.level >= 7) {
        doUpgrade("scroll2", itemIndex);
      }
      if (grade == 2 && item.level < 8) {
        doUpgrade("scroll2", itemIndex);
      }
      if (grade == 2 && item.level >= 8) continue;
    }
  }
  setTimeout(upgrade_replacement, TIMEOUT);
}

let last_shiny_alert;

function upgrade_all() {
  let TIMEOUT = 1000;

  let itemList = upgradeDict.upgrade_all; // array

  let scrollType = "scroll0";
  let scrollSlot = locate_item(scrollType);

  for (let idx in itemList) {
    let itemName = itemList[idx];
    for (let level = 0; level < 8; level++) {
      // get idx of each matching item
      // [...3, 19, 23]
      let itemSlots = locate_items(itemName, level);

      for (let listIndex in itemSlots) {
        let itemIndex = itemSlots[listIndex];

        let item = character.items[itemIndex];
        if (!item) continue;
        let itemName = item.name;

        // buy scroll if not in character.items
        if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1);

        // get item grade
        let grade = item_grade(item);

        // non-shiny .p : skip
        if (item.p && item.p !== "shiny") {
          if (is_off_timeout(last_shiny_alert, 3000)) {
            log(`${itemName} has ${item.p}`);
            continue;
          }
        }

        let shinyKeep = ["ololipop", "wingedboots", "broom"];
        // valuable shiny : skip
        if (item.p && shinyKeep.includes(item.name)) {
          if (!is_off_timeout(last_shiny_alert, 4000)) continue;
          last_shiny_alert = new Date();
          log(`keeping ${item.p} ${itemName}`);
          continue;
        }
        // achievement : skip
        if (item.acc) {
          log(`${itemName} has some ${item.acc}`);
          continue;
        }

        // level 8   :   skip
        if (grade == 2 || item.level >= 8) continue;

        // merchantBot.goHomeIfIdle()

        // grade 1 or ( 0 & level 3-6 )
        if (
          (grade == 1 && item.level < 7) ||
          (grade == 0 && item.level >= 3 && item.level < 7)
        ) {
          log(
            `${itemName} grade: ${grade} level: ${item.level} -> ${
              item.level + 1
            }`,
          );

          scrollType = "scroll1";
          doUpgrade(scrollType, itemIndex);

          continue;
        }
        let conservativeUpList = ["ololipop", "broom"];

        // turn on to save money
        // if (item.level >= 6) continue

        // do 6 -> 7 -> 8 with scroll2
        if (
          item.level > 5 &&
          item.level < 8 &&
          !conservativeUpList.includes(itemName)
        ) {
          log(`${itemName} 7 -> 8`);

          scrollType = "scroll2";
          doUpgrade(scrollType, itemIndex);

          continue;
        }

        // upgrade if we got here

        if (itemName == "stinger" && item.level == 4 && !item.p)
          sell(itemIndex);
        if (
          character.ctype == "merchant" &&
          !character.s.massproductionpp &&
          character.mp > 400
        )
          use_skill("massproductionpp");

        if (canUpgrade) upgrade(itemIndex, scrollSlot);
      }
    }
  }
  setTimeout(upgrade_all, TIMEOUT);
}

// TODO: replace whitelists with if(upgradable && !blackList)?
function high_upgrade_all() {
  let TIMEOUT = 1000;
  let itemList = upgradeDict.high_upgrade_all;

  let scrollType = "scroll1";
  let maxLevel = 7;

  for (let level = 0; level < maxLevel; level++) {
    for (let idx in itemList) {
      let itemName = itemList[idx];
      let itemSlots = locate_items(itemName, level);

      for (let listIndex in itemSlots) {
        let itemIndex = itemSlots[listIndex];

        //let item = character.items[itemIndex]
        //let itemLevel = item.level

        // get item grade
        let grade = item_grade(character.items[itemIndex]);

        // if (character.items[itemIndex].level == 7){
        // 	scrollType = "scroll2";
        // 	scrollSlot = locate_item(scrollType)
        // 	if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1)
        // 	if (!parent.character.q.upgrade) {
        // 		if (character.ctype == "merchant" && !character.s.massproductionpp && character.mp > 400) use_skill("massproductionpp")
        //         upgrade(itemIndex, scrollSlot)
        //         break;
        // 	}
        // }

        // grade 1+ = +7
        if (grade == 0) {
          //|| itemName == "shoes1" && level >= 5
          log("grade is under 1");
          continue;
        }
        if (character.items[itemIndex] && character.items[itemIndex].p) {
          log("has some modifier");
          continue;
        }

        let rareUpList = ["bataxe", "harbringer", "oozingterror"];

        if (grade == 2 && level >= 6) continue;
        if (level >= 4 && rareUpList.includes(itemName)) {
          // save money
          // continue
          scrollType = "scroll2";
        }
        if (grade == 2 && level >= 6) continue;

        let scrollSlot = locate_item(scrollType);

        // buy scroll if not in inv
        if (!character.items[scrollSlot]) buy_with_gold(scrollType, 1);

        // upgrade if we got here
        if (!parent.character.q.upgrade) {
          if (
            character.ctype == "merchant" &&
            !character.s.massproductionpp &&
            character.mp > 400
          )
            use_skill("massproductionpp");
          upgrade(itemIndex, scrollSlot);
          break;
        }
      }
    }
  }

  setTimeout(high_upgrade_all, TIMEOUT);
}

module.exports = {
  upBlackList,
  upWhiteList,
  isUpgradable,
  isCompoundable,
  buy_compound_scroll,
  doCompound,
  canUpgrade,
  doUpgrade,
  upgrade_replacement,
  upgrade_all,
  high_upgrade_all,
};
