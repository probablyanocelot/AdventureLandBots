const SWAP_ROUTING_DEFAULTS = Object.freeze({
  enabled: true,
  hookName: "AL_BOTS_ROUTE_CHARACTER",
  serverRegion: null,
  serverIdentifier: null,
  navigateImmediately: false,
  allowRuntimeOverrides: true,
});

const SWAP_ROUTING_LAST_REQUEST_STORAGE_KEY = "albots:swapRouting:lastRequest";

const SWAP_ROUTING_ENABLED_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_ENABLED",
  "albots:swapRouting:enabled",
];

const SWAP_ROUTING_HOOK_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_HOOK",
  "albots:swapRouting:hookName",
];

const SWAP_ROUTING_REGION_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_SERVER_REGION",
  "albots:swapRouting:serverRegion",
];

const SWAP_ROUTING_IDENTIFIER_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_SERVER_IDENTIFIER",
  "albots:swapRouting:serverIdentifier",
];

const SWAP_ROUTING_NAVIGATE_STORAGE_KEYS = [
  "AL_BOTS_SWAP_ROUTING_NAVIGATE",
  "albots:swapRouting:navigateImmediately",
];

const storageGet = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
};

const pickFirstDefined = (keys, mapper) => {
  for (const key of keys) {
    const value = mapper(storageGet(key));
    if (value !== undefined && value !== null) return value;
  }
  return null;
};

const asTrimmedString = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const asBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return null;

  const lowered = value.trim().toLowerCase();
  if (!lowered) return null;
  if (["1", "true", "yes", "on"].includes(lowered)) return true;
  if (["0", "false", "no", "off"].includes(lowered)) return false;
  return null;
};

const getCurrentServerRegion = () =>
  asTrimmedString(
    window?.server_region ||
      window?.parent?.server_region ||
      window?.server?.region ||
      window?.parent?.server?.region,
  );

const getCurrentServerIdentifier = () =>
  asTrimmedString(
    window?.server_identifier ||
      window?.parent?.server_identifier ||
      window?.server?.id ||
      window?.parent?.server?.id,
  );

const normalizeSwapRoutingConfig = (cfg = {}) => ({
  enabled: Boolean(cfg.enabled),
  hookName: asTrimmedString(cfg.hookName) || SWAP_ROUTING_DEFAULTS.hookName,
  serverRegion: asTrimmedString(cfg.serverRegion) || getCurrentServerRegion(),
  serverIdentifier:
    asTrimmedString(cfg.serverIdentifier) || getCurrentServerIdentifier(),
  navigateImmediately: Boolean(cfg.navigateImmediately),
  allowRuntimeOverrides: cfg.allowRuntimeOverrides !== false,
});

const buildCharacterRouteHref = ({
  targetName,
  serverRegion,
  serverIdentifier,
} = {}) => {
  const resolvedTarget = asTrimmedString(targetName);
  const resolvedRegion =
    asTrimmedString(serverRegion) || getCurrentServerRegion();
  const resolvedIdentifier =
    asTrimmedString(serverIdentifier) || getCurrentServerIdentifier();

  if (!resolvedTarget || !resolvedRegion || !resolvedIdentifier) return null;

  return `/character/${encodeURIComponent(resolvedTarget)}/in/${encodeURIComponent(
    resolvedRegion,
  )}/${encodeURIComponent(resolvedIdentifier)}/`;
};

