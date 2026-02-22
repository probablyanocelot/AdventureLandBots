const { warn } = await require("../al_debug_log.js");
const { installModule } = await require("./module_contract.js");

const { installTelemetryModule } =
  await require("../modules/telemetry.module.js");
const { installPartyModule } = await require("../modules/party.module.js");
const { installPriestSwapModule } =
  await require("../modules/priest_swap.module.js");
const { installJoinEventModule } =
  await require("../modules/join_event.module.js");
const { installUnpackRequesterModule } =
  await require("../modules/unpack_requester.module.js");
const { installEventCombatModule } =
  await require("../modules/event_combat.module.js");
const { installSustainModule } = await require("../modules/sustain.module.js");
const { installNoEventFarmingModule } =
  await require("../modules/no_event_farming.module.js");
const { installOrchestratorModule } =
  await require("../modules/orchestrator.module.js");

const MODULE_INSTALLERS = {
  telemetry: installTelemetryModule,
  priestSwap: installPriestSwapModule,
  party: installPartyModule,
  autoParty: installPartyModule,
  joinEvent: installJoinEventModule,
  unpackRequester: installUnpackRequesterModule,
  eventCombat: installEventCombatModule,
  sustain: installSustainModule,
  noEventFarming: installNoEventFarmingModule,
  orchestrator: installOrchestratorModule,
};

const MODULE_POLICIES = {
  preBot: ["telemetry"],
  merchantPostBot: ["priestSwap", "party", "sustain", "orchestrator"],
  nonMerchantPostBot: [
    "priestSwap",
    "party",
    "joinEvent",
    "unpackRequester",
    "eventCombat",
    "sustain",
    "noEventFarming",
    "orchestrator",
  ],
  passivePostBot: [
    "priestSwap",
    "party",
    "joinEvent",
    "unpackRequester",
    "eventCombat",
    "sustain",
    "noEventFarming",
    "orchestrator",
  ],
};

const registerInstalled = ({ installed, runtimeScope }) => {
  if (!installed?.ok) return;
  if (installed.disposable) runtimeScope?.use?.(installed.disposable);
  else if (installed.resource) runtimeScope?.use?.(installed.resource);
};

const createModuleRegistry = ({
  cfg,
  runtimeScope,
  onInstalled,
  installers,
  policies,
} = {}) => {
  const activeInstallers = {
    ...MODULE_INSTALLERS,
    ...(installers && typeof installers === "object" ? installers : {}),
  };

  const activePolicies = {
    ...MODULE_POLICIES,
    ...(policies && typeof policies === "object" ? policies : {}),
  };

  const startModule = async (moduleName) => {
    const installFn = activeInstallers[moduleName];
    if (!installFn) return;

    try {
      const installed = await installModule(installFn, { cfg, runtimeScope });
      registerInstalled({ installed, runtimeScope });
      if (typeof onInstalled === "function") {
        onInstalled(moduleName, installed);
      }
    } catch (e) {
      warn(`Failed to start module '${moduleName}'`, e);
    }
  };

  const startPolicy = async (policyName) => {
    const names = activePolicies[policyName] || [];
    for (const name of names) {
      await startModule(name);
    }
  };

  return {
    startModule,
    startPolicy,
  };
};

module.exports = {
  MODULE_INSTALLERS,
  MODULE_POLICIES,
  createModuleRegistry,
};
