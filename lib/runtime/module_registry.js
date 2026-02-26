// Module registry and policy resolver.
// Purpose: map module names to installers and start modules by policy.
// Inputs: config/runtime scope/install callbacks and optional installer/policy overrides.
// Side effects: installs modules and registers disposables into runtime scope.
// Contract: module installers are normalized through `installModule(installFn, ctx)`.

const { warn } = await require("../al_debug_log.js");
const { installModule } = await require("./module_contract.js");

const telemetryModule = await require("../modules/telemetry.module.js");
const partyModule = await require("../modules/party.module.js");
const priestSwapModule = await require("../modules/priest_swap.module.js");
const joinEventModule = await require("../modules/join_event.module.js");
const unpackRequesterModule =
  await require("../modules/unpack_requester.module.js");
const eventCombatModule = await require("../modules/event_combat.module.js");
const sustainModule = await require("../modules/sustain.module.js");
const noEventFarmingModule =
  await require("../modules/no_event_farming.module.js");
const orchestratorModule = await require("../modules/orchestrator.module.js");

const resolveInstall = (mod, legacyName) => mod?.install || mod?.[legacyName];

const MODULE_INSTALLERS = {
  telemetry: resolveInstall(telemetryModule, "installTelemetryModule"),
  priestSwap: resolveInstall(priestSwapModule, "installPriestSwapModule"),
  party: resolveInstall(partyModule, "installPartyModule"),
  autoParty: resolveInstall(partyModule, "installPartyModule"),
  joinEvent: resolveInstall(joinEventModule, "installJoinEventModule"),
  unpackRequester: resolveInstall(
    unpackRequesterModule,
    "installUnpackRequesterModule",
  ),
  eventCombat: resolveInstall(eventCombatModule, "installEventCombatModule"),
  sustain: resolveInstall(sustainModule, "installSustainModule"),
  noEventFarming: resolveInstall(
    noEventFarmingModule,
    "installNoEventFarmingModule",
  ),
  orchestrator: resolveInstall(orchestratorModule, "installOrchestratorModule"),
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

const resolvePostBotPolicyName = ({ ctype, isPassive } = {}) => {
  if (isPassive) return "passivePostBot";
  if (ctype === "merchant") return "merchantPostBot";
  return "nonMerchantPostBot";
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

  const resolvePolicy = (policyName, ctx = {}) => {
    if (policyName === "postBot") {
      return resolvePostBotPolicyName({
        ctype: ctx.ctype,
        isPassive: Boolean(ctx.isPassive),
      });
    }
    return policyName;
  };

  const startResolvedPolicy = async (policyName, ctx = {}) => {
    const resolved = resolvePolicy(policyName, ctx);
    await startPolicy(resolved);
    return resolved;
  };

  return {
    startModule,
    startPolicy,
    resolvePolicy,
    startResolvedPolicy,
  };
};

module.exports = {
  MODULE_INSTALLERS,
  MODULE_POLICIES,
  resolvePostBotPolicyName,
  createModuleRegistry,
};
