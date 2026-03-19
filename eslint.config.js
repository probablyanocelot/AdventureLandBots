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
    files: ["lib/services/orchestrator/orchestrator_service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../domains/**",
                "!../../domains/orchestrator/index.js",
                "../../al_farming_config.js",
              ],
              message:
                "Orchestrator bridge may only import ../../domains/orchestrator/index.js",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/party/party_service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../domains/**",
                "!../../domains/party/index.js",
                "../../al_farming_config.js",
              ],
              message:
                "Party bridge may only import ../../domains/party/index.js",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/cm/cm_service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../domains/**",
                "!../../domains/cm/index.js",
                "../../al_farming_config.js",
              ],
              message: "CM bridge may only import ../../domains/cm/index.js",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/combat/combat_service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../domains/**",
                "!../../domains/combat/index.js",
                "../../al_farming_config.js",
              ],
              message:
                "Combat bridge may only import ../../domains/combat/index.js",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/events/events_service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../../domains/**",
                "!../../domains/events/index.js",
                "../../al_farming_config.js",
              ],
              message:
                "Events bridge may only import ../../domains/events/index.js",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/farming/farming_service.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../domains/**"],
              message:
                "Farming bridge must not import domains directly (keep aggregation in al_farming_config.js).",
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
