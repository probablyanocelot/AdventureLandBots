const fs = require("fs");
const os = require("os");
const path = require("path");

const lockFilePath = path.join(os.tmpdir(), "adventure-land-lib-sync.lock");
const sourceScriptPath = path.join(__dirname, "sync-lib-to-codes.js");

const isPidAlive = (pid) => {
  try {
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const clearLock = () => {
  try {
    if (!fs.existsSync(lockFilePath)) return;
    const existing = fs.readFileSync(lockFilePath, "utf8").trim();
    if (existing === String(process.pid)) fs.unlinkSync(lockFilePath);
  } catch {
    // ignore
  }
};

const recordLock = () => {
  fs.writeFileSync(lockFilePath, String(process.pid), { encoding: "utf8" });
};

const tryAcquireLock = () => {
  if (fs.existsSync(lockFilePath)) {
    try {
      const existing = parseInt(fs.readFileSync(lockFilePath, "utf8"), 10);
      if (isPidAlive(existing)) {
        console.log(
          `[sync-lib] Another lib sync instance is already running (pid ${existing}). Exiting.`,
        );
        return false;
      }
    } catch {
      // ignore and overwrite stale lock
    }
    try {
      fs.unlinkSync(lockFilePath);
    } catch {
      // ignore
    }
  }

  recordLock();
  return true;
};

const cleanup = () => {
  clearLock();
};

["exit", "SIGINT", "SIGTERM", "SIGHUP", "uncaughtException"].forEach(
  (event) => {
    process.on(event, cleanup);
  },
);

if (!tryAcquireLock()) {
  process.exit(0);
}

require(sourceScriptPath);
