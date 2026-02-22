const asDisposable = (resource) => {
  if (!resource) return null;

  if (typeof resource[Symbol.dispose] === "function") return resource;
  if (typeof resource[Symbol.asyncDispose] === "function") return resource;

  if (typeof resource.dispose === "function") {
    return {
      [Symbol.dispose]() {
        resource.dispose();
      },
      [Symbol.asyncDispose]: async () => {
        resource.dispose();
      },
    };
  }

  if (typeof resource.stop === "function") {
    return {
      [Symbol.dispose]() {
        resource.stop();
      },
      [Symbol.asyncDispose]: async () => {
        resource.stop();
      },
    };
  }

  return null;
};

const installModule = async (installFn, ctx = {}) => {
  if (typeof installFn !== "function") return { ok: false, disposable: null };

  const resource = await installFn(ctx);
  const disposable = asDisposable(resource);

  return {
    ok: true,
    resource,
    disposable,
  };
};

module.exports = {
  asDisposable,
  installModule,
};
