// validate_contracts.js
// Validates that all consumers and producers use the defined interfaces in lib/contracts/*_api.js
// Usage: node validate_contracts.js

const fs = require("fs");
const path = require("path");

const CONTRACTS_DIR = path.join(__dirname, "../lib/contracts");
const SERVICES_DIR = path.join(__dirname, "../lib/services");

function getContractFiles() {
  return fs.readdirSync(CONTRACTS_DIR).filter((f) => f.endsWith("_api.js"));
}

function getAllServiceFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getAllServiceFiles(fullPath));
    } else if (file.endsWith(".js")) {
      results.push(fullPath);
    }
  });
  return results;
}

function checkContractUsage(contractFile, serviceFiles) {
  const contractName = contractFile;
  const relPath = `../../contracts/${contractName}`;
  let used = false;
  let consumers = [];
  for (const file of serviceFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes(relPath)) {
      used = true;
      consumers.push(file);
    }
  }
  return { used, consumers };
}

function main() {
  const contracts = getContractFiles();
  const serviceFiles = getAllServiceFiles(SERVICES_DIR);
  let allOk = true;

  for (const contract of contracts) {
    const { used, consumers } = checkContractUsage(contract, serviceFiles);
    if (!used) {
      console.warn(`[WARN] Contract not used: ${contract}`);
      allOk = false;
    } else {
      console.log(`[OK] ${contract} used by:`);
      consumers.forEach((c) =>
        console.log("   ", path.relative(process.cwd(), c)),
      );
    }
  }

  // Optionally: check for consumers using contracts not in contracts dir
  // (left as an exercise)

  if (allOk) {
    console.log("\nAll contracts are used by at least one consumer.");
  } else {
    console.warn("\nSome contracts are not used.");
  }
}

if (require.main === module) {
  main();
}
