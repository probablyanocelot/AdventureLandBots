const getRosterNames = () => {
  const out = new Set();
  try {
    const party = parent?.party;
    if (party) Object.keys(party).forEach((n) => out.add(n));
  } catch {
    // ignore
  }

  try {
    const active = get_active_characters();
    Object.keys(active || {}).forEach((n) => out.add(n));
  } catch {
    // ignore
  }

  out.add(character.name);
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

const normalizeCtype = (obj) => obj?.class || obj?.ctype || null;

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

const getRosterSnapshot = () => {
  const roster = getRosterNames();
  const meta = getRosterMeta(roster);
  return roster.map((name) => {
    const m = meta.get(name) || {};
    return {
      name,
      ctype: m.ctype ?? null,
      level: m.level ?? null,
      luck: m.luck ?? null,
    };
  });
};

const compareByMeta = (aName, bName, meta) => {
  const a = meta.get(aName) || {};
  const b = meta.get(bName) || {};
  const aLevel = Number(a.level ?? 0);
  const bLevel = Number(b.level ?? 0);
  if (aLevel !== bLevel) return bLevel - aLevel;

  const aLuck = Number(a.luck ?? 0);
  const bLuck = Number(b.luck ?? 0);
  if (aLuck !== bLuck) return bLuck - aLuck;

  return aName.localeCompare(bName);
};

module.exports = {
  getRosterNames,
  getRosterMeta,
  getRosterSnapshot,
  compareByMeta,
  readLuck,
};
