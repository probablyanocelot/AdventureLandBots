#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const templatePath = path.join(
  projectRoot,
  "docs",
  "templates",
  "service-boundary-template.md",
);

function toSlug(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getArgs(argv) {
  const args = { service: "", out: "" };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--service" || token === "-s") {
      args.service = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (token === "--out" || token === "-o") {
      args.out = argv[i + 1] || "";
      i += 1;
      continue;
    }
  }

  return args;
}

function usage() {
  console.log(
    "Usage: node scripts/new-service-boundary-doc.js --service <name> [--out <path>]",
  );
  console.log(
    "Example: node scripts/new-service-boundary-doc.js --service combat",
  );
}

function main() {
  const { service, out } = getArgs(process.argv.slice(2));
  const serviceSlug = toSlug(service);

  if (!serviceSlug) {
    usage();
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  const defaultOut = path.join(
    projectRoot,
    "lib",
    "services",
    serviceSlug,
    "README.md",
  );
  const outputPath = path.resolve(projectRoot, out || defaultOut);

  if (fs.existsSync(outputPath)) {
    console.error(`Refusing to overwrite existing file: ${outputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(templatePath, "utf8");
  const rendered = raw
    .replace(/<service>/g, serviceSlug)
    .replace(/- Service name:\s*$/m, `- Service name: ${serviceSlug}`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, rendered, "utf8");

  console.log(`Created: ${outputPath}`);
}

main();
