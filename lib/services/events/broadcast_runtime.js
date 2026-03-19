const { broadcastCodeLoaded } = await require("../../domains/events/index.js");

const broadcastCodeLoadedService = () => {
  return broadcastCodeLoaded();
};

module.exports = {
  broadcastCodeLoadedService,
};
