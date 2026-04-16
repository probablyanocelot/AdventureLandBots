// Runtime listeners service wrapper.
// Purpose: separate generic onCharacter/onGame/CM wait helpers from server-event service ownership.

const runtimeListeners = await require("../events/listeners.js");

module.exports = runtimeListeners;
