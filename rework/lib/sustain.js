function regen() {
  // not full mp or hp, fix
  if (character.max_mp !== character.mp) {
    if (!is_on_cooldown("regen_mp")) {
      let missingMp = character.max_mp - character.mp;
      let mPot = locate_item("mpot1");

      if (mPot <= 0) {
        use_skill("regen_mp");
        return;
      }

      // either use regen or potion
      if (missingMp <= 300) use_skill("regen_mp");
      if (missingMp > 300 && mPot) use(mPot);
    }
  }

  // regen, need potion?
  if (character.max_hp !== character.hp) {
    if (!is_on_cooldown("regen_hp")) use_skill("regen_hp");
  }
  setTimeout(this.regen, 500);
}

function mpUseAvg() {
  // TODO
  let sampleCount = 0;
  let timeout = setTimeout(() => {
    let mp_used = parent.character.max_mp - parent.character.mp;
    this.mp_use_avg = (this.mp_use_avg * 9 + mp_used) / 10; // simple moving average over 10 samples
  }, 6000); // every 6 seconds
  if (sampleCount >= 10) {
    clearTimeout(timeout);
    return this.mp_use_avg;
  } else {
    sampleCount++;
    return this.mp_use_avg;
  }
}
