const fs = require("fs");
const path = require("path");

const SOURCE_BUNDLE = path.resolve(
  __dirname,
  "../dist/ingame/95webpack_bootstrap.95.js",
);

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
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const appData = process.env.APPDATA;
  if (!appData) return null;

  const appDataRoot = path.join(appData, "Adventure Land");
  const candidates = listAutosyncCodeDirs(appDataRoot);
  return pickMostRecentDir(candidates);
};

const main = () => {
  if (!fs.existsSync(SOURCE_BUNDLE)) {
    throw new Error(
      `In-game bundle not found at ${SOURCE_BUNDLE}. Run npm run build:ingame first.`,
    );
  }

  const targetCodesDir = resolveTargetCodesDir();
  if (!targetCodesDir) {
    throw new Error(
      "Could not locate autosync codes directory. Set AL_AUTOSYNC_CODES_DIR and run again.",
    );
  }

  const targetPath = path.join(targetCodesDir, path.basename(SOURCE_BUNDLE));
  fs.copyFileSync(SOURCE_BUNDLE, targetPath);

  console.log(`[deploy:ingame] Copied bundle to: ${targetPath}`);
  console.log(
    "[deploy:ingame] In game, run load_code(95) or place load_code(95) in your main slot.",
  );
};

try {
  main();
} catch (err) {
  console.error(`[deploy:ingame] ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
}
