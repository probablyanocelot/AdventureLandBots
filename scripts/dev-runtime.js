const { spawn } = require("child_process");
const net = require("net");
const { getTelemetryWsPort } = require("../lib/al_env_config.js");

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : "npm";
const npmArgPrefix = npmExecPath ? [npmExecPath] : [];
const npmSpawnOptions = {
  stdio: "inherit",
  shell: process.platform === "win32" && !npmExecPath,
};

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

const spawnNpm = (args) =>
  spawn(npmCommand, [...npmArgPrefix, ...args], npmSpawnOptions);

const probePortOnHost = (port, host) =>
  new Promise((resolve) => {
    const p = Number(port);
    if (!Number.isFinite(p) || p <= 0) {
      resolve(false);
      return;
    }

    const socket = new net.Socket();
    let done = false;
    const finish = (inUse) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(inUse);
    };

    socket.setTimeout(400);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", (err) => {
      if (err && (err.code === "ECONNREFUSED" || err.code === "EHOSTUNREACH")) {
        finish(false);
        return;
      }
      finish(false);
    });

    try {
      socket.connect(p, host);
    } catch {
      finish(false);
    }
  });

const isPortInUse = async (port) => {
  for (const host of ["127.0.0.1", "::1", "localhost"]) {
    // eslint-disable-next-line no-await-in-loop
    const used = await probePortOnHost(port, host);
    if (used) return true;
  }
  return false;
};

const runNpm = (args, id) =>
  new Promise((resolve, reject) => {
    const child = spawnNpm(args);

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
  let enabledChildren = CHILD_CONFIGS.filter((cfg) => cfg.enabled);

  const telemetryPort = getTelemetryWsPort();
  if (
    telemetryPort &&
    enabledChildren.some((cfg) => cfg.id === "telemetry:server")
  ) {
    const telemetryPortBusy = await isPortInUse(telemetryPort);
    if (telemetryPortBusy) {
      enabledChildren = enabledChildren.filter(
        (cfg) => cfg.id !== "telemetry:server",
      );
      console.warn(
        `[dev:runtime] Skipping telemetry:server because ws://localhost:${telemetryPort} is already in use (likely an existing telemetry server instance).`,
      );
    }
  }

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
      console.log(
        `[dev:runtime] [dry-run] ${npmCommand} ${[...npmArgPrefix, ...cfg.args].join(" ")}`,
      );
    }
    return;
  }

  const children = enabledChildren.map((cfg) => {
    const child = spawnNpm(cfg.args);
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
