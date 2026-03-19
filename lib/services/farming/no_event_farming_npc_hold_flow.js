// Farming no-event NPC mage hold extraction.
// Purpose: own NPC-mage monsterhunter hold positioning behavior.

const handleNoEventNpcMageHold = ({
  chainCfg,
  character,
  distanceFn,
  requestMoveToMonsterhunter,
} = {}) => {
  if (!chainCfg?.enabled) return { handled: false };
  if (!chainCfg?.npcMageName) return { handled: false };
  if (character?.name !== chainCfg.npcMageName) return { handled: false };

  const nearNpc =
    character?.map === "main" &&
    Number.isFinite(distanceFn?.(character, { x: -278, y: -10 })) &&
    distanceFn(character, { x: -278, y: -10 }) <= 120;

  if (!nearNpc) requestMoveToMonsterhunter?.();

  return {
    handled: true,
    nearNpc,
  };
};

module.exports = {
  handleNoEventNpcMageHold,
};
