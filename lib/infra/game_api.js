const sendCm = (targetName, message) => {
  if (typeof send_cm !== "function") {
    throw new Error("send_cm is not available in current runtime");
  }
  return send_cm(targetName, message);
};

const joinEvent = (eventName) => {
  if (typeof join !== "function") {
    throw new Error("join is not available in current runtime");
  }
  return join(eventName);
};

const smartMove = (destination) => {
  if (typeof smart_move !== "function") {
    throw new Error("smart_move is not available in current runtime");
  }
  return smart_move(destination);
};

module.exports = {
  sendCm,
  joinEvent,
  smartMove,
};
