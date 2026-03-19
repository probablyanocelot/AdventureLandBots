// Events service wrapper.
// Purpose: expose stable events service APIs via service-owned implementation.

const { joinFirstActiveEvent } = await require("./join_flow.js");
const { isJoinableEvent, getActiveJoinableEvents } =
  await require("./active_event_catalog.js");
const { validateJoinEventResult } =
  await require("../../contracts/events_api.js");

const joinFirstActiveEventService = async () => {
  const result = await joinFirstActiveEvent();
  return validateJoinEventResult(result);
};

const isJoinableEventService = (name) => isJoinableEvent(name);
const getActiveJoinableEventsService = () => getActiveJoinableEvents();

module.exports = {
  joinFirstActiveEventService,
  isJoinableEventService,
  getActiveJoinableEventsService,
};
