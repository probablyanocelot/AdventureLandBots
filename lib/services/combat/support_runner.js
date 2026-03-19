// Combat support helpers (service-native).
// Purpose: mage energize support and priest heal logic used by other services.

const normalizeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getOwnCharacterNamesSet = () => {
  const out = new Set([character?.name].filter(Boolean));
  try {
    const chars = get_characters?.();
    if (Array.isArray(chars)) {
      for (const c of chars) {
        if (c?.name) out.add(c.name);
      }
    }
  } catch {
    // ignore
  }
  return out;
};

const runMageSupport = ({ assigned } = {}) => {
  if (assigned) return;
  try {
    if (is_on_cooldown("energize")) return;
    const party = parent?.party;
    if (!party) return;
    const names = Object.keys(party).filter((n) => n !== character.name);
    for (const name of names) {
      const p = get_player?.(name);
      if (!p) continue;
      if (character.map !== p.map) continue;
      if (distance(character, p) > 250) continue;
      if (character.mp < (G.skills.energize?.mp ?? 0)) continue;
      use_skill("energize", p);
      break;
    }
  } catch {
    // ignore
  }
};

const runPriestSupport = ({ cfg } = {}) => {
  try {
    if (character?.ctype !== "priest") return false;
    if (character?.rip) return false;

    const party = parent?.party;
    if (!party) return false;

    const ownNames = getOwnCharacterNamesSet();

    const healSkill = G?.skills?.heal || {};
    const partyHealSkill = G?.skills?.partyheal || {};
    const healRange = normalizeNumber(healSkill.range, 320);
    const healMp = normalizeNumber(healSkill.mp, 0);
    const partyRange = normalizeNumber(partyHealSkill.range, healRange);
    const partyMp = normalizeNumber(partyHealSkill.mp, 0);

    const mod = normalizeNumber(
      cfg?.noEventFarming?.priestPartyHealOutputMod,
      0.7,
    );
    const partyHealEstimate = Math.max(
      1,
      normalizeNumber(partyHealSkill.output, character?.heal * mod),
    );
    const minPartyTargets = Math.max(
      2,
      Math.floor(
        normalizeNumber(cfg?.noEventFarming?.priestPartyHealMinTargets, 2),
      ),
    );

    const partyNames = new Set([character.name, ...Object.keys(party)]);
    const threatenedCounts = new Map();
    try {
      for (const entity of Object.values(parent?.entities || {})) {
        if (!entity || entity.type !== "monster" || entity.dead) continue;
        const t = entity.target;
        if (!t || !partyNames.has(t)) continue;
        threatenedCounts.set(t, Number(threatenedCounts.get(t) || 0) + 1);
      }
    } catch {
      // ignore
    }

    const injured = [];
    for (const name of partyNames) {
      const entity = name === character.name ? character : get_player?.(name);
      if (!entity) continue;
      if (entity?.map && character?.map && entity.map !== character.map)
        continue;

      const maxHp = normalizeNumber(entity.max_hp, 0);
      const hp = normalizeNumber(entity.hp, maxHp);
      const missing = Math.max(0, maxHp - hp);
      if (missing <= 0) continue;

      const d =
        name === character.name
          ? 0
          : normalizeNumber(distance?.(character, entity), Infinity);

      injured.push({
        name,
        entity,
        missing,
        ratio: maxHp > 0 ? hp / maxHp : 1,
        dist: d,
        threatened: Number(threatenedCounts.get(name) || 0),
        isOwn: ownNames.has(name),
      });
    }

    if (!injured.length) return false;

    if (!is_on_cooldown("heal") && character.mp >= healMp) {
      const singleCandidates = injured
        .filter((it) => it.dist <= healRange)
        .sort((a, b) => {
          if (a.threatened !== b.threatened) return b.threatened - a.threatened;
          if (a.ratio !== b.ratio) return a.ratio - b.ratio;
          if (a.missing !== b.missing) return b.missing - a.missing;
          if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
          return a.dist - b.dist;
        });

      const target = singleCandidates[0];
      if (target) {
        use_skill("heal", target.entity || target.name);
        return true;
      }
    }

    const partyCandidates = injured.filter(
      (it) => it.dist <= partyRange && it.missing >= partyHealEstimate * 0.45,
    );
    const partyTotalMissing = partyCandidates.reduce(
      (sum, it) => sum + it.missing,
      0,
    );

    if (
      !is_on_cooldown("partyheal") &&
      character.mp >= partyMp &&
      (partyCandidates.length >= minPartyTargets ||
        partyTotalMissing >= partyHealEstimate * (minPartyTargets + 0.5))
    ) {
      use_skill("partyheal");
      return true;
    }
  } catch {
    // ignore
  }
  return false;
};

module.exports = {
  runMageSupport,
  runPriestSupport,
};
