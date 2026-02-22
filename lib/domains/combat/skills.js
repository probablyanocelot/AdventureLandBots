const hasSkillDef = (name) => Boolean(name && G?.skills?.[name]);

const hasMpFor = (name) => {
  try {
    const cost = Number(G?.skills?.[name]?.mp || 0);
    return Number(character?.mp || 0) >= cost;
  } catch {
    return false;
  }
};

const canUseSkill = (name) => {
  try {
    if (!hasSkillDef(name)) return false;
    if (typeof is_on_cooldown === "function" && is_on_cooldown(name))
      return false;
    return hasMpFor(name);
  } catch {
    return false;
  }
};

const safeUseSkill = (name, target) => {
  try {
    if (!canUseSkill(name)) return false;
    use_skill(name, target);
    return true;
  } catch {
    return false;
  }
};

const getInRangeMonsters = ({ max = 12 } = {}) => {
  const out = [];
  try {
    const entities = parent?.entities || {};
    for (const entity of Object.values(entities)) {
      if (!entity || entity.type !== "monster") continue;
      if (entity.dead || !entity.visible) continue;
      if (typeof is_in_range === "function" && !is_in_range(entity)) continue;
      out.push(entity);
      if (out.length >= max) break;
    }
  } catch {
    // ignore
  }
  return out;
};

const pick3ShotTargets = (primaryTarget) => {
  const monsters = getInRangeMonsters({ max: 24 });
  if (!monsters.length) return [];

  const uniq = new Map();
  if (primaryTarget?.id) uniq.set(primaryTarget.id, primaryTarget);

  const preferred = monsters
    .slice()
    .sort((a, b) => {
      const aAggro = a.target === character?.name ? 1 : 0;
      const bAggro = b.target === character?.name ? 1 : 0;
      if (aAggro !== bAggro) return bAggro - aAggro;
      return Number(a.hp || 0) - Number(b.hp || 0);
    })
    .slice(0, 6);

  for (const m of preferred) {
    if (m?.id && !uniq.has(m.id)) uniq.set(m.id, m);
    if (uniq.size >= 3) break;
  }

  return Array.from(uniq.values()).slice(0, 3);
};

const maybePriestSupport = () => {
  if (character?.ctype !== "priest") return false;

  // Self-sustain first.
  if (
    hasSkillDef("heal") &&
    Number(character?.max_hp || 0) - Number(character?.hp || 0) >=
      Number(character?.heal || 0)
  ) {
    if (safeUseSkill("heal", character)) return true;
  }

  try {
    const party = parent?.party || {};
    let biggestMissing = 0;
    let mostHurtName = null;
    let missingTotal = 0;
    let seen = 0;

    for (const name of Object.keys(party)) {
      const p = get_player?.(name);
      if (!p || p.rip) continue;
      if (p.map && character?.map && p.map !== character.map) continue;
      const missing = Math.max(0, Number(p.max_hp || 0) - Number(p.hp || 0));
      if (missing <= 0) continue;
      missingTotal += missing;
      seen += 1;
      if (missing > biggestMissing) {
        biggestMissing = missing;
        mostHurtName = name;
      }
    }

    if (mostHurtName && hasSkillDef("heal")) {
      const healOutput = Number(
        G?.skills?.heal?.output || character?.heal || 0,
      );
      if (biggestMissing >= Math.max(250, healOutput * 0.8)) {
        if (safeUseSkill("heal", mostHurtName)) return true;
      }
    }

    if (seen >= 2 && hasSkillDef("partyheal")) {
      const partyHealOutput = Number(G?.skills?.partyheal?.output || 0);
      if (missingTotal >= Math.max(700, partyHealOutput * 1.1)) {
        if (safeUseSkill("partyheal")) return true;
      }
    }
  } catch {
    // ignore
  }

  if (hasSkillDef("darkblessing") && !character?.s?.darkblessing) {
    if (safeUseSkill("darkblessing")) return true;
  }

  return false;
};

const maybePaladinBuff = () => {
  if (character?.ctype !== "paladin") return false;
  if (hasSkillDef("mshield") && !character?.s?.mshield) {
    return safeUseSkill("mshield", character);
  }
  return false;
};

const useFarmerSkills = (target, { disableMultiTarget = false } = {}) => {
  if (!target || target.dead) return false;

  // Global/support checks first.
  if (maybePriestSupport()) return true;
  if (maybePaladinBuff()) return true;

  switch (character?.ctype) {
    case "ranger": {
      if (
        hasSkillDef("huntersmark") &&
        Number(target?.max_hp || 0) > Number(character?.attack || 0) * 3
      ) {
        if (safeUseSkill("huntersmark", target)) return true;
      }

      if (
        hasSkillDef("supershot") &&
        Number(target?.max_hp || 0) > Number(character?.attack || 0) * 1.5
      ) {
        if (safeUseSkill("supershot", target)) return true;
      }

      if (!disableMultiTarget && hasSkillDef("3shot") && canUseSkill("3shot")) {
        const targets = pick3ShotTargets(target);
        if (targets.length >= 2) {
          try {
            use_skill("3shot", targets);
            return true;
          } catch {
            // ignore
          }
        }
      }

      break;
    }

    case "priest": {
      if (
        hasSkillDef("curse") &&
        Number(character?.hp || 0) >= Number(character?.max_hp || 0) * 0.6 &&
        Number(target?.hp || 0) > Number(character?.attack || 0) * 2
      ) {
        if (safeUseSkill("curse", target)) return true;
      }
      break;
    }

    case "rogue": {
      if (hasSkillDef("rspeed") && !character?.s?.rspeed) {
        if (safeUseSkill("rspeed", character)) return true;
      }

      if (hasSkillDef("quickstab")) {
        if (safeUseSkill("quickstab", target)) return true;
      }
      break;
    }

    case "warrior": {
      if (hasSkillDef("warcry") && !character?.s?.warcry) {
        if (safeUseSkill("warcry")) return true;
      }

      if (hasSkillDef("charge") && !smart?.moving) {
        if (safeUseSkill("charge")) return true;
      }

      if (!disableMultiTarget && hasSkillDef("cleave")) {
        const near = getInRangeMonsters({ max: 10 });
        if (near.length >= 2 && safeUseSkill("cleave")) return true;
      }
      break;
    }

    case "paladin": {
      if (
        hasSkillDef("smash") &&
        Number(target?.hp || 0) > Number(character?.attack || 0)
      ) {
        if (safeUseSkill("smash", target)) return true;
      }
      break;
    }

    default:
      break;
  }

  return false;
};

module.exports = {
  useFarmerSkills,
};
