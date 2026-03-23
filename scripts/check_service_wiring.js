// check_service_wiring.js
// Scans lib/ for deep service imports (not via index.js)
/**
 * Run this script to check for deep service imports (should only use index.js):
 *
 *   node check_service_wiring.js
 */
const fs = require("fs");
const path = require("path");

// Always resolve lib/ relative to the AdventureLandBots root, not scripts/
const BOT_ROOT = path.resolve(__dirname, '..');
const LIB_DIR = path.join(BOT_ROOT, 'lib');
const SERVICES_DIR = path.join(LIB_DIR, 'services');

function walk(dir, excludeDirs = []) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (excludeDirs.includes(filePath)) continue;
      results = results.concat(walk(filePath, excludeDirs));
    } else if (file.endsWith(".js")) {
      results.push(filePath);
    }
  }
  return results;
}

function getServiceNames() {
  return fs.readdirSync(SERVICES_DIR).filter((f) => {
    const full = path.join(SERVICES_DIR, f);
    return fs.statSync(full).isDirectory();
  });
}

function scanFile(file, serviceNames) {
  const relFile = path.relative(process.cwd(), file);
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const violations = [];
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    for (const service of serviceNames) {
      // Match require/import of lib/services/<service>/... but not /index.js
      const regex = new RegExp(
        `lib/services/${service}/(?!index\\.js)[^'"\s]+`,
      );
      if (regex.test(line)) {
        violations.push({ line: i + 1, text: line.trim(), service });
      }
    }
  }
  if (violations.length) {
    console.log(`\n${relFile}`);
    for (const v of violations) {
      console.log(`  [${v.service}] Line ${v.line}: ${v.text}`);
    }
  }
}

function main() {
  const serviceNames = getServiceNames();
  // Exclude lib/services/* from scan
  const excludeDirs = serviceNames.map((s) => path.join(SERVICES_DIR, s));
  const files = walk(LIB_DIR, excludeDirs);
  let found = false;
  for (const file of files) {
    scanFile(file, serviceNames);
  }
  console.log(
    "\nScan complete. Any files listed above import service internals directly.",
  );
}

if (require.main === module) {
  main();
}
