// Events service wrapper.
// Purpose: expose stable events service APIs via service-owned implementation.

const { joinFirstActiveEvent } = await require("./join_flow.js");
const { broadcastCodeLoadedService } = await require("./broadcast_runtime.js");
const { isJoinableEvent, getActiveJoinableEvents } =
  await require("./active_event_catalog.js");
const { onCharacter, onGame, waitForCmBatch } = await require("./listeners.js");
const { createEventTaskEmitter } = await require("./event_task_emitter.js");
const { validateJoinEventResult } =
  await require("../../contracts/events_api.js");

const joinFirstActiveEventService = async () => {
  const result = await joinFirstActiveEvent();
  return validateJoinEventResult(result);
};

const runJoinEventModuleService = async () => {
  await joinFirstActiveEventService();
  return null;
};

const isJoinableEventService = (name) => isJoinableEvent(name);
const getActiveJoinableEventsService = () => getActiveJoinableEvents();

module.exports = {
  joinFirstActiveEventService,
  runJoinEventModuleService,
  broadcastCodeLoadedService,
  isJoinableEventService,
  getActiveJoinableEventsService,
  createEventTaskEmitter,
  onCharacter,
  onGame,
  waitForCmBatch,
};
