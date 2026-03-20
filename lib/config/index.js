const { DEFAULT_CONFIG } = await require("./defaults.js");
const { getUserConfig } = await require("./runtime_overrides.js");
const { deepMerge, normalizeConfig, getRuntimeContext } =
  await require("./normalizers.js");

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
