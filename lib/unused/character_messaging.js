character.on("cm", async (m) => {
  if (!is_friendly(m.name)) return;
  let data = m.message;

  if (!data.cmd) return;

  switch (data.cmd) {
    case "clear":
      switch (character.ctype) {
        case "merchant":
          merchantBot.clear_current_action();
          break;
        default:
          char.clear_current_action();
          break;
      }
      break;
  }
});

module.exports = {};
