// Combat service wrapper.
// Purpose: expose stable service APIs while legacy combat domain remains in place.

const { installEventCombat } = await require("../../domains/combat/index.js");
const { validateEventCombatService } =
  await require("../../contracts/combat_api.js");

const createEventCombatService = ({ cfg } = {}) => {
  const inner = installEventCombat({ cfg });
  return validateEventCombatService(inner);
};

module.exports = {
  createEventCombatService,
};
