const { spawn } = require("child_process");

const npmBin = process.platform === "win32" ? "npm.cmd" : "npm";

const hasArg = (flag) => process.argv.includes(flag);

const runDeployFirst = hasArg("--deploy");
const disableSync = hasArg("--no-sync");
const disableTelemetry = hasArg("--no-telemetry");
const dryRun = hasArg("--dry-run");

const CHILD_CONFIGS = [
  {
    id: "sync:lib",
    enabled: !disableSync,
    args: ["run", "sync:lib"],
  },
  {
    id: "telemetry:server",
    enabled: !disableTelemetry,
    args: ["run", "telemetry:server"],
  },
];

const runNpm = (args, id) =>
  new Promise((resolve, reject) => {
    const child = spawn(npmBin, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("error", (err) => {
      reject(new Error(`[${id}] failed to start: ${err.message}`));
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`[${id}] exited due to signal: ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`[${id}] exited with code ${code}`));
        return;
      }
      resolve();
    });
  });

const main = async () => {
  const enabledChildren = CHILD_CONFIGS.filter((cfg) => cfg.enabled);

  if (!enabledChildren.length && !runDeployFirst) {
    throw new Error(
      "Nothing to run. Remove --no-sync/--no-telemetry or use --deploy.",
    );
  }

  console.log("[dev:runtime] Starting AdventureLandBots dev runtime...");

  if (runDeployFirst) {
    console.log("[dev:runtime] Running initial ingame build/deploy...");
    if (!dryRun) {
      await runNpm(["run", "ingame"], "ingame");
    } else {
      console.log("[dev:runtime] [dry-run] npm run ingame");
    }
  }

  if (!enabledChildren.length) {
    console.log("[dev:runtime] No long-running services enabled; done.");
    return;
  }

  console.log(
    `[dev:runtime] Launching: ${enabledChildren.map((c) => c.id).join(", ")}`,
  );

  if (dryRun) {
    for (const cfg of enabledChildren) {
      console.log(`[dev:runtime] [dry-run] ${npmBin} ${cfg.args.join(" ")}`);
    }
    return;
  }

  const children = enabledChildren.map((cfg) => {
    const child = spawn(npmBin, cfg.args, {
      stdio: "inherit",
      shell: false,
    });
    child.__id = cfg.id;
    return child;
  });

  let shuttingDown = false;
  const shutdown = (reason) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[dev:runtime] Shutting down (${reason})...`);
    for (const child of children) {
      try {
        if (!child.killed) child.kill("SIGINT");
      } catch {
        // ignore
      }
    }
    setTimeout(() => {
      for (const child of children) {
        try {
          if (!child.killed) child.kill("SIGTERM");
        } catch {
          // ignore
        }
      }
    }, 1000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  for (const child of children) {
    child.on("error", (err) => {
      console.error(
        `[dev:runtime] Child ${child.__id || "unknown"} failed to start: ${err.message}`,
      );
      shutdown(`child error: ${child.__id || "unknown"}`);
      process.exitCode = 1;
    });

    child.on("exit", (code, signal) => {
      if (shuttingDown) return;
      const id = child.__id || "unknown";
      if (signal) {
        console.warn(`[dev:runtime] Child ${id} exited via signal ${signal}.`);
      } else {
        console.warn(`[dev:runtime] Child ${id} exited with code ${code}.`);
      }
      process.exitCode = code && code !== 0 ? code : 1;
      shutdown(`child exit: ${id}`);
    });
  }
};

main().catch((err) => {
  console.error(`[dev:runtime] ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
