const globals = require("globals");

module.exports = [
  {
    ignores: ["game_codes/**", "examples/**"],
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["lib/services/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/domains/**", "**/al_farming_config.js"],
              message:
                "Only designated bridge service wrappers may import legacy domain/farming implementations.",
            },
            {
              group: ["**/services/*/**", "!**/services/*/index.js"],
              message:
                "Import other services through their public index.js only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/farming/no_event_farming_runtime.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../domains/**"],
              message:
                "Farming runtime bridge must not import domains directly (use ../../al_farming_config.js during phase-1 extraction).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/contracts/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/domains/**", "**/services/**", "**/modules/**"],
              message:
                "Contracts must remain implementation-free and not depend on runtime layers.",
            },
          ],
        },
      ],
    },
  },
];
