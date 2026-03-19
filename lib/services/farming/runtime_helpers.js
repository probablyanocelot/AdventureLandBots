// Farming runtime helpers (service-owned, extraction phase-2).

const PORCUPINE_TARGET = "porcupine";
const PORCUPINE_SWAP_CODE_SLOT = 90;
const MELEE_CTYPES = new Set(["warrior", "paladin", "rogue"]);

const isPorcupineTarget = (target) =>
  typeof target === "string" && target.toLowerCase() === PORCUPINE_TARGET;

const isMeleeCtype = (ctype) => MELEE_CTYPES.has(String(ctype || ""));

const getManualFarmMob = (cfg) => {
  const value = cfg?.noEventFarming?.manualFarmMob;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const getManualFarmMobSelf = (cfg) => {
  const value = cfg?.noEventFarming?.manualFarmMobSelf;
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
};

const savePosition = () => {
  try {
    if (typeof set !== "function") return false;
    set(`${character.id}_position`, {
      server: {
        region: server.region,
        id: server.id,
      },
      time: new Date().toISOString(),
      in: character.in,
      map: character.map,
      x: character.x,
      y: character.y,
    });
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  PORCUPINE_TARGET,
  PORCUPINE_SWAP_CODE_SLOT,
  MELEE_CTYPES,
  isPorcupineTarget,
  isMeleeCtype,
  getManualFarmMob,
  getManualFarmMobSelf,
  savePosition,
};
