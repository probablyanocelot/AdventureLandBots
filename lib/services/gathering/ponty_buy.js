const { itemsToBuy, shinyBlackList } =
  await require("../../domains/gathering/buying_rules.js");

const saverBlackList = {
  ten_thousand: ["wgloves", "wshoes", "wattire", "wcap", "wbreeches"],
};

async function buyFromPonty() {
  await parent.socket.once("secondhands", async function (data) {
    for (let d of data) {
      if (d.p) {
        game_log(`ITEM ${d.name} has ${d.p}!`);
        if (shinyBlackList.includes(d.name)) continue;

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
            await parent.socket.emit("sbuy", { rid: d.rid }, 1);
          }
        } else {
          game_log(`BUY ${d.name}!`);
          await parent.socket.emit("sbuy", { rid: d.rid }, 1);
        }
      } else {
        continue;
      }
    }
  });

  await parent.socket.emit("secondhands");
}

module.exports = { buyFromPonty };
