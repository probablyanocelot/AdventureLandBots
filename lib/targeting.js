function getTarget() {
  const target = character.getTarget();
  if (!target) return null;
  return target;
}

module.exports = { getTarget };
