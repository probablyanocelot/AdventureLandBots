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
  // Always start the idle monitor.
  const { Idle } = await require("./idle.js");
  const idler = new Idle();
  idler.run();

  switch (character.ctype) {
    case "merchant": {
      // Current implementation exports `Merchant` (extends BotCharacter).
      const { Merchant } = await require("./merchant");
      const merchantBot = new Merchant();
      if (typeof merchantBot.init === "function") await merchantBot.init();
      if (typeof merchantBot.botLoop === "function") merchantBot.botLoop();
      else console.log("Merchant bot loaded, but no botLoop() found.");

      break;
    }
    default:
      console.log(
        `No class bot is implemented for ctype='${character.ctype}'. Idle monitor is running.`,
      );
  }
}

// Adventure Land loader convention expects a `main` function.
// Keep `start` as an alias for older callers.
async function main() {
  return start();
}

module.exports = { start, main };
