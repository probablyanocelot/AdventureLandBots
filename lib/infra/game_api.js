const sendCm = (targetName, message) => {
  if (typeof send_cm !== "function") {
    throw new Error("send_cm is not available in current runtime");
  }
  return send_cm(targetName, message);
};

const sendCmIfAvailable = (targetName, message) => {
  if (typeof send_cm !== "function") return false;
  try {
    send_cm(targetName, message);
    return true;
  } catch {
    return false;
  }
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

const smartMoveIfAvailable = async (destination) => {
  if (typeof smart_move !== "function") return false;
  try {
    await smart_move(destination);
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  sendCm,
  sendCmIfAvailable,
  joinEvent,
  smartMove,
  smartMoveIfAvailable,
};
