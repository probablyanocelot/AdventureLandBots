// Blocker Tracker Service
// Purpose: Accumulate engagement blockers during a hunt tick and emit consolidated diagnosis.
// Use: Create instance per hunt cycle, add blockers, then emit summary at end.

class BlockerTracker {
  constructor({ target, character } = {}) {
    this.target = target;
    this.character = character;
    this.blockers = [];
    this.startTime = Date.now();
  }

  /**
   * Record a blocker reason with priority tier and optional data.
   * priority: critical (returns early), high, medium, low (late-stage guards)
   */
  add({
    reason,
    priority = "medium",
    debugKey = null,
    message = null,
    data = null,
  } = {}) {
    if (!reason) return;
    this.blockers.push({
      reason,
      priority,
      debugKey,
      message,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get the highest-priority blocker that fired.
   * Priority order: critical > high > medium > low
   */
  getPrimaryBlocker() {
    if (!this.blockers.length) return null;

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return this.blockers
      .slice()
      .sort(
        (a, b) =>
          (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99),
      )[0];
  }

  /**
   * Emit consolidated blocker event for telemetry/debug.
   * Returns structured object for logging.
   */
  emit(telemetryFn = null) {
    if (!this.blockers.length) return null;

    const primary = this.getPrimaryBlocker();
    const result = {
      target: this.target,
      character: this.character,
      totalBlockers: this.blockers.length,
      primaryReason: primary.reason,
      primaryPriority: primary.priority,
      primaryDebugKey: primary.debugKey,
      primaryMessage: primary.message,
      blockerSummary: this.blockers.map((b) => ({
        reason: b.reason,
        priority: b.priority,
        key: b.debugKey,
      })),
      elapsedMs: Date.now() - this.startTime,
    };

    if (typeof telemetryFn === "function") {
      try {
        telemetryFn({
          type: "combat:hunt_blocker",
          module: "hunt_runner",
          ...result,
        });
      } catch {
        // ignore telemetry errors
      }
    }

    return result;
  }

  /**
   * Utility: check if a specific blocker type was recorded.
   */
  has(reason) {
    return this.blockers.some((b) => b.reason === reason);
  }

  /**
   * Clear blockers (for reuse or testing).
   */
  reset() {
    this.blockers = [];
  }
}

module.exports = {
  BlockerTracker,
};
