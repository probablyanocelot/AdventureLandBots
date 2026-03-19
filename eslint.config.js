const globals = require("globals");

module.exports = [
  {
    ignores: ["game_codes/**", "examples/**", "lib/dist/**"],
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
              group: ["**/domains/**"],
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
    files: ["lib/modules/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "../domains/**",
                "../runtime/**",
                "../characters/**",
                "../infra/**",
                "../telemetry/**",
              ],
              message:
                "Modules must delegate behavior to services and avoid importing runtime/domain implementations directly.",
            },
            {
              group: ["../services/*/**", "!../services/*/index.js"],
              message:
                "Modules must consume services via public service entrypoints only.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["lib/services/farming/no_event_farming_runtime_impl.js"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: [
      "lib/services/cm/base_character_cm_runtime.js",
      "lib/services/cm/magiport_accept_runtime.js",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["lib/services/events/broadcast_runtime.js"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["lib/services/gathering/**/*.js"],
    rules: {
      "no-restricted-imports": "off",
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
