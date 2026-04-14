const { test } = require("node:test");
const assert = require("node:assert");
const {
  validateUpkeepService,
  validateUnpackRequesterService,
} = require("../lib/contracts/cm_api.js");
const { installModule } = require("../lib/runtime/module_contract.js");

function createDisposableResource() {
  let disposed = false;
  return {
    dispose() {
      disposed = true;
    },
    get disposed() {
      return disposed;
    },
  };
}

test("CM service contract validation accepts valid upkeep service", () => {
  const service = { stopRoutine: () => {} };
  assert.strictEqual(validateUpkeepService(service), service);
});

test("CM service contract validation rejects invalid upkeep service", () => {
  assert.throws(() => validateUpkeepService({}), {
    name: "TypeError",
    message:
      /CM upkeep service contract violation: expected method stopRoutine\(\)/,
  });
});

test("CM service contract validation accepts valid unpack requester service", () => {
  const service = { stopRoutine: () => {} };
  assert.strictEqual(validateUnpackRequesterService(service), service);
});

test("installModule returns disposable wrapper and preserves dispose()", async () => {
  const resource = createDisposableResource();
  const result = await installModule(async () => resource);

  assert.strictEqual(result.ok, true);
  assert.ok(result.disposable);
  result.disposable[Symbol.dispose]();
  assert.strictEqual(resource.disposed, true);
});

test("installModule returns disposable wrapper for stop() branch", async () => {
  let stopped = false;
  const resource = {
    stop() {
      return null;
    },
    stopRoutine() {
      stopped = true;
    },
  };

  const result = await installModule(async () => resource);
  assert.strictEqual(result.ok, true);
  assert.ok(result.disposable);
  result.disposable[Symbol.dispose]();
  assert.strictEqual(stopped, true);
});
