const ROLE_SIG_POSITION_GRID = 100;

const quantizeCoord = (value, grid = ROLE_SIG_POSITION_GRID) => {
  const n = Number(value);
  const step = Number(grid);
  if (!Number.isFinite(n)) return 0;
  if (!Number.isFinite(step) || step <= 0) return n;
  return Math.round(n / step) * step;
};

const quantizePointForSig = (point, grid = ROLE_SIG_POSITION_GRID) => {
  if (!point || typeof point !== "object") return null;
  return {
    map: point.map || null,
    x: quantizeCoord(point.x, grid),
    y: quantizeCoord(point.y, grid),
  };
};

const assignmentSignature = (assignment) => {
  if (!assignment || typeof assignment !== "object") return "";
  const sig = {
    mode: assignment.mode || null,
    crab: Array.isArray(assignment.crab) ? [...assignment.crab].sort() : [],
    monsterhunt: Array.isArray(assignment.monsterhunt)
      ? [...assignment.monsterhunt].sort()
      : [],
    huntTarget: assignment.huntTarget || null,
    worldEvent: assignment.worldEvent
      ? {
          name: assignment.worldEvent.name || null,
          map: assignment.worldEvent.map || null,
          x: Number(assignment.worldEvent.x || 0),
          y: Number(assignment.worldEvent.y || 0),
        }
      : null,
    huntRallyPoint: assignment.huntRallyPoint
      ? quantizePointForSig(assignment.huntRallyPoint)
      : null,
    focusAllyName: assignment.focusAllyName || null,
    regroup: assignment.regroup || null,
    priestActive: Boolean(assignment.priestActive),
    taskKey: assignment.taskKey || null,
  };
  try {
    return JSON.stringify(sig);
  } catch {
    return String(Date.now());
  }
};

module.exports = {
  ROLE_SIG_POSITION_GRID,
  quantizeCoord,
  quantizePointForSig,
  assignmentSignature,
};
