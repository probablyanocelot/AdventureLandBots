const { onCharacter } = await require("../domains/events/listeners.js");

// wire this up to character events that would trigger a scare response, e.g. incoming attack without heal,
// and use scare if we have a jacko orb and it's off cooldown.
// important when traveling or being attacked by unintended/too many/strong monsters

async function doScare(event, data) {
  onCharacter("incoming", function (data) {
    if (data.heal > 0) return;
    let orb = character.slots?.orb;
    if (!orb) return;
    if (!(orb.name == "jacko")) return;
    if (lastScare == null || new Date() - lastScare >= 1000) {
      if (character.mp >= 50 && !is_on_cooldown("scare")) {
        use_skill("scare", data.actor);
        lastScare = new Date();
      }
    }
  });
}
module.exports = {};
