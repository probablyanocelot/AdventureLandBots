function notifyExternal(message) {
  // This external helper lives outside the core runtime.
  // It can invoke a webhook, write a migration log, or trigger an external tool.
  console.log("[agentic] external notification:", message);
}

module.exports = { notifyExternal };
