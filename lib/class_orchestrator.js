// Orchestrator: event-driven coordination (join-first) + merchant assist + optional mage swap.

const { getConfig } = await require("./al_config.js");
const { createEventTaskEmitter } = await require("./event_tasks.js");
const { sleepMs } = await require("./fn_time.js");
const { info, warn } = await require("./al_debug_log.js");
const { onCharacter, waitForCmBatch } = await require("./event_listeners.js");
const { is_friendly } = await require("./group_party.js");
const { isGathering } = await require("./st_bool.js");
const { getActiveNames } = await require("./group_party.js");
const { ensureCharacterRunningBySwap } = await require("./group_swap.js");

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
    const active = getActiveNames();
    return active || [character.name];
  } catch {
    return [character.name];
  }
};

const getItemSlots = (name) => {
  const slots = [];
  try {
    const items = character.items || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || item.name !== name) continue;
      const qty = item.q ? item.q : 1;
      slots.push({ slot: i, qty });
    }
  } catch {
    // ignore
  }
  return slots;
};

const getItemQty = (name) => {
  try {
    return getItemSlots(name).reduce((sum, s) => sum + s.qty, 0);
  } catch {
    return 0;
  }
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
    this._installListeners();

    // Start event monitoring.
    this._emitter.install();

    // Main loop.
    this._loop();
  }

  _installListeners() {
    // Listen for unpack requests from farmers.
    onCharacter("cm", (m) => {
      if (!m || !is_friendly(m.name)) return;
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
  }

  _waitForCmBatch({ expectedNames, taskId, cmd, timeoutMs = 5000 } = {}) {
    return waitForCmBatch({ expectedNames, taskId, cmd, timeoutMs });
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
    const results = await this._waitForCmBatch({
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

          if (req.pots && req.from) {
            await this._sendRequestedPots(req.from, req.pots);
          }
        }
      } else {
        // Merchant can join or no event: just move to farmer and signal arrival.
        if (isGathering()) {
          info("Skipping unpack move while gathering", req.loc);
        } else {
          try {
            await smart_move(req.loc);
          } catch (e) {
            warn("Merchant failed to smart_move to unpack loc", e);
          }
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

        if (req.pots && req.from) {
          await this._sendRequestedPots(req.from, req.pots);
        }
      }
    } finally {
      this._busy = false;
    }
  }

  async _sendRequestedPots(to, pots) {
    if (!to || !pots) return;

    const deliver = async (name, qty) => {
      const count = Number(qty || 0);
      if (!name || count <= 0) return;

      try {
        const have = getItemQty(name);
        if (have < count) {
          try {
            await buy(name, count - have);
          } catch {
            // ignore
          }
        }

        let remaining = count;
        const slots = getItemSlots(name);
        for (const { slot, qty: slotQty } of slots) {
          if (remaining <= 0) break;
          const sendQty = Math.min(remaining, slotQty);
          try {
            send_item(to, slot, sendQty);
            remaining -= sendQty;
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    };

    await deliver(pots.h?.type, pots.h?.qty);
    await deliver(pots.m?.type, pots.m?.qty);
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
    await this._waitForCmBatch({
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

    const mageName = cfg.mageName;
    if (!mageName) return;

    const result = await ensureCharacterRunningBySwap({
      targetName: mageName,
      codeSlotOrName: cfg.mageSwap.codeSlotOrName,
      swapPriorityList: cfg.mageSwap?.swapPriorityList,
      label: "mage",
      timeoutMs: 30000,
    });

    if (!result.ok && result.reason === "no-sub-out") {
      warn("No eligible character to swap out for mage");
    }
  }
}

module.exports = {
  Orchestrator,
};
