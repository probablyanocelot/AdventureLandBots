character.on("hit", function (data) {
  if (data.heal > 0) return;
  let orb = character.slots.orb;
  if (!orb || !orb.name == "jacko") return;
  if (lastScare == null || new Date() - lastScare >= 1000) {
    if (character.mp >= 50 && !is_on_cooldown("scare")) {
      use_skill("scare", data.actor);
      lastScare = new Date();
    }
  }
});
