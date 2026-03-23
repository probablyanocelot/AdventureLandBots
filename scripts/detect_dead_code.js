// detect_dead_code.js
// Scans for unused exports in AdventureLandBots/lib and scripts
// Usage: node detect_dead_code.js

const fs = require("fs");
const path = require("path");

const ROOTS = [
  path.join(__dirname, "../lib"),
  path.join(__dirname, "../scripts"),
];

function getAllJsFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath));
    } else if (file.endsWith(".js")) {
      results.push(fullPath);
    }
  });
  return results;
}

function getExports(file) {
  const content = fs.readFileSync(file, "utf8");
  // CommonJS: module.exports = { foo, bar }, exports.foo = ...
  const re1 = /exports\.(\w+)\s*=|module\.exports\s*=\s*{([^}]*)}/g;
  let match;
  let exportsList = [];
  while ((match = re1.exec(content))) {
    if (match[1]) exportsList.push(match[1]);
    if (match[2]) {
      exportsList.push(
        ...match[2]
          .split(",")
          .map((s) => s.split(":")[0].trim())
          .filter(Boolean),
      );
    }
  }
  // ES6: export function foo, export const bar, export default
  const re2 = /export\s+(?:function|const|let|var|class)\s+(\w+)/g;
  while ((match = re2.exec(content))) {
    if (match[1]) exportsList.push(match[1]);
  }
  return Array.from(new Set(exportsList));
}

function findUsages(symbol, files, skipFile) {
  // Escape special regex characters in symbol
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "g");
  let used = false;
  for (const file of files) {
    if (file === skipFile) continue;
    const content = fs.readFileSync(file, "utf8");
    if (re.test(content)) {
      used = true;
      break;
    }
  }
  return used;
}

function main() {
  let allFiles = [];
  for (const root of ROOTS) {
    if (fs.existsSync(root)) {
      allFiles = allFiles.concat(getAllJsFiles(root));
    }
  }
  let dead = [];
  for (const file of allFiles) {
    const exportsList = getExports(file);
    for (const symbol of exportsList) {
      if (!findUsages(symbol, allFiles, file)) {
        dead.push({ file, symbol });
      }
    }
  }
  if (dead.length === 0) {
    console.log("No dead exports found.");
  } else {
    console.warn("Potential dead exports:");
    dead.forEach((d) => {
      console.warn(`  ${d.symbol} in ${path.relative(process.cwd(), d.file)}`);
    });
  }
}

if (require.main === module) {
  main();
}
