// Farming leader assignment builder extraction.
// Purpose: own non-world-event assignment construction in service layer.

const buildFarmingLeaderAssignment = async ({
  cfg,
  nf,
  st,
  now,
  nowMs,
  roster,
  meta,
  available,
  farmerCount,
  priestActive,
  manualFarmMob,
  chainCfg,
  chainWarriorName,
  chainPriestName,
  chainHuntMageName,
  chainNpcMageName,
  getMonsterhuntTarget,
  getMonsterStats,
  determineAssignment,
  listFarmersByPreference,
  selectThree,
  selectPair,
  isPorcupineTarget,
  getKnownOnlineNames,
  getKnownCharacters,
  isMeleeCtype,
  listOfflineFarmerNamesByType,
  ensureCharacterRunningBySwap,
  PORCUPINE_SWAP_CODE_SLOT,
  bumpFastTick,
  logOnce,
  getSafeSpot,
  emitTracker,
} = {}) => {
  let target = manualFarmMob || getMonsterhuntTarget();
  if (!target && !manualFarmMob) {
    if (!cfg._lastHuntRequest || nowMs - cfg._lastHuntRequest > 15000) {
      cfg._lastHuntRequest = nowMs;
      if (!smart.moving) {
        st.mover.request({
          dest: "monsterhunter",
          key: "get_monsterhunt",
          priority: 2,
          cooldownMs: 15000,
        });
      }
      try {
        interact("monsterhunt");
      } catch {
        // ignore
      }
    }
  }

  const stats = getMonsterStats(target);
  let assignment = determineAssignment({
    roster,
    meta,
    stats,
    available,
  });
  assignment.priestActive = priestActive;

  if (manualFarmMob) {
    assignment.mode = `manual:${manualFarmMob}`;
    assignment.crab = [];
  }

  if (isPorcupineTarget(target)) {
    const knownOnlineNames = new Set([...roster, ...getKnownOnlineNames()]);
    const remoteOnlineRangedSupport = getKnownCharacters()
      .filter((entry) => {
        const name = entry?.name;
        const ctype = String(entry?.type || entry?.ctype || "").toLowerCase();
        if (!name || roster.includes(name)) return false;
        if (!knownOnlineNames.has(name)) return false;
        return ["ranger", "priest", "mage"].includes(ctype);
      })
      .map((entry) => entry.name)
      .filter(Boolean);
    const onlineMelee = roster.filter((name) =>
      isMeleeCtype(meta.get(name)?.ctype),
    );
    const rangerOnline = getKnownCharacters().some(
      (entry) =>
        knownOnlineNames.has(entry?.name) &&
        String(entry?.type || entry?.ctype || "").toLowerCase() === "ranger",
    );

    assignment.mode = "porcupine_ranged_only";
    assignment.crab = [];

    if (remoteOnlineRangedSupport.length) {
      logOnce(
        `porcupine_remote_ranged:${target}:${remoteOnlineRangedSupport.join(",")}`,
        "porcupine ranged support already online elsewhere; skipping extra start",
        {
          target,
          onlineElsewhere: remoteOnlineRangedSupport,
        },
        4000,
      );
    }

    const preferredPorcupineHunters = [
      ...(available.ranger || []),
      ...(available.priest || []),
      ...(available.mage || []),
    ];
    assignment.monsterhunt = Array.from(
      new Set(preferredPorcupineHunters),
    ).slice(0, 3);

    if (!assignment.monsterhunt.length) {
      const fallbackHunters = listFarmersByPreference(available).filter(
        (name) => !isMeleeCtype(meta.get(name)?.ctype),
      );
      assignment.monsterhunt = fallbackHunters.slice(0, 3);
    }

    const porcupineSwapCooldownMs = 8000;
    const canTrySwap =
      onlineMelee.length > 0 &&
      nowMs - st.lastPorcupineSwapAt >= porcupineSwapCooldownMs;

    if (canTrySwap) {
      st.lastPorcupineSwapAt = nowMs;
      const swapPriorityList = Array.from(new Set(onlineMelee));
      const targetCandidates = [
        ...listOfflineFarmerNamesByType({
          activeRoster: Array.from(knownOnlineNames),
          includeTypes: ["ranger"],
        }),
        ...listOfflineFarmerNamesByType({
          activeRoster: Array.from(knownOnlineNames),
          includeTypes: ["priest", "mage"],
        }),
      ].filter(Boolean);

      const codeSlotOrName = PORCUPINE_SWAP_CODE_SLOT;
      if (cfg?.mageSwap?.codeSlotOrName !== codeSlotOrName) {
        logOnce(
          `porcupine_force_slot:${target}`,
          "porcupine forcing start_character code slot 90",
          {
            target,
            configuredCodeSlotOrName: cfg?.mageSwap?.codeSlotOrName,
            usingCodeSlotOrName: codeSlotOrName,
          },
          15000,
        );
      }
      if (targetCandidates.length) {
        for (const candidate of targetCandidates) {
          const result = await ensureCharacterRunningBySwap({
            targetName: candidate,
            codeSlotOrName,
            swapPriorityList,
            label: "porcupine-ranged",
            timeoutMs: 20000,
          });
          if (result?.ok) {
            bumpFastTick(4000);
            break;
          }
        }
      }
    }

    if (rangerOnline) {
      assignment.crab = [];
      const hunt = new Set(assignment.monsterhunt || []);
      for (const name of available.ranger || []) {
        if (hunt.size >= 3) break;
        hunt.add(name);
      }
      assignment.monsterhunt = Array.from(hunt).slice(0, 3);
    }
  }

  if (chainCfg.enabled && !manualFarmMob) {
    const warriorName = chainWarriorName || null;
    const priestName = chainPriestName || null;
    const huntMageName = chainHuntMageName || null;
    const npcMageName = chainNpcMageName || null;

    const forced = [warriorName, priestName, huntMageName]
      .filter((name) => name && roster.includes(name))
      .filter((name) => name !== npcMageName);

    if (forced.length) {
      assignment.crab = [];
      assignment.monsterhunt = Array.from(
        new Set([...(assignment.monsterhunt || []), ...forced]),
      )
        .filter((name) => name !== npcMageName)
        .slice(0, Math.min(3, Math.max(1, forced.length)));
    }
  }

  const dangerRecent =
    !manualFarmMob &&
    st.lastHuntDanger &&
    st.lastHuntDanger.target === target &&
    now() - st.lastHuntDanger.at < 12000;

  if (dangerRecent) {
    assignment.mode = "help_requested";
    assignment.crab = [];
    assignment.monsterhunt = selectThree({ stats, available });
    if (!assignment.monsterhunt.length)
      assignment.monsterhunt = selectPair({ stats, available });
  }

  const huntGroup = Array.isArray(assignment.monsterhunt)
    ? assignment.monsterhunt
    : [];
  const recentHuntStats = huntGroup
    .map((name) => ({ name, stat: st.teamStats.get(name) }))
    .filter((it) => it.stat && now() - Number(it.stat.at || 0) < 6000);

  const focusCandidate = recentHuntStats
    .map((it) => ({ name: it.name, stat: it.stat }))
    .sort((a, b) => {
      const aFear = a.stat?.feared ? 1 : 0;
      const bFear = b.stat?.feared ? 1 : 0;
      if (aFear !== bFear) return bFear - aFear;

      const aDanger = a.stat?.takingTooMuchDamage ? 1 : 0;
      const bDanger = b.stat?.takingTooMuchDamage ? 1 : 0;
      if (aDanger !== bDanger) return bDanger - aDanger;

      const aRatio =
        Number(a.stat?.maxHp || 0) > 0
          ? Number(a.stat?.hp || 0) / Number(a.stat?.maxHp || 1)
          : 1;
      const bRatio =
        Number(b.stat?.maxHp || 0) > 0
          ? Number(b.stat?.hp || 0) / Number(b.stat?.maxHp || 1)
          : 1;
      return aRatio - bRatio;
    })[0];

  const shouldFocus =
    Boolean(focusCandidate?.stat?.feared) ||
    Boolean(focusCandidate?.stat?.takingTooMuchDamage);
  assignment.focusAllyName = shouldFocus ? focusCandidate?.name || null : null;

  if (assignment.focusAllyName) {
    assignment.mode = "assist_focus";
    assignment.crab = [];
    const preferred = listFarmersByPreference(available);
    const targetSize = Math.min(3, Math.max(1, farmerCount));
    assignment.monsterhunt = preferred.slice(0, targetSize);
  }

  const canReuseRecentHuntRally =
    Boolean(target) && st.lastAssignment?.huntTarget === target;
  const rallySource = canReuseRecentHuntRally
    ? recentHuntStats
        .map((it) => it.stat)
        .find(
          (s) =>
            s &&
            typeof s.x === "number" &&
            typeof s.y === "number" &&
            typeof s.map === "string",
        )
    : null;
  assignment.huntRallyPoint = rallySource
    ? { map: rallySource.map, x: rallySource.x, y: rallySource.y }
    : {
        map: character.map,
        x: Number(character.x || 0),
        y: Number(character.y || 0),
      };

  if (!assignment.crab?.length && farmerCount > 0 && farmerCount <= 3) {
    const preferred = listFarmersByPreference(available);
    const targetSize = Math.min(3, farmerCount);
    const huntSet = new Set(assignment.monsterhunt || []);
    for (const name of preferred) {
      if (huntSet.size >= targetSize) break;
      huntSet.add(name);
    }
    assignment.monsterhunt = Array.from(huntSet).slice(0, targetSize);
  }

  assignment.huntTarget = target || null;
  const mode = assignment.mode || "none";
  const hunt = assignment.huntTarget || null;
  const evt = assignment.worldEvent?.name || null;
  assignment.taskKey = `mode:${mode}|hunt:${hunt || "-"}|event:${evt || "-"}`;

  const participants = Array.from(
    new Set([...(assignment.monsterhunt || []), ...(assignment.crab || [])]),
  );
  const wipeCount = Number(st.wipeByTask.get(assignment.taskKey) || 0);
  const shouldRegroup =
    !manualFarmMob &&
    assignment.priestActive &&
    participants.length > 0 &&
    wipeCount >= Number(nf.partyWipesBeforeAbort || 2);

  if (shouldRegroup) {
    assignment.mode = "regroup_tracker";
    assignment.regroup = {
      reason: "double_party_wipe",
      dest: getSafeSpot(),
    };
    assignment.crab = [];
    assignment.monsterhunt = participants;
    assignment.huntTarget = null;
    emitTracker?.();
  }

  return assignment;
};

module.exports = {
  buildFarmingLeaderAssignment,
};
