// TODO: setup/move eligible constraints to cfg & import, etc
// TODO: constraint examples: gold<safeAmount, gold>threshold, character.isize, etc
let massProductionRoutineImport;
let constraintsImport;

const isUpgradable = (itemName) => {
  if (!G.items[itemName].upgrade) return; // TODO: check logic here
  return true;
};

const canUpgrade = (itemName) => {
  if (isUpBlacklisted(itemName)) return;
  if (!isUpgradable(itemName)) return;
  constraintsImport;
  return true;
};

const doUpgrade = (itemName) => {
  if (!canUpgrade(itemName)) return;
  massProductionRoutineImport;
  upgrade(G.items[itemName]);
};

module.exports = {
  isUpgradable,
  canUpgrade,
  doUpgrade,
};
