// Server-events service alias.
// Purpose: begin decoupling the legacy events service into a clearer server-event boundary.

const serverEvents = await require("../events/index.js");

module.exports = serverEvents;