const persistSwapRoutingRequest = (payload) => {
  try {
    if (typeof window !== "undefined") {
      window.AL_BOTS_LAST_SWAP_ROUTE = payload;
    }
  } catch {
    // ignore
  }

  try {
    storageSet(SWAP_ROUTING_LAST_REQUEST_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

const normalizeSwapRoutingPayload = ({ route, targetName, ...rest } = {}) => {
  const href =
    asTrimmedString(route?.href) ||
    buildCharacterRouteHref({
      targetName,
      serverRegion: route?.serverRegion,
      serverIdentifier: route?.serverIdentifier,
    });

  return {
    ...rest,
    targetName:
      asTrimmedString(targetName) || asTrimmedString(route?.targetName),
    route: href
      ? {
          ...(route && typeof route === "object" ? route : {}),
          href,
          serverRegion: asTrimmedString(route?.serverRegion) || null,
          serverIdentifier: asTrimmedString(route?.serverIdentifier) || null,
        }
      : route || null,
  };
};

const applySwapRoutingPayload = (payload, { navigate = true } = {}) => {
  const normalized = normalizeSwapRoutingPayload(payload || {});
  const href = asTrimmedString(normalized?.route?.href);

  if (!href) {
    return {
      ok: false,
      handled: false,
      reason: "missing-href",
      payload: normalized,
    };
  }

  persistSwapRoutingRequest(normalized);

  if (!navigate) {
    return {
      ok: true,
      handled: false,
      pending: true,
      href,
      payload: normalized,
    };
  }

  try {
    parent.window.location.href = href;
    return {
      ok: true,
      handled: true,
      navigated: true,
      href,
      payload: normalized,
    };
  } catch (e) {
    return {
      ok: false,
      handled: false,
      href,
      payload: normalized,
      error: e,
    };
  }
};

const resolveSwapRoutingConfig = () => {
  try {
    const runtimeCfg =
      typeof window !== "undefined" &&
      window.AL_BOTS_SWAP_ROUTING &&
      typeof window.AL_BOTS_SWAP_ROUTING === "object"
        ? window.AL_BOTS_SWAP_ROUTING
        : null;

    const merged = {
      ...SWAP_ROUTING_DEFAULTS,
      ...(runtimeCfg || {}),
    };

    if (merged.allowRuntimeOverrides !== false) {
      const enabled = pickFirstDefined(
        SWAP_ROUTING_ENABLED_STORAGE_KEYS,
        asBoolean,
      );
      const hookName = pickFirstDefined(
        SWAP_ROUTING_HOOK_STORAGE_KEYS,
        asTrimmedString,
      );
      const serverRegion = pickFirstDefined(
        SWAP_ROUTING_REGION_STORAGE_KEYS,
        asTrimmedString,
      );
      const serverIdentifier = pickFirstDefined(
        SWAP_ROUTING_IDENTIFIER_STORAGE_KEYS,
        asTrimmedString,
      );
      const navigateImmediately = pickFirstDefined(
        SWAP_ROUTING_NAVIGATE_STORAGE_KEYS,
        asBoolean,
      );

      if (enabled !== null) merged.enabled = enabled;
      if (hookName) merged.hookName = hookName;
      if (serverRegion) merged.serverRegion = serverRegion;
      if (serverIdentifier) merged.serverIdentifier = serverIdentifier;
      if (navigateImmediately !== null) {
        merged.navigateImmediately = navigateImmediately;
      }
    }

    return normalizeSwapRoutingConfig(merged);
  } catch {
    return normalizeSwapRoutingConfig(SWAP_ROUTING_DEFAULTS);
  }
};

const installSwapRoutingHook = (swapRouting) => {
  try {
    if (typeof window === "undefined") return null;

    const cfg = normalizeSwapRoutingConfig(swapRouting);
    const hookName = cfg.hookName || SWAP_ROUTING_DEFAULTS.hookName;
    const existing = window[hookName];
    if (
      typeof existing === "function" &&
      existing.__AL_BOTS_AUTO_ROUTE_HOOK__ !== true
    ) {
      return existing;
    }

    const autoHook = ({ route, targetName, ...rest } = {}) => {
      const payload = normalizeSwapRoutingPayload({
        ...rest,
        targetName,
        route: {
          ...(route && typeof route === "object" ? route : {}),
          serverRegion:
            asTrimmedString(route?.serverRegion) || cfg.serverRegion || null,
          serverIdentifier:
            asTrimmedString(route?.serverIdentifier) ||
            cfg.serverIdentifier ||
            null,
        },
      });

      try {
        console.log("[ALBots swap-routing] route requested", payload);
      } catch {
        // ignore
      }

      persistSwapRoutingRequest(payload);

      if (cfg.enabled && cfg.navigateImmediately) {
        return applySwapRoutingPayload(payload, { navigate: true });
      }

      return {
        ok: true,
        handled: false,
        pending: true,
        href: payload?.route?.href || null,
        payload,
      };
    };

    autoHook.__AL_BOTS_AUTO_ROUTE_HOOK__ = true;
    window[hookName] = autoHook;
    window.AL_BOTS_BUILD_CHARACTER_ROUTE = buildCharacterRouteHref;
    window.AL_BOTS_APPLY_SWAP_ROUTE = (payload) =>
      applySwapRoutingPayload(payload, { navigate: true });
    window.AL_BOTS_APPLY_LAST_SWAP_ROUTE = () =>
      applySwapRoutingPayload(window.AL_BOTS_LAST_SWAP_ROUTE, {
        navigate: true,
      });

    return autoHook;
  } catch {
    return null;
  }
};

const applySwapRoutingBootstrap = () => {
  const swapRouting = resolveSwapRoutingConfig();

  const currentCfg =
    window.AL_BOTS_CONFIG && typeof window.AL_BOTS_CONFIG === "object"
      ? window.AL_BOTS_CONFIG
      : {};
  const baseSwapRouting =
    currentCfg.swapRouting && typeof currentCfg.swapRouting === "object"
      ? currentCfg.swapRouting
      : {};

  window.AL_BOTS_CONFIG = {
    ...currentCfg,
    swapRouting: {
      ...baseSwapRouting,
      enabled: swapRouting.enabled,
      hookName: swapRouting.hookName,
      serverRegion: swapRouting.serverRegion,
      serverIdentifier: swapRouting.serverIdentifier,
    },
  };

  installSwapRoutingHook(swapRouting);
};

module.exports = {
  applySwapRoutingBootstrap,
};
