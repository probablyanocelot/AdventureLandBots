const hasSkillDef = (name) => Boolean(name && G?.skills?.[name]);

let lastRanger5ShotAt = 0;

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
    if (
      typeof is_on_cooldown === "function" &&
      (is_on_cooldown(name) || G.skills?.[name]?.level > character.level)
    )
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

const isInEventOrPvp = () => {
  try {
    if (typeof in_pvp === "function" && in_pvp()) return true;
    if (parent?.is_pvp) return true;
    const mapDef = G?.maps?.[character?.map];
    return Boolean(mapDef?.pvp || mapDef?.event);
  } catch {
    return false;
  }
};

const getOwnedPartyRefs = () => {
  const names = new Set();
  const ids = new Set();

  if (character?.name) names.add(character.name);
  if (character?.id) ids.add(character.id);

  const party = parent?.party || {};
  for (const name of Object.keys(party)) {
    names.add(name);
    const player = get_player?.(name);
    if (player?.id) ids.add(player.id);
  }

  return { names, ids };
};

const getIncomingDamageAmount = (target) => {
  if (!target) return 0;
  const values = [
    target.incoming,
    target.incoming_damage,
    target.incomingDamage,
    target.incoming_hp,
    target.incomingHp,
    target.pending_damage,
    target.pendingDamage,
  ];

  let total = 0;
  for (const value of values) {
    const n = Number(value || 0);
    if (Number.isFinite(n) && n > 0) total += n;
  }

  if (Array.isArray(target.attackers) || typeof target.attackers === "object") {
    if (Array.isArray(target.attackers)) total += target.attackers.length * 10;
    else total += Object.keys(target.attackers).length * 10;
  }

  return total;
};

const estimateSkillProjectileDamage = (skillName, target) => {
  try {
    const attack = Math.max(1, Number(character?.attack || 1));
    const multiplier = Number(G?.skills?.[skillName]?.damage_multiplier || 1);
    const armor = Math.max(0, Number(target?.armor || target?.resistance || 0));
    const raw = attack * (Number.isFinite(multiplier) ? multiplier : 1);
    return Math.max(1, Math.floor(raw - armor));
  } catch {
    return 1;
  }
};

const canKillWithThreeSkillUses = (skillName, target) => {
  try {
    const hp = Number(target?.hp || 0);
    if (!Number.isFinite(hp) || hp <= 0) return false;
    const shotsPerUse = skillName === "5shot" ? 5 : 3;
    const damagePerProjectile = estimateSkillProjectileDamage(
      skillName,
      target,
    );
    return hp <= shotsPerUse * damagePerProjectile * 3;
  } catch {
    return false;
  }
};

