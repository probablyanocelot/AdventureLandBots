const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  sleepMs,
};
