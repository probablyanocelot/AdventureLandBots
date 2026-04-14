let bootstrapped = false;

const installBankOverview = async ({ enabled = false } = {}) => {
  try {
    if (!enabled) return false;
    if (typeof parent?.enhanced_bank_ui?.show === "function") return true;
    if (bootstrapped) {
      return typeof parent?.enhanced_bank_ui?.show === "function";
    }

    bootstrapped = true;
    await require("../../gui/bank_overview");
    return typeof parent?.enhanced_bank_ui?.show === "function";
  } catch {
    return false;
  }
};

module.exports = {
  installBankOverview,
};