const pickMultiShotTargets = (skillName, primaryTarget, maxTargets) => {
  const monsters = getInRangeMonsters({ max: 40 });
  if (!monsters.length) return [];

  const eventOrPvp = isInEventOrPvp();
  const ownedRefs = getOwnedPartyRefs();
  const uniq = new Map();

  if (primaryTarget?.id) uniq.set(primaryTarget.id, primaryTarget);

  const candidates = monsters
    .map((monster) => {
      const targeting = String(monster.target || "");
      const monsterDef = G?.monsters?.[monster?.mtype];
      const isOwnedTarget =
        ownedRefs.ids.has(targeting) || ownedRefs.names.has(targeting);
      const incomingAmount = getIncomingDamageAmount(monster);
      const incoming = incomingAmount > 0;
      const otherPlayerTargeting =
        Boolean(targeting) &&
        !ownedRefs.ids.has(targeting) &&
        !ownedRefs.names.has(targeting);
      const incomingFromParty =
        incoming && isOwnedTarget && targeting !== character?.name;
      const isContested = otherPlayerTargeting || (incoming && !isOwnedTarget);
      const killable = canKillWithThreeSkillUses(skillName, monster);
      const isRareEventMob = Boolean(monsterDef?.rare || monsterDef?.event);
      const isDyingFast =
        incoming &&
        (incomingAmount * 3 >= Number(monster?.hp || 0) ||
          Number(monster?.hp || 0) <= Number(monster?.max_hp || 0) * 0.25);
      const skipIncoming =
        incoming &&
        (!isOwnedTarget ||
          (incomingFromParty &&
            incomingAmount * 3 >= Number(monster?.max_hp || 0)));

      return {
        monster,
        isOwnedTarget,
        incoming,
        incomingAmount,
        incomingFromParty,
        otherPlayerTargeting,
        isContested,
        killable,
        isRareEventMob,
        isDyingFast,
        skipIncoming,
      };
    })
    .filter((entry) => {
      if (!entry.monster?.id) return false;
      if (!eventOrPvp && entry.skipIncoming) return false;
      if (
        !eventOrPvp &&
        !entry.killable &&
        !entry.isOwnedTarget &&
        !entry.isRareEventMob
      )
        return false;
      if (
        eventOrPvp &&
        !entry.killable &&
        !entry.isContested &&
        !entry.isDyingFast
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (a.killable !== b.killable) return a.killable ? -1 : 1;
      if (a.isContested !== b.isContested) return a.isContested ? -1 : 1;
      if (a.isDyingFast !== b.isDyingFast) return a.isDyingFast ? -1 : 1;
      if (a.isRareEventMob !== b.isRareEventMob)
        return a.isRareEventMob ? -1 : 1;
      if (a.isOwnedTarget !== b.isOwnedTarget) return a.isOwnedTarget ? -1 : 1;
      return Number(a.monster.hp || 0) - Number(b.monster.hp || 0);
    });

  for (const entry of candidates) {
    if (!uniq.has(entry.monster.id)) {
      uniq.set(entry.monster.id, entry.monster);
      if (uniq.size >= maxTargets) break;
    }
  }

  return Array.from(uniq.values()).slice(0, maxTargets);
};

const pick5ShotTargets = (primaryTarget) =>
  pickMultiShotTargets("5shot", primaryTarget, 5);

const estimateRanger5ShotHit = (target) => {
  try {
    const attack = Math.max(1, Number(character?.attack || 1));
    const armor = Math.max(0, Number(target?.armor || target?.resistance || 0));
    const multiplier = Number(G?.skills?.["5shot"]?.damage_multiplier || 1);
    const raw = attack * (Number.isFinite(multiplier) ? multiplier : 1);
    return Math.max(1, Math.floor(raw - armor));
  } catch {
    return 1;
  }
};

const shouldUseOccasional5Shot = (target) => {
  try {
    if (character?.ctype !== "ranger") return false;
    if (!target || target.dead) return false;
    if (!hasSkillDef("5shot")) return false;

    const hp = Number(target?.hp || 0);
    if (!Number.isFinite(hp) || hp <= 0) return false;

    const perVolley = estimateRanger5ShotHit(target);
    if (hp > perVolley * 2) return false;

    const nowMs = Date.now();
    if (nowMs - lastRanger5ShotAt < 4500) return false;

    // Occasional usage: avoid turning every eligible pull into a 5shot.
    return Math.random() < 0.4;
  } catch {
    return false;
  }
};

const pick3ShotTargets = (primaryTarget) =>
  pickMultiShotTargets("3shot", primaryTarget, 3);

const maybePriestSupport = () => {
  if (character?.ctype !== "priest") return false;

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

const getMonsterDefinition = (target) => {
  try {
    const mtype = target?.mtype || target?.type;
    if (!mtype) return null;
    return G?.monsters?.[mtype] || null;
  } catch {
    return null;
  }
};

const getHighPhysicalAttackThreshold = () => {
  try {
    const runtimeConfig =
      globalThis?.AL_BOTS_CONFIG?.farming ||
      globalThis?.AL_BOTS_CONFIG?.noEventFarming ||
      {};
    const fromRuntime = Number(runtimeConfig.highAttack);
    if (Number.isFinite(fromRuntime)) return Math.max(1, fromRuntime);
  } catch {
    // ignore
  }
  return 500;
};

const isPhysicalDamageType = (type) => {
  const normalized = String(type || "").toLowerCase();
  if (!normalized) return true;
  if (normalized.includes("magic")) return false;
  return normalized.includes("phys") || normalized === "pure";
};

const isHighPhysicalThreat = (target) => {
  try {
    if (!target || target.dead) return false;

    const def = getMonsterDefinition(target);
    const attack = Number(target?.attack ?? def?.attack ?? 0);
    if (!Number.isFinite(attack)) return false;
    if (attack < getHighPhysicalAttackThreshold()) return false;

    const damageType =
      target?.damage_type ||
      target?.dmg_type ||
      def?.damage_type ||
      def?.dmg_type ||
      "physical";

    return isPhysicalDamageType(damageType);
  } catch {
    return false;
  }
};

const useFarmerSkills = (target, { disableMultiTarget = false } = {}) => {
  if (!target || target.dead) return false;

  if (maybePriestSupport()) return true;
  if (maybePaladinBuff()) return true;

  switch (character?.ctype) {
    case "ranger": {
      if (!disableMultiTarget && shouldUseOccasional5Shot(target)) {
        const targets = pick5ShotTargets(target);
        if (targets.length >= 1) {
          try {
            use_skill("5shot", targets);
            lastRanger5ShotAt = Date.now();
            return true;
          } catch {
            // ignore
          }
        }
      }

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

      if (!disableMultiTarget && hasSkillDef("3shot")) {
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
      const maxHp = Math.max(1, Number(character?.max_hp || 0));
      const currentHp = Number(character?.hp || 0);
      const hpRatio = currentHp / maxHp;
      const isLowHp = hpRatio < 0.33;
      const isRecovered = hpRatio >= 0.75;
      const targetAggroingRogue = target?.target === character?.name;

      if (isLowHp) {
        if (hasSkillDef("invis") && !character?.s?.invis) {
          safeUseSkill("invis", character);
        }

        // Wait out dangerous phase while the target keeps focusing rogue
        if (!isRecovered && targetAggroingRogue) {
          return true;
        }
      }

      if (hasSkillDef("rspeed")) {
        const party = parent?.party || {};
        const renewThresholdMs = 20 * 60 * 1000; // 20 minutes

        for (const name of Object.keys(party)) {
          if (!name || name === character?.name) continue;
          const p = get_player?.(name);
          if (!p || p.rip) continue;
          if (character?.map && p.map && p.map !== character.map) continue;
          if (distance(character, p) > 340) continue;

          const rspeedState = p?.s?.rspeed;
          const remainingMs = Number(rspeedState?.ms || 0);
          const needsRefresh = !rspeedState || remainingMs <= renewThresholdMs;
          if (!needsRefresh) continue;

          if (safeUseSkill("rspeed", p)) return true;
        }

        if (
          !character?.s?.rspeed ||
          Number(character?.s?.rspeed?.ms || 0) <= renewThresholdMs
        ) {
          if (safeUseSkill("rspeed", character)) return true;
        }
      }

      if (hasSkillDef("quickstab")) {
        if (safeUseSkill("quickstab", target)) return true;
      }
      break;
    }

    case "warrior": {
      if (
        hasSkillDef("hardshell") &&
        !character?.s?.hardshell &&
        distance(character, target) <= target?.range &&
        isHighPhysicalThreat(target)
      ) {
        if (safeUseSkill("hardshell")) return true;
      }

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
        (is_on_cooldown("purify") || !canUseSkill("purify")) &&
        Number(target?.hp || 0) > Number(character?.attack || 0)
      ) {
        if (
          canUseSkill("purify") &&
          !is_on_cooldown("purify") &&
          Number(target?.hp || 0) >= 3000
        )
          return false; // save smash for purify combo on high hp targets
        if (safeUseSkill("smash", target)) return true;
      }
      if (
        hasSkillDef("purify") &&
        canUseSkill("purify") &&
        Number(target?.hp || 2001) <= 2000
      ) {
        if (safeUseSkill("purify", target)) return true;
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
