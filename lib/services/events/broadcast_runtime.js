const { broadcastCodeLoaded } = await require("./bot_presence.js");

const broadcastCodeLoadedService = () => {
  return broadcastCodeLoaded();
};

module.exports = {
  broadcastCodeLoadedService,
};
