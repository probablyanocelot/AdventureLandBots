#!/usr/bin/env node
/*
  Finds and fixes broken relative require(...) paths in JS files.

  Strategy (safe-first):
  - Scan target tree and index each module's exported symbols.
  - For each broken relative require("./..."):
      * infer requested symbols from nearby destructuring, e.g. { foo, bar }
      * rank candidate modules by symbol overlap + name/path similarity
      * only apply when confidence is high and not ambiguous

  Usage:
    node scripts/fix-broken-requires.js --root lib
    node scripts/fix-broken-requires.js --root lib --write

  Notes:
  - Dry-run by default (no file writes).
  - Only touches relative requires (./ or ../).
  - Leaves unresolved/ambiguous matches for manual review.
*/

const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const argv = process.argv.slice(2);

const getArgValue = (name, fallback = null) => {
  const idx = argv.findIndex((a) => a === name);
  if (idx < 0) return fallback;
  const val = argv[idx + 1];
  if (!val || val.startsWith("--")) return fallback;
  return val;
};

const hasFlag = (name) => argv.includes(name);

const rootRel = getArgValue("--root", "lib");
const rootAbs = path.resolve(cwd, rootRel);
const write = hasFlag("--write");
const verbose = hasFlag("--verbose");

if (!fs.existsSync(rootAbs) || !fs.statSync(rootAbs).isDirectory()) {
  console.error(`[require-fix] root directory not found: ${rootAbs}`);
  process.exit(1);
}

const KNOWN_PREFIXES = [
  "class_",
  "al_",
  "fn_",
  "st_",
  "cm_",
  "group_",
  "combat_",
  "npc_",
  "rule_",
  "event_",
];

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

function normalizeSlashes(p) {
  return p.replace(/\\/g, "/");
}

function relFromCwd(abs) {
  return normalizeSlashes(path.relative(cwd, abs));
}

