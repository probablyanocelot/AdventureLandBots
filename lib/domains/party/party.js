// Party domain helpers and auto-party installer.
// Purpose: expose active roster helpers and maintain trusted party invite/request behavior.
// Inputs: character list (`get_characters`), party state, optional config.
// Side effects: may set global party handlers and send party invites on loop.
// Cleanup: installer returns disposable that restores handlers and clears timer.

const { getRosterNames, getRosterMeta } = await require("../../fn_roster.js");
const { warn, logCatch } = await require("../../al_debug_log.js");

const normalizeCtype = (obj) => obj?.ctype || obj?.class || obj?.type || null;

const getActiveCharacters = () => {
  try {
    const chars = get_characters();
    if (!Array.isArray(chars)) return [];

    return chars
      .filter((c) => Number(c?.online || 0) > 0 && c?.name)
      .map((c) => {
        const ctype = normalizeCtype(c);
        return {
          name: c.name,
          ctype,
          online: Number(c?.online || 0),
          isMerchant: ctype === "merchant",
          isFarmer: Boolean(ctype && ctype !== "merchant"),
        };
      });
  } catch (e) {
    logCatch("getActiveCharacters failed", e);
    return [];
  }
};

const getActiveNames = () => {
  return getActiveCharacters().map((c) => c.name);
};

const getActiveTypeCounts = () => {
  const active = getActiveCharacters();
  const merchant = active.filter((c) => c.isMerchant).length;
  const farmer = active.filter((c) => c.isFarmer).length;
  return {
    merchant,
    farmer,
    total: active.length,
  };
};

function is_friendly(char_name) {
  //check if it's one of the accounts characters
  for (const char of get_characters()) {
    if (char.name === char_name) {
      return true;
    }
  }

  return false;
}

const isTrustedPartyName = (name, roster = []) => {
  if (!name) return false;
  try {
    if (is_friendly(name)) return true;
  } catch {
    // ignore
  }

  if (Array.isArray(roster) && roster.includes(name)) return true;

  try {
    const active = getActiveNames();
    if (active.includes(name)) return true;
  } catch (e) {
    logCatch("isTrustedPartyName active check failed", e);
  }

  return false;
};

const pickLeader = (roster, meta) => {
  const active = getActiveNames();
  const ordered = active.length ? active : roster;

  for (const name of ordered) {
    const ctype = meta.get(name)?.ctype;
    if (!ctype) continue;
    if (ctype === "ranger" || ctype === "merchant") continue;
    return name;
  }

  return ordered[0] || roster[0] || character.name;
};

const installAutoParty = ({ _cfg } = {}) => {
  const st = {
    stopped: false,
    lastInviteAt: new Map(),
    timer: null,
    prevOnPartyInvite: null,
    prevOnPartyRequest: null,
  };

  const stop = () => {
    st.stopped = true;

    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;

    // Restore previous global handlers if they are still ours.
    try {
      if (globalThis.on_party_invite === st._onPartyInviteHandler) {
        globalThis.on_party_invite = st.prevOnPartyInvite;
      }
    } catch {
      // ignore
    }

    try {
      if (globalThis.on_party_request === st._onPartyRequestHandler) {
        globalThis.on_party_request = st.prevOnPartyRequest;
      }
    } catch {
      // ignore
    }
  };

  try {
    st.prevOnPartyInvite = globalThis.on_party_invite;
    st.prevOnPartyRequest = globalThis.on_party_request;

    st._onPartyInviteHandler = (name) => {
      try {
        if (isTrustedPartyName(name)) accept_party_invite(name);
      } catch (e) {
        logCatch("on_party_invite failed", e);
      }
    };

    st._onPartyRequestHandler = (name) => {
      try {
        if (isTrustedPartyName(name)) accept_party_request(name);
      } catch (e) {
        logCatch("on_party_request failed", e);
      }
    };

    globalThis.on_party_invite = st._onPartyInviteHandler;
    globalThis.on_party_request = st._onPartyRequestHandler;
  } catch {
    // ignore setting global handlers
  }

  const loop = () => {
    if (st.stopped) return;

    try {
      const roster = getRosterNames();
      if (!roster.length) return;

      const meta = getRosterMeta(roster);
      const leader = pickLeader(roster, meta);

      if (character.name === leader) {
        const party = parent?.party || {};
        for (const name of roster) {
          if (name === character.name) continue;
          if (party[name]) continue;
          if (!isTrustedPartyName(name, roster)) continue;

          const last = st.lastInviteAt.get(name) || 0;
          if (Date.now() - last < 8000) continue;

          try {
            send_party_invite(name);
            st.lastInviteAt.set(name, Date.now());
          } catch (e) {
            warn("Failed to send party invite", e);
          }
        }
      }
    } catch (e) {
      warn("Auto-party loop error", e);
    } finally {
      if (st.stopped) return;
      st.timer = setTimeout(loop, 2000);
    }
  };

  loop();

  return {
    stop,
    dispose: () => {
      stop();
    },
    [Symbol.dispose]: () => {
      stop();
    },
    [Symbol.asyncDispose]: async () => {
      stop();
    },
  };
};

module.exports = {
  is_friendly,
  installAutoParty,
  getActiveCharacters,
  getActiveTypeCounts,
  getActiveNames,
};
