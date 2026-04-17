// TODO: setup/move eligible constraints to cfg & import, etc
// TODO: constraint examples: gold<safeAmount, gold>threshold, character.isize, etc
let massProductionRoutineImport;
let constraintsImport;

const isCompoundable = (itemName) => {
  if (!G.items[itemName].compound) return; // TODO: check logic here
  return true;
};

const canCompound = (itemName) => {
  if (isUpBlacklisted(itemName)) return;
  if (!isCompoundable(itemName)) return;
  constraintsImport;
  return true;
};

const doCompound = (itemName) => {
  if (!canCompound(itemName)) return;
  massProductionRoutineImport;
  compound(G.items[itemName]);
};

module.exports = {
  isCompoundable,
  canCompound,
  doCompound,
};
