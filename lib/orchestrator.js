// Orchestrator: event-driven coordination (join-first) + merchant assist + optional mage swap.

const { getConfig } = await require("./config.js");
const { createEventTaskEmitter } = await require("./tasks/event_tasks.js");
const { sleepMs } = await require("./util/time.js");
const { info, warn } = await require("./util/logger.js");

const makeTaskId = (prefix = "task") =>
  `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;

const getPartyMembers = () => {
  try {
    const p = parent?.party;
    if (p) {
      const names = Object.keys(p);
      if (!names.includes(character.name)) names.push(character.name);
      return names;
    }
  } catch {
    // ignore
  }
  try {
    const active = get_active_characters();
    return Object.keys(active || {});
  } catch {
    return [character.name];
  }
};

const waitForCmBatch = ({
  expectedNames,
  taskId,
  cmd,
  timeoutMs = 5000,
} = {}) => {
  return new Promise((resolve) => {
    const results = new Map();
    const done = () => {
      try {
        handler.delete = true;
      } catch {
        // ignore
      }
      resolve(results);
    };

    const handler = (m) => {
      try {
        if (!m || !m.name || !m.message) return;
        if (expectedNames && !expectedNames.includes(m.name)) return;
        if (cmd && m.message.cmd !== cmd) return;
        if (taskId && m.message.taskId !== taskId) return;
        results.set(m.name, m.message);
        if (expectedNames && results.size >= expectedNames.length) done();
      } catch {
        // ignore
      }
    };

    try {
      character.on("cm", handler);
    } catch {
      // ignore
    }

    setTimeout(done, Math.max(1, timeoutMs));
  });
};

class Orchestrator {
  constructor() {
    this.cfg = getConfig();
    this._activeEvent = null;
    this._merchantCanJoinEvent = true;
    this._busy = false;
    this._unpackRequest = null;

    this._emitter = createEventTaskEmitter({
      onStart: (task) => this._onEventStart(task),
      onEnd: (task) => this._onEventEnd(task),
      pollMs: 1000,
      filterJoinableOnly: true,
    });
  }

  async init() {
    // Listen for unpack requests from farmers.
    character.on("cm", async (m) => {
      if (!is_friendly(m.name)) return;
      const data = m.message;
      if (!data || !data.cmd) return;

      // A rework-friendly unpack request shape:
      // { cmd:"unpack:request", loc:{map,x,y}, pots?:{...}, reason?:"inventory" }
      if (data.cmd === "unpack:request") {
        this._unpackRequest = {
          from: m.name,
          requestId: data.requestId || null,
          loc: data.loc,
          pots: data.pots,
          at: Date.now(),
        };
        info("Received unpack request", this._unpackRequest);
      }

      if (data.cmd === "unpack:done") {
        try {
          info("Unpack completed", {
            from: m.name,
            requestId: data.requestId || null,
          });
        } catch {
          // ignore
        }
      }
    });

    // Start event monitoring.
    this._emitter.install();

    // Main loop.
    this._loop();
  }

  async _loop() {
    try {
      if (!this._busy && this._unpackRequest) {
        const req = this._unpackRequest;
        this._unpackRequest = null;
        await this._handleUnpackRequest(req);
      }
    } catch (e) {
      warn("Orchestrator loop error", e);
    }

    setTimeout(() => this._loop(), 500);
  }

  async _onEventStart(task) {
    // Only one active joinable event at a time for now.
    // If multiple happen, the last start wins.
    this._activeEvent = task;

    // Ask everyone (including merchant) to join; record whether merchant can.
    const taskId = makeTaskId("event");
    const members = getPartyMembers();
    const others = members.filter((n) => n !== character.name);

    info("Event start", task.name, "members", members);

    // Broadcast join request to others.
    for (const name of others) {
      try {
        await send_cm(name, { cmd: "task:join", event: task.name, taskId });
      } catch {
        // ignore
      }
      // small delay to avoid bursty CM behavior
      await sleepMs(30);
    }

    // Try joining locally (important because send_cm to self isn't reliable).
    let selfJoinResult = {
      cmd: "task:join_result",
      taskId,
      ok: true,
      result: true,
    };
    try {
      await join(task.name);
    } catch (e) {
      selfJoinResult = {
        cmd: "task:join_result",
        taskId,
        ok: false,
        result: e?.message || String(e),
      };
    }

    // Collect join results from others.
    const results = await waitForCmBatch({
      expectedNames: others,
      taskId,
      cmd: "task:join_result",
      timeoutMs: 6000,
    });
    results.set(character.name, selfJoinResult);

    // Since the orchestrator runs on the merchant, this tells us if the merchant can join.
    if (selfJoinResult.ok === false) {
      this._merchantCanJoinEvent = false;
      let reason = selfJoinResult.result;
      try {
        if (reason && typeof reason === "object") {
          reason = reason.error || JSON.stringify(reason);
        }
      } catch {
        // ignore
      }
      info("Merchant cannot join event", task.name, reason);
    } else {
      this._merchantCanJoinEvent = true;
    }

    // Done handling event start.
  }

  async _onEventEnd(task) {
    if (this._activeEvent && this._activeEvent.name === task.name) {
      info("Event ended", task.name);
      this._activeEvent = null;
      this._merchantCanJoinEvent = true;

      // Clear magiport expectations for party members.
      try {
        const members = getPartyMembers();
        for (const n of members) send_cm(n, { cmd: "magiport:clear" });
      } catch {
        // ignore
      }
    }
  }

  async _handleUnpackRequest(req) {
    if (!req || !req.loc) return;
    this._busy = true;
    const cfg = getConfig();
    const eventName = this._activeEvent?.name;

    try {
      // If we have an active joinable event and the merchant can join it, join first.
      if (eventName && this._merchantCanJoinEvent) {
        try {
          await join(eventName);
        } catch {
          // If join fails now, treat as cannot-join.
          this._merchantCanJoinEvent = false;
        }
      }

      if (eventName && !this._merchantCanJoinEvent) {
        // Merchant cannot join the event.
        // Per config: stay in main unless we explicitly need to be ported.
        if (cfg.merchantAssist?.whenCannotJoin === "stay_main") {
          info(
            "Merchant cannot join; requesting mage to port merchant to farmer",
            req.from,
          );
          await this._requestMagePortMerchantTo(req.loc);

          // Best-effort: after mage port attempt finishes, notify requester.
          // This prevents farmer-side requesters from spamming if the merchant can't join.
          try {
            send_cm(req.from, {
              cmd: "unpack:arrived",
              ok: true,
              ported: true,
              requestId: req.requestId || null,
              at: { map: character.map, x: character.x, y: character.y },
            });
          } catch {
            // ignore
          }
        }
      } else {
        // Merchant can join or no event: just move to farmer and signal arrival.
        try {
          await smart_move(req.loc);
        } catch (e) {
          warn("Merchant failed to smart_move to unpack loc", e);
        }

        try {
          send_cm(req.from, {
            cmd: "unpack:arrived",
            ok: true,
            requestId: req.requestId || null,
            at: { map: character.map, x: character.x, y: character.y },
          });
        } catch {
          // ignore
        }
      }
    } finally {
      this._busy = false;
    }
  }

  async _requestMagePortMerchantTo(loc) {
    const cfg = getConfig();
    const mageName = cfg.mageName;
    if (!mageName) return;

    // Ensure mage is available; if swap mode isn't configured, we just try to message it.
    await this._ensureMageRunning();

    const taskId = makeTaskId("unpack");
    const task = { target: loc };

    try {
      await send_cm(mageName, {
        cmd: "mage:magiport",
        taskId,
        task,
        // Port the merchant (this character) to the mage.
        targets: [character.name],
        // Force bypass joinable-event and nearby skip.
        force: true,
        ttlMs: 15000,
      });
    } catch (e) {
      warn("Failed to send mage:magiport to mage", e);
      return;
    }

    // Wait for mage result (best-effort)
    await waitForCmBatch({
      expectedNames: [mageName],
      taskId,
      cmd: "mage:magiport_result",
      timeoutMs: 20000,
    });
  }

  async _ensureMageRunning() {
    const cfg = getConfig();
    if (!cfg.mageSwap?.enabled) return;
    if (!cfg.mageSwap.codeSlotOrName) {
      warn(
        "mageSwap enabled but mageSwap.codeSlotOrName is not set; cannot auto-start mage",
      );
      return;
    }

    let active;
    try {
      active = get_active_characters();
    } catch {
      return;
    }

    const mageName = cfg.mageName;
    if (!mageName) return;

    // If mage is already running, nothing to do.
    if (
      active &&
      active[mageName] &&
      active[mageName] !== "starting" &&
      active[mageName] !== "loading"
    ) {
      return;
    }

    // Pick a character to swap out.
    const subOut = this._pickSubOut(active);
    if (!subOut) {
      warn("No eligible character to swap out for mage");
      return;
    }

    info("Swapping out", subOut, "to start mage", mageName);
    try {
      stop_character(subOut);
      await sleepMs(500);
    } catch {
      // ignore
    }

    try {
      await start_character(mageName, cfg.mageSwap.codeSlotOrName);
    } catch (e) {
      warn("Failed to start mage character", e);
      return;
    }

    // Wait for mage to reach code mode.
    const start = Date.now();
    while (Date.now() - start < 30000) {
      try {
        const st = get_active_characters();
        if (
          st &&
          st[mageName] &&
          (st[mageName] === "code" || st[mageName] === "active")
        )
          break;
      } catch {
        // ignore
      }
      await sleepMs(500);
    }
  }

  _pickSubOut(active) {
    const cfg = getConfig();
    const mageName = cfg.mageName;
    const candidates = Object.keys(active || {}).filter(
      (n) => n !== character.name && n !== mageName && active[n] !== "self",
    );

    if (!candidates.length) return null;

    const pref = cfg.mageSwap?.swapPriorityList;
    if (Array.isArray(pref) && pref.length) {
      for (const name of pref) {
        if (candidates.includes(name)) return name;
      }
    }

    // Default: first candidate.
    return candidates[0];
  }
}

module.exports = {
  Orchestrator,
};
