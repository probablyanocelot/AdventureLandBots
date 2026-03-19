// Orchestrator service wrapper.
// Purpose: expose a stable service API via service-owned implementation.

const { Orchestrator } = await require("./orchestrator_runtime.js");
const { validateOrchestratorService } =
  await require("../../contracts/orchestrator_api.js");

class OrchestratorService {
  constructor() {
    this._inner = new Orchestrator();
  }

  async init() {
    return this._inner.init();
  }

  stopRoutine() {
    return this._inner.stopRoutine();
  }

  dispose() {
    return this._inner.dispose?.();
  }

  [Symbol.dispose]() {
    return this._inner[Symbol.dispose]?.() ?? this.stopRoutine();
  }

  async [Symbol.asyncDispose]() {
    if (typeof this._inner[Symbol.asyncDispose] === "function") {
      return this._inner[Symbol.asyncDispose]();
    }
    return this.stopRoutine();
  }
}

const createOrchestratorModuleService = async () => {
  const service = validateOrchestratorService(new OrchestratorService());
  if (typeof service.init === "function") {
    await service.init();
  }
  return service;
};

module.exports = {
  createOrchestratorModuleService,
};
