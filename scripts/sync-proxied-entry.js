const fs = require("fs");
const path = require("path");

const SOURCE_ENTRY = path.resolve(__dirname, "../lib/zCLIENT_BOOTSTRAP.js");
const WATCH_INTERVAL_MS = 250;
const TARGET_FILENAME = "93proxied_entry.93.js";

const listAutosyncCodeDirs = (appDataRoot) => {
  let entries = [];
  try {
    entries = fs.readdirSync(appDataRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("autosync"))
    .map((entry) =>
      path.join(appDataRoot, entry.name, "adventureland", "codes"),
    )
    .filter((candidate) => fs.existsSync(candidate));
};

const pickMostRecentDir = (dirs) => {
  if (!dirs.length) return null;

  const ranked = dirs
    .map((dir) => {
      try {
        return { dir, mtimeMs: fs.statSync(dir).mtimeMs };
      } catch {
        return { dir, mtimeMs: 0 };
      }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return ranked[0].dir;
};

const resolveTargetCodesDir = () => {
  const explicit = process.env.AL_AUTOSYNC_CODES_DIR;
  if (explicit && fs.existsSync(explicit)) return explicit;

  const appData = process.env.APPDATA;
  if (!appData) return null;

  const appDataRoot = path.join(appData, "Adventure Land");
  const candidates = listAutosyncCodeDirs(appDataRoot);
  return pickMostRecentDir(candidates);
};

const fileNeedsCopy = (src, dst) => {
  try {
    const srcStat = fs.statSync(src);
    const dstStat = fs.statSync(dst);
    return srcStat.size !== dstStat.size || srcStat.mtimeMs > dstStat.mtimeMs;
  } catch {
    return true;
  }
};

const ensureParentDir = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const main = () => {
  if (!fs.existsSync(SOURCE_ENTRY)) {
    throw new Error(`Source entry file does not exist: ${SOURCE_ENTRY}`);
  }

  const targetCodesDir = resolveTargetCodesDir();
  if (!targetCodesDir) {
    throw new Error(
      "Could not locate autosync codes directory. Set AL_AUTOSYNC_CODES_DIR and run again.",
    );
  }

  const targetPath = path.join(targetCodesDir, TARGET_FILENAME);
  const watchMode = !process.argv.includes("--once");

  const runCopy = () => {
    if (!fileNeedsCopy(SOURCE_ENTRY, targetPath)) return;
    ensureParentDir(targetPath);
    fs.copyFileSync(SOURCE_ENTRY, targetPath);
    console.log(`[sync:entry] Copied -> ${targetPath}`);
  };

  runCopy();

  if (!watchMode) return;

  let pending = null;
  const scheduleCopy = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      try {
        runCopy();
      } catch (err) {
        console.error(
          `[sync:entry] Copy failed: ${err && err.message ? err.message : err}`,
        );
      }
    }, WATCH_INTERVAL_MS);
  };

  const watcher = fs.watch(SOURCE_ENTRY, () => {
    scheduleCopy();
  });

  watcher.on("error", (err) => {
    console.error(
      `[sync:entry] Watcher error: ${err && err.message ? err.message : err}`,
    );
  });

  console.log(`[sync:entry] Watching ${SOURCE_ENTRY}`);
  console.log("[sync:entry] Press Ctrl+C to stop.");
};

try {
  main();
} catch (err) {
  console.error(`[sync:entry] ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
}
