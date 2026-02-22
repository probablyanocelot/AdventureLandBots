// Runtime lifecycle helpers for explicit resource cleanup.
// Class-based and Symbol.dispose-friendly.

class LifecycleScope {
  constructor(label = "scope") {
    this.label = label;
    this._disposed = false;
    this._finalizers = [];
  }

  get disposed() {
    return this._disposed;
  }

  add(finalizer) {
    if (typeof finalizer !== "function") return () => false;
    if (this._disposed) {
      try {
        finalizer();
      } catch {
        // ignore
      }
      return () => false;
    }

    this._finalizers.push(finalizer);

    return () => {
      const idx = this._finalizers.lastIndexOf(finalizer);
      if (idx === -1) return false;
      this._finalizers.splice(idx, 1);
      return true;
    };
  }

  use(resource) {
    if (!resource) return resource;

    const disposeSym = Symbol.dispose;
    const asyncDisposeSym = Symbol.asyncDispose;

    if (disposeSym && typeof resource[disposeSym] === "function") {
      this.add(() => resource[disposeSym]());
      return resource;
    }

    if (asyncDisposeSym && typeof resource[asyncDisposeSym] === "function") {
      this.add(() => resource[asyncDisposeSym]());
      return resource;
    }

    if (typeof resource.dispose === "function") {
      this.add(() => resource.dispose());
      return resource;
    }

    if (typeof resource.close === "function") {
      this.add(() => resource.close());
      return resource;
    }

    return resource;
  }

  addInterval(intervalId) {
    if (!intervalId) return intervalId;
    this.add(() => clearInterval(intervalId));
    return intervalId;
  }

  addTimeout(timeoutId) {
    if (!timeoutId) return timeoutId;
    this.add(() => clearTimeout(timeoutId));
    return timeoutId;
  }

  addOff(offFn) {
    if (typeof offFn !== "function") return offFn;
    this.add(() => offFn());
    return offFn;
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    for (let i = this._finalizers.length - 1; i >= 0; i--) {
      const fn = this._finalizers[i];
      try {
        fn();
      } catch {
        // ignore
      }
    }

    this._finalizers.length = 0;
  }

  async disposeAsync() {
    if (this._disposed) return;
    this._disposed = true;

    for (let i = this._finalizers.length - 1; i >= 0; i--) {
      const fn = this._finalizers[i];
      try {
        await fn();
      } catch {
        // ignore
      }
    }

    this._finalizers.length = 0;
  }

  [Symbol.dispose]() {
    this.dispose();
  }

  async [Symbol.asyncDispose]() {
    await this.disposeAsync();
  }
}

module.exports = {
  LifecycleScope,
};
