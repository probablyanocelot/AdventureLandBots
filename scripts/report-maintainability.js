#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const cwd = process.cwd();
const serviceRoot = path.join(cwd, "lib", "services");
const lintTarget = ["lib/services/**/*.js", "lib/runtime/**/*.js"];
const ignoredPaths = ["lib/gui/**", "lib/unused/**"];

const runEslintJson = () => {
  try {
    const output = execSync(
      `npx eslint ${lintTarget.map((pattern) => `\"${pattern}\"`).join(" ")} -f json`,
      {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      },
    );
    return JSON.parse(output || "[]");
  } catch (error) {
    if (error.stdout) {
      try {
        return JSON.parse(error.stdout.toString());
      } catch (parseError) {
        console.error("Failed to parse ESLint JSON output:", parseError);
        process.exit(1);
      }
    }
    console.error("ESLint failed to run:", error.message || error);
    process.exit(1);
  }
};

const walkJsFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const rel = path.relative(cwd, abs).replace(/\\/g, "/");
      if (ignoredPaths.some((pattern) => rel.startsWith(pattern.replace(/\*\*/g, "")))) {
        continue;
      }
      files.push(...walkJsFiles(abs));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const rel = path.relative(cwd, abs).replace(/\\/g, "/");
      if (ignoredPaths.some((pattern) => rel.startsWith(pattern.replace(/\*\*/g, "")))) {
        continue;
      }
      files.push(abs);
    }
  }
  return files;
};

const walkServiceDirs = (dir) => {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    results.push(abs);
    results.push(...walkServiceDirs(abs));
  }
  return results;
};

const countLines = (filePath) => {
  const content = fs.readFileSync(filePath, "utf8");
  return content.split(/\r?\n/).length;
};

const serviceDirs = fs.existsSync(serviceRoot)
  ? walkServiceDirs(serviceRoot)
  : [];

const serviceCoverage = serviceDirs.map((dir) => {
  const indexPath = path.join(dir, "index.js");
  const readmePath = path.join(dir, "README.md");
  return {
    dir: path.relative(cwd, dir),
    hasIndex: fs.existsSync(indexPath),
    hasReadme: fs.existsSync(readmePath),
  };
});

const missingServices = serviceCoverage
  .filter((item) => !item.hasIndex || !item.hasReadme)
  .map((item) => ({
    dir: item.dir,
    missing: [
      item.hasIndex ? null : "index.js",
      item.hasReadme ? null : "README.md",
    ].filter(Boolean),
  }));

const jsFiles = walkJsFiles(path.join(cwd, "lib"));
const maxFileLOC = jsFiles.reduce((max, filePath) => {
  const count = countLines(filePath);
  return Math.max(max, count);
}, 0);

const eslintResults = runEslintJson();
const lintIssueCount = eslintResults.reduce(
  (sum, report) => sum + (report.messages || []).length,
  0,
);
const lintFileCount = eslintResults.filter(
  (report) => report.messages && report.messages.length,
).length;
const serviceDirCount = serviceCoverage.length;
const serviceCompleteCount = serviceCoverage.filter(
  (item) => item.hasIndex && item.hasReadme,
).length;

console.log("\nMaintainability KPI Summary");
console.log("--------------------------");
console.log(`Lint issues: ${lintIssueCount}`);
console.log(`Files with lint issues: ${lintFileCount}`);
console.log(`Max JS file LOC: ${maxFileLOC}`);
console.log(`Service directories found: ${serviceDirCount}`);
console.log(
  `Service dirs with index.js and README.md: ${serviceCompleteCount} / ${serviceDirCount}`,
);

if (missingServices.length) {
  console.log("\nService coverage gaps:");
  for (const item of missingServices) {
    console.log(`- ${item.dir}: missing ${item.missing.join(", ")}`);
  }
}

console.log("");
process.exit(0);
