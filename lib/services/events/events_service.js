// Events service wrapper.
// Purpose: expose stable events service APIs while legacy event domain remains in place.

const { joinFirstActiveEvent } = await require("../../domains/events/index.js");
const { validateJoinEventResult } =
  await require("../../contracts/events_api.js");

const joinFirstActiveEventService = async () => {
  const result = await joinFirstActiveEvent();
  return validateJoinEventResult(result);
};

module.exports = {
  joinFirstActiveEventService,
};
