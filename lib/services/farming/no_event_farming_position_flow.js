// Farming no-event position runtime extraction.
// Purpose: own position persist cadence + hunt position CM broadcast cadence.

const handleNoEventPositionFlow = ({
  st,
  now,
  character,
  server,
  savePosition,
  distanceFn,
  broadcastRecipients,
  sendCm,
} = {}) => {
  const nowForPosition = now();

  const movedSincePersist = Number.isFinite(
    distanceFn?.(character, st.lastPositionPersistPoint),
  )
    ? distanceFn(character, st.lastPositionPersistPoint)
    : Infinity;

  const shouldPersistPosition =
    !st.lastPositionPersistAt ||
    nowForPosition - st.lastPositionPersistAt >= 12000 ||
    !Number.isFinite(movedSincePersist) ||
    movedSincePersist >= 80 ||
    st.lastPositionPersistMap !== character?.map;

  if (shouldPersistPosition && savePosition()) {
    st.lastPositionPersistAt = nowForPosition;
    st.lastPositionPersistMap = character?.map || null;
    st.lastPositionPersistPoint = {
      x: Number(character?.x || 0),
      y: Number(character?.y || 0),
    };
  }

  const recipients = Array.isArray(broadcastRecipients)
    ? broadcastRecipients.filter((name) => name && name !== character?.name)
    : [];

  const movedSinceBroadcast = Number.isFinite(
    distanceFn?.(character, st.lastPositionCmPoint),
  )
    ? distanceFn(character, st.lastPositionCmPoint)
    : Infinity;

  const shouldBroadcastPosition =
    recipients.length > 0 &&
    (!st.lastPositionCmBroadcastAt ||
      nowForPosition - st.lastPositionCmBroadcastAt >= 15000 ||
      !Number.isFinite(movedSinceBroadcast) ||
      movedSinceBroadcast >= 120 ||
      st.lastPositionCmMap !== character?.map);

  if (shouldBroadcastPosition) {
    const message = {
      cmd: "farm:position",
      id: character.id,
      server: {
        region: server?.region || null,
        id: server?.id || null,
      },
      time: new Date().toISOString(),
      in: character?.in,
      map: character?.map,
      x: Number(character?.x || 0),
      y: Number(character?.y || 0),
    };

    for (const name of recipients) {
      try {
        sendCm(name, message);
      } catch {
        // ignore
      }
    }

    st.lastPositionCmBroadcastAt = nowForPosition;
    st.lastPositionCmMap = character?.map || null;
    st.lastPositionCmPoint = {
      x: Number(character?.x || 0),
      y: Number(character?.y || 0),
    };
  }

  return {
    persisted: shouldPersistPosition,
    broadcasted: shouldBroadcastPosition,
    recipients: recipients.length,
    nowForPosition,
  };
};

module.exports = {
  handleNoEventPositionFlow,
};
