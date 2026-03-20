const { createUnpackRequesterModuleService } = await require("../cm/index.js");

const createUnpackSupport = ({ cfg } = {}) => {
  const inner = createUnpackRequesterModuleService({ cfg });
  return (
    inner || {
      stopRoutine: () => {},
      dispose: () => {},
      [Symbol.dispose]: () => {},
      [Symbol.asyncDispose]: async () => {},
    }
  );
};

module.exports = {
  createUnpackSupport,
};
