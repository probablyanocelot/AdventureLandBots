const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => Date.now();

module.exports = {
  sleepMs,
  now,
};
