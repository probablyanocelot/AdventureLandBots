// import all the modules to make them available
// require("./farming");
// require("./hotkeys");
// require("./pvp");
// require("./proxied_require");
// require("./sustain");
// require("./targeting");
// require("./timing");
// require("./traveling");
// require("./merchant");

// start the appropriate bot based on character class
async function start() {
  const { idler } = await require("./idle.js");
  idler.run();

  switch (character.ctype) {
    case "merchant":
      const { MerchantBot } = await require("./merchant");
      const merchantBot = new MerchantBot();
      merchantBot.init();

      break;
    case "warrior":
      const { WarriorBot } = await require("./warrior");
      const warriorBot = new WarriorBot();
      warriorBot.init();
      break;
    case "priest":
      const { PriestBot } = await require("./priest");
      const priestBot = new PriestBot();
      priestBot.init();
      break;
    case "ranger":
      const { RangerBot } = await require("./ranger");
      const rangerBot = new RangerBot();
      rangerBot.init();
      break;
    case "mage":
      const { MageBot } = await require("./mage");
      const mageBot = new MageBot();
      mageBot.init();
      break;
    case "paladin":
      const { PaladinBot } = await require("./paladin");
      const paladinBot = new PaladinBot();
      paladinBot.init();
      break;
    case "rogue":
      const { RogueBot } = await require("./rogue");
      const rogueBot = new RogueBot();
      rogueBot.init();
      break;
  }
}

module.exports = { start };
