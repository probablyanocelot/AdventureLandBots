// Events service contract helpers.
// Purpose: keep stable API shapes while events implementation migrates.

const validateJoinEventResult = (result) => {
  if (result == null) return result;
  if (typeof result !== "object") {
    throw new TypeError(
      "Join-event service contract violation: expected object result",
    );
  }

  if (typeof result.ok !== "boolean") {
    throw new TypeError(
      "Join-event service contract violation: expected boolean result.ok",
    );
  }

  return result;
};

module.exports = {
  validateJoinEventResult,
};
