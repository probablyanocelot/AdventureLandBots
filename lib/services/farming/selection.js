const { getConfig } = await require("../../config/index.js");
const { compareByMeta } = await require("../shared/index.js");
const { resolveCharacterName } = await require("./character_registry.js");
const { getMonsterhuntTargetForName, needsMonsterhuntTurnInForName } =
  await require("./monsterhunt_state.js");

const getMonsterStats = (mtype) => {
  try {
    if (!mtype || !G?.monsters?.[mtype]) return null;
    const def = G.monsters[mtype];
    return {
      mtype,
      hp: def.hp || 0,
      attack: def.attack || 0,
      xp: def.xp || 0,
      gold: def.gold || 0,
    };
  } catch {
    return null;
  }
};

const pickNames = (list, count) => list.slice(0, Math.max(0, count));

const normalizeMonsterName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const selectPair = ({ stats, available, exclude = [] } = {}) => {
  const excl = new Set(exclude);
  const rangers = available.ranger.filter((n) => !excl.has(n));
  const priests = available.priest.filter((n) => !excl.has(n));
  const paladins = available.paladin.filter((n) => !excl.has(n));
  const warriors = available.warrior.filter((n) => !excl.has(n));
  const rogues = available.rogue.filter((n) => !excl.has(n));
  const mages = available.mage.filter((n) => !excl.has(n));

  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;

  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};

  const weak =
    hp <= nf.weakMaxHp && attack <= nf.weakMaxAttack && rangers.length >= 2;
  const highAttack = attack >= nf.highAttack;
  const highHp = hp >= nf.highHp;
  const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;

  if (weak) return pickNames(rangers, 2);
  if (highAttack && highHp && priests.length && paladins.length)
    return [priests[0], paladins[0]];
  if (highAttack && priests.length && warriors.length)
    return [priests[0], warriors[0]];
  if (longFight && priests.length && rogues.length)
    return [priests[0], rogues[0]];
  if (paladins.length && rogues.length) return [paladins[0], rogues[0]];

  // Fallback: highest available by preference
  const pref = [
    ...paladins,
    ...priests,
    ...warriors,
    ...rogues,
    ...rangers,
    ...mages,
  ];
  return pickNames(pref, 2);
};

const selectThree = ({ stats, available } = {}) => {
  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;
  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};

  const priests = available.priest;
  const paladins = available.paladin;
  const warriors = available.warrior;
  const rogues = available.rogue;
  const rangers = available.ranger;
  const mages = available.mage;

  const highAttack = attack >= nf.highAttack;
  const highHp = hp >= nf.highHp;
  const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;

  let trio = [];

  if (highAttack && highHp) {
    if (priests.length) trio.push(priests[0]);
    if (paladins.length) trio.push(paladins[0]);
    if (warriors.length) trio.push(warriors[0]);
  } else if (highAttack) {
    if (priests.length) trio.push(priests[0]);
    if (warriors.length) trio.push(warriors[0]);
    if (paladins.length) trio.push(paladins[0]);
  } else if (longFight) {
    if (priests.length) trio.push(priests[0]);
    if (rogues.length) trio.push(rogues[0]);
    if (paladins.length) trio.push(paladins[0]);
  } else {
    if (paladins.length) trio.push(paladins[0]);
    if (rogues.length) trio.push(rogues[0]);
    if (priests.length) trio.push(priests[0]);
  }

  const used = new Set(trio);
  const fallback = [
    ...warriors,
    ...rogues,
    ...rangers,
    ...mages,
    ...paladins,
    ...priests,
  ].filter((n) => !used.has(n));

  while (trio.length < 3 && fallback.length) trio.push(fallback.shift());

  return trio.slice(0, 3);
};

const selectBurst = ({ available } = {}) => {
  const rangers = available.ranger;
  const mages = available.mage;

  if (rangers.length >= 2 && mages.length >= 1) {
    return [rangers[0], rangers[1], mages[0]];
  }

  if (mages.length >= 2 && rangers.length >= 1) {
    return [mages[0], mages[1], rangers[0]];
  }

  return [];
};

const chooseLeader = (roster, meta) => {
  const farmerRoster = roster.filter((n) => meta.get(n)?.ctype !== "merchant");
  if (!farmerRoster.length) return null;

  const activeHuntOwners = farmerRoster
    .filter((name) => meta.get(name)?.ctype !== "ranger")
    .filter((name) => {
      const target = getMonsterhuntTargetForName(name);
      if (!target) return false;
      return !needsMonsterhuntTurnInForName(name);
    })
    .sort((a, b) => compareByMeta(a, b, meta));

  if (activeHuntOwners.length) return activeHuntOwners[0];

  const nonRangers = farmerRoster.filter(
    (n) => meta.get(n)?.ctype !== "ranger",
  );
  if (nonRangers.length) return nonRangers[0];
  return farmerRoster[0];
};

