if (typeof require !== "function") performance_trick();

const { runClientBootstrap } = require("./bootstrap/index.js");

runClientBootstrap();
