let lastBankUpdate = false;
let bankUpdateTime = 1000 * 60 * 15; // sec_to_ms * num_seconds * num_minutes

async function bankUpdate() {
  // pass if not due for update or smart.moving
  if (smart.moving) return;
  if (lastBankUpdate && new Date() - lastBankUpdate < bankUpdateTime) return;

  if (!character.bank) await smart_move("bank");

  // bank dumps compoundables
  await merchantBot.dumpIfNot(isUpgradable);
  // await merchantBot.dumpIfNot(isCompoundable)
  getCompoundables();
  // await merchantBot.dumpIfNot(isCompoundable)
  lastBankUpdate = new Date();
}
async function bank() {
  // TODO move to travelling or something and refactor
  if (this.current_action != "banking") this.clear_current_action();
  this.set_current_action("banking");
  if (!smart.moving) await this.doBank();
  this.clear_current_action();
  // if (character.bank && !smart.moving) await smart_move(this.home)
  return;
}

async function doBank() {
  if (!character.bank && this.current_action == "banking" && !smart.moving) {
    await smart_move("bank");
  }
  if (character.bank) {
    if (character.esize <= 3) await this.crumbDump();
    await this.dumpIfNot(isUpgradable);
    dumpPvp();
    // await this.dumpIfNot(isUpgradable, isCompoundable)
    getCompoundables();
    // await smart_move(this.home)
  }
  this.clear_current_action();

  //			for (let item in character.bank.items2) {
  //				if (!character.bank.items2[item]) continue;
  //				bank_retrieve("items2", item);
  //		}
}
async function dumpIfNot(condition1, condition2) {
  if (!condition1) return;
  if (!character.bank) await doBank();
  for (let idx in character.items) {
    let item = character.items[idx];
    if (!item) continue;

    let itemName = item.name;
    if (condition1(itemName)) continue;
    if (condition2 && condition2(itemName)) continue;

    // if (!isUpgradable(itemName) && !isCompoundable(itemName) && !sell_dict['keep'].includes(itemName)) bank_store(idx);
    if (!sell_dict["merch_keep"].includes(itemName) && itemName != "ringsj")
      bank_store(idx);
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
