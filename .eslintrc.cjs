module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "script",
  },
  ignorePatterns: ["game_codes/**", "examples/**"],
  rules: {
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
