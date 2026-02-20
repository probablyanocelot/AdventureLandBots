const prefix = () => {
  try {
    return `[${character.name}]`;
  } catch {
    return "[ALBots]";
  }
};

const info = (...args) => {
  try {
    console.log(prefix(), ...args);
  } catch {
    // ignore
  }
};

const warn = (...args) => {
  try {
    console.warn(prefix(), ...args);
  } catch {
    // ignore
  }
};

const logCatch = (msg, err) => {
  try {
    warn(msg, err);
  } catch {
    // avoid recursive logging failures
  }
};

module.exports = { info, warn, logCatch };
