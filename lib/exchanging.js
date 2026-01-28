function doExchange() {
  // dont do if there's something else going on
  if (this.current_action || this.thinking || character.bank) return; // && this.current_action != 'exchange' ||
  if (character.esize == 1) return;

  if (!parent.character.q.exchange) this.exchange = false;

  let exchangeItems = [
    "basketofeggs",
    "goldenegg",
    "gem0",
    "weaponbox",
    "armorbox",
    "candy0",
    "candy1",
    "candycane",
    "greenenvelope",
    "seashell",
    "mistletoe",
  ];

  let hasExchangeable = false;
  for (let idx in exchangeItems) {
    if (locate_item(exchangeItems[idx]) > -1) {
      // don't go exchanging waterfalls, we need more shells first!
      if (exchangeItems[idx] == "seashell" && quantity("seashell") < 500)
        continue;
      hasExchangeable = true;
    }
  }

  if (!hasExchangeable) {
    this.exchange = false; // if (this.current_action == 'exchange')  this.clear_current_action()
    return;
  }

  if (smart.moving) log("Going to exchange");

  if (locate_item("seashell") > -1 && quantity("seashell") >= 500)
    exchangeCoordinates = find_npc("fisherman");
  if (locate_item("computer") < 0) {
    if (
      !smart.moving &&
      character.x != exchangeCoordinates.x &&
      character.y != exchangeCoordinates.y
    )
      smart_move(exchangeCoordinates);
  }
  // if (this.current_action != "exchange") this.set_current_action("exchange");

  // if( character.x != exchangeCoordinates.x && character.y != exchangeCoordinates.y) return
  if (!hasExchangeable) return; // || !this.exchange

  if (character.esize == 0) {
    log("No Space");
    // this.clear_current_action();
    this.exchange = false;
    // clearInterval(exchangeInterval);
  }

  for (let idx in exchangeItems) {
    let item = locate_item(exchangeItems[idx]);
    if (item > -1) {
      hasExchangeable = true;
      if (!parent.character.q.exchange) {
        exchange(item);
        this.exchange = true;
      }
    }
  }

  if (!hasExchangeable) {
    log("Exchangeable clear");
    // this.clear_current_action();
    // clearInterval(exchangeInterval);
    this.exchange = false;
  }
}
