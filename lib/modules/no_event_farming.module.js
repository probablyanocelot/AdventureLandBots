const farmingModule = await require("./farming.module.js");

module.exports = {
  install: farmingModule?.install,
};
