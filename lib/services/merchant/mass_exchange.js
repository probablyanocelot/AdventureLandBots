const MASS_EXCHANGE_SKILLS = Object.freeze(["massexchange", "massexchangepp"]);

const applyMassExchangeBuffs = ({ enabled = true } = {}) => {
  try {
    if (enabled === false) return;
    if (!character) return;

    for (const skillName of MASS_EXCHANGE_SKILLS) {
      if (character?.s?.[skillName]) continue;
      if (typeof is_on_cooldown === "function" && is_on_cooldown(skillName)) {
        continue;
      }
      if (typeof can_use === "function" && !can_use(skillName)) continue;

      try {
        use_skill(skillName);
      } catch {
        // ignore and continue trying the next aura
      }
    }
  } catch {
    // ignore runtime failures so merchant loop keeps running
  }
};

module.exports = {
  MASS_EXCHANGE_SKILLS,
  applyMassExchangeBuffs,
};
