const { DEFAULT_CONFIG } = require("./defaults.js");
const { getUserConfig } = require("./runtime_overrides.js");
const {
  deepMerge,
  normalizeConfig,
  getRuntimeContext,
} = require("./normalizers.js");

const getConfig = () => {
  const userCfg = getUserConfig();
  const merged = deepMerge(DEFAULT_CONFIG, userCfg);
  return normalizeConfig(merged);
};

module.exports = {
  DEFAULT_CONFIG,
  getConfig,
  getRuntimeContext,
};