const selectPreferredCrabRanger = ({ available, meta, preferredName } = {}) => {
  try {
    const rangers = Array.isArray(available?.ranger)
      ? available.ranger.filter(Boolean)
      : [];
    if (!rangers.length) return null;

    const preferred = resolveCharacterName(preferredName);
    const sorted = [...rangers].sort((a, b) => {
      const aPreferred = preferred && a === preferred ? 1 : 0;
      const bPreferred = preferred && b === preferred ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;

      const aLuck = Number(meta?.get(a)?.luck ?? 0);
      const bLuck = Number(meta?.get(b)?.luck ?? 0);
      if (aLuck !== bLuck) return bLuck - aLuck;

      return compareByMeta(a, b, meta);
    });

    return sorted[0] || null;
  } catch {
    return (
      resolveCharacterName(preferredName) || available?.ranger?.[0] || null
    );
  }
};

const hasCapableNonRangerHuntPair = ({ available, meta } = {}) => {
  try {
    const nonRangerHunters = [
      ...(available?.priest || []),
      ...(available?.warrior || []),
      ...(available?.paladin || []),
      ...(available?.rogue || []),
      ...(available?.mage || []),
    ].filter(Boolean);

    if (nonRangerHunters.length < 2) return false;

    const hasPriest = nonRangerHunters.some(
      (name) => meta?.get(name)?.ctype === "priest",
    );
    const hasFrontliner = nonRangerHunters.some((name) =>
      ["warrior", "paladin", "rogue"].includes(meta?.get(name)?.ctype),
    );

    return hasPriest || hasFrontliner;
  } catch {
    return false;
  }
};

const countAvailableFarmers = (available = {}) => {
  try {
    return ["ranger", "priest", "paladin", "warrior", "rogue", "mage"]
      .map((k) =>
        Array.isArray(available?.[k]) ? available[k].filter(Boolean).length : 0,
      )
      .reduce((sum, n) => sum + n, 0);
  } catch {
    return 0;
  }
};

