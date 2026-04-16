const { BotCharacter } = await require("./base_character.js");
const { createIdleStatusShell } = await require("./composition.js");
const { installMageMagiportService } = await require("../services/cm/index.js");
const { getPosition, savePosition } =
  await require("../services/combat/index.js");

class Mage extends BotCharacter {
  constructor(data = parent.character) {
    super(data);
    this.shell = createIdleStatusShell({ label: "Mage" });
    this.idle = this.shell.idle;
    this._mageService = null;
  }

  async init() {
    await super.init();
    try {
      this._mageService?.stop?.();
    } catch {
      // ignore
    }

    this._mageService = installMageMagiportService({
      isConfiguredHuntSideMage: (cfg) => {
        const huntMageName = String(
          cfg?.farming?.aggroLockChain?.huntMageName || "",
        )
          .trim()
          .toLowerCase();
        if (!huntMageName) return false;
        return (
          String(character?.name || "")
            .trim()
            .toLowerCase() === huntMageName
        );
      },
      maybeAnchorHuntMageNearPriest: async ({ cfg }) => {
        const chainCfg = cfg?.farming?.aggroLockChain || {};
        const huntMageName = String(chainCfg?.huntMageName || "")
          .trim()
          .toLowerCase();
        const priestName = chainCfg?.priestName || null;

        if (!huntMageName || !priestName) return;
        if (
          String(character?.name || "")
            .trim()
            .toLowerCase() !== huntMageName
        )
          return;

        try {
          savePosition();
        } catch {
          // ignore
        }

        const priestPos = getPosition(priestName);
        if (!priestPos) return;

        const dest = {
          map: priestPos?.map || character?.map,
          x: Number(priestPos?.x),
          y: Number(priestPos?.y),
        };
        if (!Number.isFinite(dest.x) || !Number.isFinite(dest.y)) return;

        const sameMap = !dest.map || dest.map === character?.map;
        const dist = Number(distance?.(character, dest));
        const nearEnough = sameMap && Number.isFinite(dist) && dist <= 180;
        if (nearEnough) return;

        await smartMove(dest);

        try {
          savePosition();
        } catch {
          // ignore
        }
      },
    });

    return this;
  }

  async botLoop() {
    this.shell.start();
  }

  stopRoutine() {
    try {
      super.stop?.();
    } catch {
      // ignore
    }

    try {
      this._mageService?.stop?.();
    } catch {
      // ignore
    }
    this._mageService = null;

    try {
      this.shell?.stop?.();
    } catch {
      // ignore
    }
  }

  dispose() {
    this.stopRoutine();
  }

  [Symbol.dispose]() {
    this.stopRoutine();
  }

  async [Symbol.asyncDispose]() {
    this.stopRoutine();
  }
}

module.exports = {
  MageCharacter: Mage,
  Mage,
};
