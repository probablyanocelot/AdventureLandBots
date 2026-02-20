#!/usr/bin/env node
/*
  Logs symbol definitions/usages for AdventureLandBots/lib.

  Usage:
    node scripts/log-lib-symbols.js
    node scripts/log-lib-symbols.js --json
    node scripts/log-lib-symbols.js --out symbol-report.json --json
*/

const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const libRoot = path.join(cwd, "lib");

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const outIndex = process.argv.findIndex((a) => a === "--out");
const outFile = outIndex >= 0 ? process.argv[outIndex + 1] : null;

if (!fs.existsSync(libRoot)) {
  console.error(`[symbol-scan] lib directory not found: ${libRoot}`);
  process.exit(1);
}

/** @param {string} dir */
function walkJsFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        out.push(full);
      }
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

/** @param {string} source */
function stripCommentsAndStrings(source) {
  // Fast/approximate: removes comments + strings so usage matching is less noisy.
  // Keeps newlines to preserve line numbers.
  let s = source;
  s = s.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    "\n".repeat((m.match(/\n/g) || []).length),
  );
  s = s.replace(/\/\/.*$/gm, "");
  s = s.replace(/`(?:\\.|[^`])*`/g, "``");
  s = s.replace(/'(?:\\.|[^'])*'/g, "''");
  s = s.replace(/"(?:\\.|[^"])*"/g, '""');
  return s;
}

/** @param {string} content @param {string} relFile */
function collectDefinitions(content, relFile) {
  const defs = [];
  const lines = content.split(/\r?\n/);

  const addDef = (name, type, line, col) => {
    if (!name) return;
    if (!/^[A-Za-z_$][\w$]*$/.test(name)) return;
    defs.push({
      name,
      type,
      file: relFile,
      line,
      col,
    });
  };

  lines.forEach((lineText, idx) => {
    const lineNo = idx + 1;

    const fnDecl = lineText.match(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (fnDecl) addDef(fnDecl[1], "function", lineNo, fnDecl.index + 1);

    const classDecl = lineText.match(/\bclass\s+([A-Za-z_$][\w$]*)\b/);
    if (classDecl) addDef(classDecl[1], "class", lineNo, classDecl.index + 1);

    const constArrow = lineText.match(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    );
    if (constArrow)
      addDef(constArrow[1], "arrow", lineNo, constArrow.index + 1);

    const constFnExpr = lineText.match(
      /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\b/,
    );
    if (constFnExpr)
      addDef(constFnExpr[1], "function_expr", lineNo, constFnExpr.index + 1);

    const exportObjPair = lineText.match(/\bmodule\.exports\s*=\s*\{([^}]*)\}/);
    if (exportObjPair) {
      const body = exportObjPair[1];
      const names = body.match(/[A-Za-z_$][\w$]*/g) || [];
      for (const n of names)
        addDef(n, "module_export", lineNo, lineText.indexOf(n) + 1);
    }
  });

  return defs;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const absFiles = walkJsFiles(libRoot);
const fileData = absFiles.map((abs) => {
  const rel = path.relative(cwd, abs).replace(/\\/g, "/");
  const raw = fs.readFileSync(abs, "utf8");
  return {
    abs,
    rel,
    raw,
    stripped: stripCommentsAndStrings(raw),
  };
});

const allDefs = [];
for (const f of fileData) {
  allDefs.push(...collectDefinitions(f.raw, f.rel));
}

// Merge defs by symbol name.
const byName = new Map();
for (const d of allDefs) {
  if (!byName.has(d.name)) {
    byName.set(d.name, {
      name: d.name,
      definitionCount: 0,
      definitions: [],
      usageCount: 0,
      usagesByFile: {},
    });
  }
  const row = byName.get(d.name);
  row.definitionCount += 1;
  row.definitions.push({
    file: d.file,
    line: d.line,
    col: d.col,
    type: d.type,
  });
}

// Count usages across stripped content.
for (const [name, row] of byName) {
  const re = new RegExp(`\\b${escapeRegex(name)}\\b`, "g");
  for (const f of fileData) {
    const matches = f.stripped.match(re);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      row.usageCount += count;
      row.usagesByFile[f.rel] = count;
    }
  }

  // Approximate: usage includes definition occurrence(s), subtract number of defs.
  row.usageCount = Math.max(0, row.usageCount - row.definitionCount);
  for (const def of row.definitions) {
    if (row.usagesByFile[def.file]) {
      row.usagesByFile[def.file] = Math.max(0, row.usagesByFile[def.file] - 1);
      if (row.usagesByFile[def.file] === 0) delete row.usagesByFile[def.file];
    }
  }
}

const symbols = [...byName.values()].sort((a, b) => {
  if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
  return a.name.localeCompare(b.name);
});

const report = {
  generatedAt: new Date().toISOString(),
  root: cwd.replace(/\\/g, "/"),
  scope: "lib/**/*.js",
  fileCount: fileData.length,
  symbolCount: symbols.length,
  symbols,
};

if (outFile) {
  const outPath = path.isAbsolute(outFile) ? outFile : path.join(cwd, outFile);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`[symbol-scan] wrote ${outPath}`);
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`[symbol-scan] scanned ${report.fileCount} files in lib/`);
console.log(`[symbol-scan] found ${report.symbolCount} symbols`);
console.log("");

const top = symbols.slice(0, 80);
for (const s of top) {
  const defs = s.definitions
    .map((d) => `${d.file}:${d.line} (${d.type})`)
    .join(", ");
  console.log(`${s.name}`);
  console.log(`  defs: ${s.definitionCount}  uses: ${s.usageCount}`);
  console.log(`  where defined: ${defs}`);

  const usageEntries = Object.entries(s.usagesByFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (usageEntries.length) {
    const summary = usageEntries
      .map(([file, cnt]) => `${file}(${cnt})`)
      .join(", ");
    console.log(`  usage files: ${summary}`);
  }
  console.log("");
}

if (symbols.length > top.length) {
  console.log(
    `[symbol-scan] showing top ${top.length}. Use --json or --out for full report.`,
  );
}
