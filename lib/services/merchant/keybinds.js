let keybindsInstalled = false;

const normalizeKey = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const installMerchantKeybinds = ({
  enabled = false,
  giveSparesKey = "0",
  devToolsKey = "F12",
} = {}) => {
  try {
    if (!enabled) return false;
    if (keybindsInstalled) return true;
    if (typeof map_key !== "function") return false;

    const normalizedGiveSparesKey = normalizeKey(giveSparesKey, "0");
    const normalizedDevToolsKey = normalizeKey(devToolsKey, "F12");

    map_key(
      normalizedGiveSparesKey,
      "eval",
      'socket.emit("eval",{command: "give spares"})',
    );

    const devToolsBinding = {
      name: "pure_eval",
      code: "electron_dev_tools()",
    };
    if (normalizedDevToolsKey.toUpperCase() === "F12") {
      devToolsBinding.keycode = 123;
    }

    map_key(normalizedDevToolsKey, devToolsBinding);
    keybindsInstalled = true;
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  installMerchantKeybinds,
};
