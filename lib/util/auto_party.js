const { getConfig } = await require("../config.js");
const { getRosterNames, getRosterMeta } = await require("../roster_stats.js");
const { warn } = await require("./logger.js");

const now = () => Date.now();

const getActiveNames = () => {
  try {
    const active = get_active_characters();
    return Object.keys(active || {});
  } catch {
    return [];
  }
};

function is_friendly(char_name) {
  //check if it's one of the accounts characters
  for (char of get_characters()) {
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
  } catch {
    // ignore
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

const installAutoParty = ({ cfg } = {}) => {
  cfg = cfg || getConfig();

  const st = {
    stopped: false,
    lastInviteAt: new Map(),
  };

  try {
    globalThis.on_party_invite = (name) => {
      try {
        if (isTrustedPartyName(name)) accept_party_invite(name);
      } catch {
        // ignore
      }
    };

    globalThis.on_party_request = (name) => {
      try {
        if (isTrustedPartyName(name)) accept_party_request(name);
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
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
          if (now() - last < 8000) continue;

          try {
            send_party_invite(name);
            st.lastInviteAt.set(name, now());
          } catch (e) {
            warn("Failed to send party invite", e);
          }
        }
      }
    } catch (e) {
      warn("Auto-party loop error", e);
    } finally {
      setTimeout(loop, 2000);
    }
  };

  loop();

  return {
    stop: () => {
      st.stopped = true;
    },
  };
};

module.exports = {
  is_friendly,
  installAutoParty,
};
