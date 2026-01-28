function dumpPvp() {
  for (let item in character.items) {
    if (!character.items[item]) continue;
    if (character.items[item].hasOwnProperty("v")) {
      bank_store(item);
    }
  }
}