function noExt(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function normalizeBaseName(name) {
  let out = name;
  for (const prefix of KNOWN_PREFIXES) {
    if (out.startsWith(prefix)) {
      out = out.slice(prefix.length);
      break;
    }
  }
  return out;
}

function parseExports(source) {
  const symbols = new Set();

  // module.exports = { a, b, c }
  const objExportRegex = /module\.exports\s*=\s*\{([\s\S]*?)\}/g;
  for (const m of source.matchAll(objExportRegex)) {
    const body = m[1] || "";
    const names = body.match(/[A-Za-z_$][\w$]*/g) || [];
    for (const n of names) symbols.add(n);
  }

  // exports.foo = ... / module.exports.foo = ...
  const dotExportRegex = /(?:exports|module\.exports)\.([A-Za-z_$][\w$]*)\s*=/g;
  for (const m of source.matchAll(dotExportRegex)) {
    symbols.add(m[1]);
  }

  // fallback: top-level function/class names can help when exports are indirect
  const fnRegex = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for (const m of source.matchAll(fnRegex)) symbols.add(m[1]);

  const classRegex = /\bclass\s+([A-Za-z_$][\w$]*)\b/g;
  for (const m of source.matchAll(classRegex)) symbols.add(m[1]);

  return symbols;
}

function buildModuleIndex(files) {
  return files.map((abs) => {
    const rel = relFromCwd(abs);
    const base = noExt(path.basename(abs));
    const normalizedBase = normalizeBaseName(base);
    const src = fs.readFileSync(abs, "utf8");

    return {
      abs,
      rel,
      dirAbs: path.dirname(abs),
      base,
      normalizedBase,
      exports: parseExports(src),
      inUnused: rel.includes("/unused/"),
    };
  });
}

function resolveRelativeRequire(fromDirAbs, reqPath) {
  const base = path.resolve(fromDirAbs, reqPath);
  const tryPaths = [
    base,
    `${base}.js`,
    `${base}.json`,
    path.join(base, "index.js"),
  ];
  for (const candidate of tryPaths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function inferRequestedSymbols(lineText) {
  // const { a, b: c } = require("...")
  const destruct = lineText.match(
    /\{([^}]*)\}\s*=\s*(?:await\s+)?require\s*\(/,
  );
  if (!destruct) return [];

  const parts = destruct[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const symbols = [];
  for (const part of parts) {
    // handle aliasing a: localA => requested export is a
    const match = part.match(
      /^([A-Za-z_$][\w$]*)(?:\s*:\s*[A-Za-z_$][\w$]*)?$/,
    );
    if (match) symbols.push(match[1]);
  }
  return symbols;
}

function toRequirePath(fromFileAbs, targetAbs) {
  const fromDir = path.dirname(fromFileAbs);
  let rel = normalizeSlashes(path.relative(fromDir, targetAbs));
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

function scoreCandidate({
  moduleInfo,
  fromFileAbs,
  requestedBase,
  requestedDirParts,
  requestedSymbols,
}) {
  let score = 0;

  // Symbol overlap is strongest signal.
  if (requestedSymbols.length) {
    let overlap = 0;
    for (const sym of requestedSymbols) {
      if (moduleInfo.exports.has(sym)) overlap += 1;
    }
    score += overlap * 20;
    if (overlap === requestedSymbols.length) score += 40;
  }

  const normalizedRequestedBase = normalizeBaseName(requestedBase);
  if (moduleInfo.base === requestedBase) score += 12;
  if (moduleInfo.normalizedBase === normalizedRequestedBase) score += 10;

  const modRelLower = moduleInfo.rel.toLowerCase();
  for (const part of requestedDirParts) {
    if (!part) continue;
    if (modRelLower.includes(`/${part.toLowerCase()}/`)) score += 3;
  }

  // Prefer nearby modules.
  const sameDir = path.dirname(fromFileAbs) === moduleInfo.dirAbs;
  if (sameDir) score += 5;

  // De-prioritize unused/legacy modules unless symbols strongly match.
  if (moduleInfo.inUnused) score -= 12;

  return score;
}

function lineAt(source, index) {
  const start = source.lastIndexOf("\n", index - 1) + 1;
  const end = source.indexOf("\n", index);
  return source.slice(start, end === -1 ? source.length : end);
}

function maskCommentsOnly(source) {
  const chars = Array.from(source);
  const len = chars.length;
  let i = 0;

  const blank = (start, end) => {
    for (let j = start; j < end; j += 1) {
      if (chars[j] !== "\n" && chars[j] !== "\r") chars[j] = " ";
    }
  };

  while (i < len) {
    const ch = chars[i];
    const next = i + 1 < len ? chars[i + 1] : "";

    // line comment
    if (ch === "/" && next === "/") {
      const start = i;
      i += 2;
      while (i < len && chars[i] !== "\n") i += 1;
      blank(start, i);
      continue;
    }

    // block comment
    if (ch === "/" && next === "*") {
      const start = i;
      i += 2;
      while (i < len - 1 && !(chars[i] === "*" && chars[i + 1] === "/")) i += 1;
      i = Math.min(len, i + 2);
      blank(start, i);
      continue;
    }

    // strings/template literals (skip without masking)
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i += 1;
      while (i < len) {
        const cur = chars[i];
        if (cur === "\\") {
          i += 2;
          continue;
        }
        if (quote === "`" && cur === "$" && chars[i + 1] === "{") {
          // Keep scanning through template expression; safe enough for our matcher.
          i += 2;
          continue;
        }
        if (cur === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    i += 1;
  }

  return chars.join("");
}

function findFixesForFile({ fileAbs, source, modules }) {
  const requireRegex = /(?:await\s+)?require\s*\(\s*(["'])([^"']+)\1\s*\)/g;
  const maskedSource = maskCommentsOnly(source);

  /** @type {Array<{start:number,end:number,oldReq:string,newReq:string,score:number,line:string}>} */
  const fixes = [];
  /** @type {Array<{req:string,line:string,reason:string}>} */
  const unresolved = [];

  for (const m of maskedSource.matchAll(requireRegex)) {
    const full = m[0];
    const reqPath = m[2];
    const start = m.index + full.indexOf(reqPath);
    const end = start + reqPath.length;

    // only relative requires
    if (!(reqPath.startsWith("./") || reqPath.startsWith("../"))) continue;

    const fromDir = path.dirname(fileAbs);
    const resolved = resolveRelativeRequire(fromDir, reqPath);
    if (resolved) continue; // already valid

    const reqNorm = normalizeSlashes(reqPath);
    const reqBase = noExt(path.basename(reqNorm));
    const reqDir = normalizeSlashes(path.dirname(reqNorm));
    const reqDirParts = reqDir
      .split("/")
      .filter(Boolean)
      .filter((p) => p !== "." && p !== "..");

    const line = lineAt(source, m.index);
    const requestedSymbols = inferRequestedSymbols(line);

    const candidates = modules
      .filter((mod) => mod.abs !== fileAbs)
      .map((mod) => ({
        mod,
        score: scoreCandidate({
          moduleInfo: mod,
          fromFileAbs: fileAbs,
          requestedBase: reqBase,
          requestedDirParts: reqDirParts,
          requestedSymbols,
        }),
      }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score || a.mod.rel.localeCompare(b.mod.rel));

    if (!candidates.length) {
      unresolved.push({ req: reqPath, line, reason: "no candidate" });
      continue;
    }

    const best = candidates[0];
    const second = candidates[1];

    const ambiguous = second && best.score - second.score < 5;
    const lowConfidence = best.score < 15;

    if (ambiguous || lowConfidence) {
      const reason = ambiguous
        ? `ambiguous (${best.mod.rel}=${best.score}, ${second.mod.rel}=${second.score})`
        : `low confidence (${best.score})`;
      unresolved.push({ req: reqPath, line, reason });
      continue;
    }

    const newReq = toRequirePath(fileAbs, best.mod.abs);
    fixes.push({
      start,
      end,
      oldReq: reqPath,
      newReq,
      score: best.score,
      line,
    });
  }

  return { fixes, unresolved };
}

function applyReplacements(source, fixes) {
  if (!fixes.length) return source;
  const sorted = [...fixes].sort((a, b) => a.start - b.start);
  let out = "";
  let cursor = 0;
  for (const fix of sorted) {
    out += source.slice(cursor, fix.start);
    out += fix.newReq;
    cursor = fix.end;
  }
  out += source.slice(cursor);
  return out;
}

const files = walkJsFiles(rootAbs);
const modules = buildModuleIndex(files);

let changedFiles = 0;
let totalFixes = 0;
let totalUnresolved = 0;

for (const fileAbs of files) {
  const source = fs.readFileSync(fileAbs, "utf8");
  const { fixes, unresolved } = findFixesForFile({ fileAbs, source, modules });

  totalUnresolved += unresolved.length;

  if (!fixes.length) {
    if (verbose && unresolved.length) {
      console.log(`\n[unresolved] ${relFromCwd(fileAbs)}`);
      for (const u of unresolved) {
        console.log(`  - ${u.req} :: ${u.reason}`);
      }
    }
    continue;
  }

  const updated = applyReplacements(source, fixes);
  if (updated !== source) {
    changedFiles += 1;
    totalFixes += fixes.length;

    console.log(`\n[fix] ${relFromCwd(fileAbs)}`);
    for (const fx of fixes) {
      console.log(`  - ${fx.oldReq} -> ${fx.newReq} (score=${fx.score})`);
    }

    if (write) {
      fs.writeFileSync(fileAbs, updated, "utf8");
    }
  }

  if (verbose && unresolved.length) {
    console.log(`[unresolved] ${relFromCwd(fileAbs)}`);
    for (const u of unresolved) {
      console.log(`  - ${u.req} :: ${u.reason}`);
    }
  }
}

console.log("\n[require-fix] summary");
console.log(`  root: ${normalizeSlashes(path.relative(cwd, rootAbs)) || "."}`);
console.log(`  mode: ${write ? "WRITE" : "DRY-RUN"}`);
console.log(`  files scanned: ${files.length}`);
console.log(`  files changed: ${changedFiles}`);
console.log(`  rewrites: ${totalFixes}`);
console.log(`  unresolved: ${totalUnresolved}`);

if (!write) {
  console.log("\n[require-fix] dry-run only. Re-run with --write to apply.");
}
