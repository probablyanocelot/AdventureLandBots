// Server-events service entrypoint.
// Purpose: expose server event APIs and runtime support for joinable events.

const eventsService = await require("./events_service.js");
const botPresence = await require("./bot_presence.js");
const eventTaskEmitter = await require("./event_task_emitter.js");
const joinFlow = await require("./join_flow.js");
const serverEventCatalog = await require("./server_event_catalog.js");

module.exports = Object.assign(
  {},
  eventsService,
  botPresence,
  eventTaskEmitter,
  serverEventCatalog,
  joinFlow,
);
