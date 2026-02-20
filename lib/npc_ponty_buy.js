const { itemsToBuy, shinyBlackList } = await require("./rule_buying.js");

saverBlackList = {
  ten_thousand: ["wgloves", "wshoes", "wattire", "wcap", "wbreeches"],
};

async function buyFromPonty() {
  // Set up the handler
  let itemsBought = 0;
  await parent.socket.once("secondhands", async function (data) {
    for (let d of data) {
      if (d.p) {
        game_log(`ITEM ${d.name} has ${d.p}!`);
        // don't buy junk shinies
        if (shinyBlackList.includes(d.name)) continue;

        // TODO: WHITELIST FOR LEVELLED SHINIES

        if (d.level == 0) {
          await parent.socket.emit("sbuy", { rid: d.rid }, 1);
        }
      }

      if (itemsToBuy.includes(d.name)) {
        if (
          G.itemsd[d.name].g * 1.2 > character.gold / 10000 &&
          saverBlackList.ten_thousand.includes(d.name)
        ) {
          game_log(
            `NOT BUYING ${d.name} because it's in the saver black list!`,
          );
          continue;
        }
        if (d.level) {
          if (d.level == 0) {
            game_log(`BUY ${d.name}!`);
            // We want this item based on our list
            await parent.socket.emit("sbuy", { rid: d.rid }, 1);
          }
        } else {
          game_log(`BUY ${d.name}!`);
          // We want this item based on our list
          await parent.socket.emit("sbuy", { rid: d.rid }, 1);
        }
      } else {
        continue;
        //game_log(`DON'T BUY ${d.name}!`)
      }
    }
  });

  // Attempt to buy stuff
  await parent.socket.emit("secondhands");
}

module.exports = { buyFromPonty };
