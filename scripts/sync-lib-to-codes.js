const fs = require("fs");
const path = require("path");

const SOURCE_LIB_DIR = path.resolve(__dirname, "../lib");
const WATCH_INTERVAL_MS = 250;

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

const walkFiles = (rootDir, acc = []) => {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolute, acc);
      continue;
    }
    if (entry.isFile()) acc.push(absolute);
  }
  return acc;
};

const listDirectories = (rootDir, acc = []) => {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const absolute = path.join(rootDir, entry.name);
    acc.push(absolute);
    listDirectories(absolute, acc);
  }
  return acc;
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

const toRelativePosix = (fromRoot, absolutePath) =>
  path.relative(fromRoot, absolutePath).split(path.sep).join("/");

const mirrorLib = (sourceDir, targetLibDir) => {
  fs.mkdirSync(targetLibDir, { recursive: true });

  const sourceFiles = walkFiles(sourceDir);
  const sourceRelSet = new Set(
    sourceFiles.map((absolute) => toRelativePosix(sourceDir, absolute)),
  );

  let copied = 0;
  for (const srcAbsolute of sourceFiles) {
    const relative = toRelativePosix(sourceDir, srcAbsolute);
    const dstAbsolute = path.join(targetLibDir, relative);
    if (!fileNeedsCopy(srcAbsolute, dstAbsolute)) continue;
    ensureParentDir(dstAbsolute);
    fs.copyFileSync(srcAbsolute, dstAbsolute);
    copied += 1;
  }

  let removed = 0;
  if (fs.existsSync(targetLibDir)) {
    const targetFiles = walkFiles(targetLibDir);
    for (const dstAbsolute of targetFiles) {
      const relative = toRelativePosix(targetLibDir, dstAbsolute);
      if (sourceRelSet.has(relative)) continue;
      fs.rmSync(dstAbsolute, { force: true });
      removed += 1;
    }

    const dirs = listDirectories(targetLibDir)
      .sort((a, b) => b.length - a.length)
      .filter((dir) => fs.existsSync(dir));
    for (const dir of dirs) {
      try {
        const contents = fs.readdirSync(dir);
        if (!contents.length) fs.rmdirSync(dir);
      } catch {
        // ignore
      }
    }
  }

  return { copied, removed };
};

const main = () => {
  if (!fs.existsSync(SOURCE_LIB_DIR)) {
    throw new Error(`Source lib directory does not exist: ${SOURCE_LIB_DIR}`);
  }

  const targetCodesDir = resolveTargetCodesDir();
  if (!targetCodesDir) {
    throw new Error(
      "Could not locate autosync codes directory. Set AL_AUTOSYNC_CODES_DIR and run again.",
    );
  }

  const targetLibDir = path.join(targetCodesDir, "lib");
  const watchMode = !process.argv.includes("--once");

  const runMirror = () => {
    const { copied, removed } = mirrorLib(SOURCE_LIB_DIR, targetLibDir);
    console.log(
      `[sync:lib] Mirrored ${SOURCE_LIB_DIR} -> ${targetLibDir} (copied: ${copied}, removed: ${removed})`,
    );
  };

  runMirror();

  if (!watchMode) {
    return;
  }

  let pending = null;
  const scheduleMirror = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(() => {
      pending = null;
      try {
        runMirror();
      } catch (err) {
        console.error(
          `[sync:lib] Mirror failed: ${err && err.message ? err.message : err}`,
        );
      }
    }, WATCH_INTERVAL_MS);
  };

  const watcher = fs.watch(SOURCE_LIB_DIR, { recursive: true }, () => {
    scheduleMirror();
  });

  watcher.on("error", (err) => {
    console.error(
      `[sync:lib] Watcher error: ${err && err.message ? err.message : err}`,
    );
  });

  console.log(`[sync:lib] Watching ${SOURCE_LIB_DIR}`);
  console.log("[sync:lib] Press Ctrl+C to stop.");
};

try {
  main();
} catch (err) {
  console.error(`[sync:lib] ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
}