const shouldAssignCrabRole = ({
  cfg,
  nf,
  stats,
  available,
  crabRangerName,
  capableNonRangerPair,
  difficult,
} = {}) => {
  try {
    if (
      !crabRangerName ||
      !(available?.ranger || ["camelCase"]).includes(crabRangerName)
    ) {
      return false;
    }

    const rangerCount = Array.isArray(available?.ranger)
      ? available.ranger.length
      : 0;

    // Always keep a single ranger on crab duty by default.
    if (rangerCount < 2) {
      return true;
    }

    const policy =
      (nf?.crabJoinPolicy && typeof nf.crabJoinPolicy === "object"
        ? nf.crabJoinPolicy
        : cfg?.noEventFarming?.crabJoinPolicy) || {};

    if (policy.enabled === false) return false;

    const minOnlineFarmers = Math.max(1, Number(policy.minOnlineFarmers || 3));
    if (countAvailableFarmers(available) < minOnlineFarmers) return false;

    if (policy.requireCapableNonRangerPair !== false && !capableNonRangerPair) {
      return false;
    }

    if (policy.requireDifficultTarget && !difficult) return false;

    const target = normalizeMonsterName(stats?.mtype || null);
    const onlyTargets = Array.isArray(policy.onlyTargets)
      ? policy.onlyTargets.map(normalizeMonsterName).filter(Boolean)
      : [];
    const denyTargets = new Set(
      (Array.isArray(policy.denyTargets) ? policy.denyTargets : [])
        .map(normalizeMonsterName)
        .filter(Boolean),
    );

    if (target && denyTargets.has(target)) return false;
    if (onlyTargets.length && (!target || !onlyTargets.includes(target))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

const pickRoleName = ({ roster = [], meta, ctype, fallback = null } = {}) => {
  try {
    if (fallback && roster.includes(fallback)) return fallback;
    const candidates = (Array.isArray(roster) ? roster : [])
      .filter((name) => meta.get(name)?.ctype === ctype)
      .sort((a, b) => compareByMeta(a, b, meta));
    return candidates[0] || null;
  } catch {
    return fallback || null;
  }
};

const buildAvailableByClass = (roster, meta) => {
  const available = {
    ranger: [],
    priest: [],
    paladin: [],
    warrior: [],
    rogue: [],
    mage: [],
  };

  for (const name of roster) {
    const ctype = meta.get(name)?.ctype;
    if (!ctype || ctype === "merchant") continue;
    if (available[ctype]) available[ctype].push(name);
  }

  for (const k of Object.keys(available)) {
    available[k].sort((a, b) => compareByMeta(a, b, meta));
  }
  return available;
};

const determineAssignment = ({
  roster,
  meta,
  stats,
  available: provided,
} = {}) => {
  const available = provided || buildAvailableByClass(roster, meta);
  const cfg = getConfig();
  const nf = cfg.noEventFarming || {};
  const crabRangerName = selectPreferredCrabRanger({
    available,
    meta,
    preferredName: nf.crabRangerName,
  });

  const hp = stats?.hp ?? 0;
  const attack = stats?.attack ?? 0;

  const weak = hp <= nf.weakMaxHp && attack <= nf.weakMaxAttack;
  const highAttack = attack >= nf.highAttack;
  const highHp = hp >= nf.highHp;
  const longFight = hp >= nf.longFightHp && attack <= nf.lowAttack;
  const difficult = highAttack || highHp || longFight;

  let crab = [];
  let monsterhunt = [];
  let mode = difficult ? "difficult" : weak ? "weak" : "default";
  const capableNonRangerPair = hasCapableNonRangerHuntPair({ available, meta });

  if (difficult) {
    monsterhunt = selectThree({ stats, available });
    if (!monsterhunt.length) monsterhunt = selectPair({ stats, available });
    crab = [];
  } else {
    if (
      shouldAssignCrabRole({
        cfg,
        nf,
        stats,
        available,
        crabRangerName,
        capableNonRangerPair,
        difficult,
      })
    ) {
      crab = [crabRangerName];
    }

    const exclude = new Set(crab);
    monsterhunt = selectPair({
      stats,
      available,
      exclude: Array.from(exclude),
    });

    if (!monsterhunt.length && weak) {
      monsterhunt = selectBurst({ available });
    }

    if (!monsterhunt.length && crab.length) {
      crab = [];
      monsterhunt = selectPair({ stats, available, exclude: [] });
      if (!monsterhunt.length && weak) {
        monsterhunt = selectBurst({ available });
      }
    }
  }

  // Enforce max farmers = 3
  if (crab.length + monsterhunt.length > 3) {
    monsterhunt = monsterhunt.slice(0, Math.max(0, 3 - crab.length));
  }

  return { mode, crab, monsterhunt };
};

const selectWorldFarmers = ({
  stats,
  available,
  meta,
  worldEventName,
  skipRangerName,
  blockedRangers,
} = {}) => {
  const safeAvailable = { ...(available || {}), ranger: [] };
  if (Array.isArray(available?.ranger))
    safeAvailable.ranger = [...available.ranger];

  if (skipRangerName) {
    safeAvailable.ranger = safeAvailable.ranger.filter(
      (name) => name !== skipRangerName,
    );
  }
  if (Array.isArray(blockedRangers) || blockedRangers instanceof Set) {
    const blockedSet = new Set(blockedRangers);
    safeAvailable.ranger = safeAvailable.ranger.filter(
      (name) => !blockedSet.has(name),
    );
  }

  let trio = selectThree({ stats, available: safeAvailable }).slice(0, 3);

  const isPorcupine =
    String(worldEventName || "").toLowerCase() === "porcupine";
  const availableRangerCount = safeAvailable.ranger.length;

  if (!isPorcupine) {
    if (availableRangerCount < 2) {
      trio = trio.filter(
        (name) =>
          String(meta?.get(name)?.ctype || "").toLowerCase() !== "ranger",
      );
    } else if (availableRangerCount >= 2) {
      const sortedRangers = [...safeAvailable.ranger].sort((a, b) => {
        const aLuck = Number(meta?.get(a)?.luck ?? 0);
        const bLuck = Number(meta?.get(b)?.luck ?? 0);
        if (aLuck !== bLuck) return aLuck - bLuck;
        return a.localeCompare(b);
      });
      const lowestLuckRanger = sortedRangers[0] || null;

      const nonRangers = trio.filter(
        (name) =>
          String(meta?.get(name)?.ctype || "").toLowerCase() !== "ranger",
      );

      trio = [
        ...new Set([...nonRangers, lowestLuckRanger].filter(Boolean)),
      ].slice(0, 3);
    }
  }

  return trio.slice(0, 3);
};

const listFarmersByPreference = (available = {}) => [
  ...(available.priest || []),
  ...(available.warrior || []),
  ...(available.paladin || []),
  ...(available.rogue || []),
  ...(available.ranger || []),
  ...(available.mage || []),
];

module.exports = {
  getMonsterStats,
  selectPair,
  selectThree,
  selectBurst,
  chooseLeader,
  selectPreferredCrabRanger,
  hasCapableNonRangerHuntPair,
  pickRoleName,
  buildAvailableByClass,
  determineAssignment,
  selectWorldFarmers,
  listFarmersByPreference,
};
