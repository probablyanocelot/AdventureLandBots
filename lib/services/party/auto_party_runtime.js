// Party service-native auto-party runtime.
// Purpose: maintain trusted party invite/request behavior without relying on legacy party domain imports.

const { warn, logCatch } = await require("../../al_debug_log.js");

const getRosterNames = () => {
  const out = new Set();
  const addName = (value) => {
    const name = String(value || "").trim();
    if (name) out.add(name);
  };

  const addFromList = (list) => {
    if (!Array.isArray(list)) return;
    for (const entry of list) {
      if (!entry) continue;
      if (typeof entry === "string") {
        addName(entry);
        continue;
      }
      if (typeof entry === "object" && entry.name) {
        addName(entry.name);
      }
    }
  };

  try {
    const party = parent?.party;
    if (party) Object.keys(party).forEach((n) => out.add(n));
  } catch {
    // ignore
  }

  try {
    addFromList(get_characters?.());
  } catch {
    // ignore
  }

  addName(character?.name);
  return Array.from(out).filter(Boolean).sort();
};

const readLuck = (obj) => {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.luck === "number") return obj.luck;
  if (typeof obj.luckm === "number") return obj.luckm;
  if (typeof obj.luk === "number") return obj.luk;
  if (obj.stats && typeof obj.stats.luck === "number") return obj.stats.luck;
  if (obj.stats && typeof obj.stats.luk === "number") return obj.stats.luk;
  return null;
};

const normalizeCtype = (obj) => obj?.ctype || obj?.class || obj?.type || null;

const getRosterMeta = (rosterNames) => {
  const map = new Map();

  try {
    const chars = get_characters();
    if (Array.isArray(chars)) {
      for (const c of chars) {
        if (!c || !c.name) continue;
        map.set(c.name, {
          name: c.name,
          ctype: normalizeCtype(c),
          level: c.level ?? null,
          luck: readLuck(c),
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const liveLuck = readLuck(character);
    map.set(character.name, {
      name: character.name,
      ctype: character.ctype,
      level: character.level,
      luck: liveLuck,
    });
  } catch {
    // ignore
  }

  if (Array.isArray(rosterNames)) {
    for (const name of rosterNames) {
      if (!map.has(name)) {
        let ctype = null;
        let level = null;
        let luck = null;

        try {
          const p = get_player?.(name);
          if (p) {
            ctype = normalizeCtype(p);
            level = p.level ?? null;
            luck = readLuck(p);
          }
        } catch {
          // ignore
        }

        map.set(name, { name, ctype, level, luck });
      }
    }
  }

  return map;
};

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

const getActiveNames = () => getActiveCharacters().map((c) => c.name);

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
  for (const char of get_characters()) {
    if (char.name === char_name) return true;
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

  const stopRoutine = () => {
    st.stopped = true;

    try {
      if (st.timer) clearTimeout(st.timer);
    } catch {
      // ignore
    }
    st.timer = null;

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
    stopRoutine,
    dispose: () => {
      stopRoutine();
    },
    [Symbol.dispose]: () => {
      stopRoutine();
    },
    [Symbol.asyncDispose]: async () => {
      stopRoutine();
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
