// Combat service wrapper.
// Purpose: expose stable service APIs via service-owned implementation.

const { installEventCombat } = await require("./event_combat_runtime.js");
const { runMageSupport, runPriestSupport } =
  await require("./support_runner.js");
const { validateEventCombatService } =
  await require("../../contracts/combat_api.js");

const createEventCombatModuleService = ({ cfg } = {}) => {
  const inner = installEventCombat({ cfg });
  return validateEventCombatService(inner);
};

module.exports = {
  createEventCombatModuleService,
  runMageSupport,
  runPriestSupport,
};
