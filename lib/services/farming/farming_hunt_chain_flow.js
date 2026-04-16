// Farming hunt-chain lifecycle extraction.
// Purpose: own leader-side hunt-chain bootstrap/finalize/turn-in control flow.

const handleFarmingLeaderHuntChainFlow = async ({
  cfg,
  st,
  now,
  characterName,
  leader,
  manualFarmMob,
  chainCfg,
  liveTarget,
  chainWarriorName,
  chainPriestName,
  chainHuntMageName,
  chainNpcMageName,
  needsMonsterhuntTurnIn,
  getMonsterhuntTarget,
  isNameHoldingAggroOfType,
  ensureChainMageRunning,
  requestMageMagiport,
  waitForMageMagiportResult,
  isCharacterOnline,
  stopCharacterSafe,
  logOnce,
  ensureMoveToMonsterhunter,
  interactMonsterhunt,
} = {}) => {
  if (!leader || characterName !== leader) return { abortLoop: false };

  if (
    !manualFarmMob &&
    chainCfg?.enabled &&
    liveTarget &&
    !needsMonsterhuntTurnIn()
  ) {
    const cooldownMs = Math.max(
      1500,
      Number(chainCfg.requestCooldownMs || 6000),
    );
    if (
      st.lastHuntMagePortTarget !== liveTarget &&
      now() - st.lastChainBootstrapAt >= cooldownMs
    ) {
      st.lastChainBootstrapAt = now();
      const readyHuntMage = await ensureChainMageRunning({
        cfg,
        mageName: chainHuntMageName,
        chainCfg,
        preferredSubOut: [chainNpcMageName],
        excludeSubOutNames: [chainWarriorName, chainPriestName],
        label: "hunt-chain-hunt-mage-bootstrap",
      });

      if (!readyHuntMage.ok) {
        logOnce(
          `hunt_chain_bootstrap_hunt_mage_not_ready:${liveTarget}`,
          "hunt-chain bootstrap blocked: hunt mage not ready",
          {
            liveTarget,
            huntMageName: chainHuntMageName,
            ready: readyHuntMage.ready,
            online: readyHuntMage.online,
          },
          2000,
        );
        return { abortLoop: true };
      }

      const selectedHuntMage = chainHuntMageName;
      const bootTaskId = `huntchain:bootstrap:${now()}`;
      const bootPortOk = requestMageMagiport({
        mageName: selectedHuntMage,
        targetName: chainWarriorName || characterName,
        taskId: bootTaskId,
        task: { target: liveTarget },
      });

      if (bootPortOk) {
        const bootResult = await waitForMageMagiportResult({
          mageName: selectedHuntMage,
          taskId: bootTaskId,
          timeoutMs: Math.max(6000, Number(chainCfg.pendingTimeoutMs || 12000)),
        });
        if (bootResult?.message?.ok) {
          st.lastHuntMagePortTarget = liveTarget;
          if (chainNpcMageName && isCharacterOnline(chainNpcMageName)) {
            stopCharacterSafe(chainNpcMageName);
          }
        } else {
          logOnce(
            `hunt_chain_bootstrap_result_missing:${liveTarget}`,
            "hunt-chain bootstrap failed: no successful mage result",
            { liveTarget, selectedHuntMage, bootTaskId },
            2000,
          );
        }
      }
    }
  }

  if (st.pendingAggroChain) {
    const pending = st.pendingAggroChain;
    const age = now() - Number(pending.at || 0);
    const timeoutMs = Math.max(
      3000,
      Number(chainCfg.pendingTimeoutMs || 12000),
    );

    if (age > timeoutMs) {
      logOnce(
        `hunt_chain_timeout:${pending.priorTarget || "none"}`,
        "hunt-chain pending expired",
        { pending },
        5000,
      );
      st.pendingAggroChain = null;
    } else if (pending.phase === "await_new_task") {
      const currentTarget = getMonsterhuntTarget();
      if (currentTarget) {
        const sameTarget =
          Boolean(pending.priorTarget) && currentTarget === pending.priorTarget;
        const cooldownMs = Math.max(
          1500,
          Number(chainCfg.requestCooldownMs || 6000),
        );
        if (
          (!pending.sameTargetOnly || sameTarget) &&
          now() - st.lastAggroChainFinalizeAt >= cooldownMs
        ) {
          const readyHuntMage = await ensureChainMageRunning({
            cfg,
            mageName: pending.huntMageName,
            chainCfg,
            preferredSubOut: [pending.npcMageName],
            excludeSubOutNames: [chainWarriorName, chainPriestName],
            label: "hunt-chain-hunt-mage",
          });

          if (!readyHuntMage.ok) {
            logOnce(
              `hunt_chain_finalize_hunt_mage_not_ready:${currentTarget}`,
              "hunt-chain finalize blocked: hunt mage not ready",
              {
                currentTarget,
                huntMageName: pending.huntMageName,
                ready: readyHuntMage.ready,
                online: readyHuntMage.online,
              },
              2000,
            );
            return { abortLoop: true };
          }

          const selectedHuntMage = pending.huntMageName;
          const huntTaskId = `huntchain:hunt:${now()}`;
          const ok = requestMageMagiport({
            mageName: selectedHuntMage,
            targetName: pending.warriorName,
            taskId: huntTaskId,
            task: { target: currentTarget },
          });
          st.lastAggroChainFinalizeAt = now();
          if (ok) {
            const huntResult = await waitForMageMagiportResult({
              mageName: selectedHuntMage,
              taskId: huntTaskId,
              timeoutMs: Math.max(
                6000,
                Number(chainCfg.pendingTimeoutMs || 12000),
              ),
            });
            if (huntResult?.message?.ok) {
              st.lastHuntMagePortTarget = currentTarget;
            }
          }

          if (pending.npcMageName && isCharacterOnline(pending.npcMageName)) {
            stopCharacterSafe(pending.npcMageName);
          }

          logOnce(
            `hunt_chain_finalize:${pending.priorTarget || "none"}`,
            ok
              ? "hunt-chain finalized: warrior ported to hunt mage"
              : "hunt-chain finalize failed: hunt mage port request failed",
            {
              priorTarget: pending.priorTarget,
              currentTarget,
              huntMageName: selectedHuntMage,
              requestedHuntMage: pending.huntMageName,
              huntMageReady: readyHuntMage.ok,
              warriorName: pending.warriorName,
              sameTarget,
            },
            2000,
          );
        } else {
          logOnce(
            `hunt_chain_target_miss:${pending.priorTarget || "none"}`,
            "hunt-chain skipped: refreshed target differs",
            {
              previous: pending.priorTarget,
              current: currentTarget,
            },
            5000,
          );
        }
        st.pendingAggroChain = null;
      }
    }
  }

  if (!manualFarmMob && needsMonsterhuntTurnIn()) {
    const nowMs = now();
    const priorTarget =
      getMonsterhuntTarget() ||
      st.lastAssignment?.huntTarget ||
      st.lastHuntMagePortTarget ||
      liveTarget ||
      null;
    const requestCooldownMs = Math.max(
      1500,
      Number(chainCfg.requestCooldownMs || 6000),
    );

    const chainEnabled =
      Boolean(chainCfg.enabled) &&
      Boolean(priorTarget) &&
      characterName === (chainWarriorName || characterName);

    if (
      chainEnabled &&
      nowMs - st.lastAggroChainRequestAt >= requestCooldownMs
    ) {
      const priestName = chainPriestName || null;
      const requirePriestAggro = chainCfg.requirePriestAggro !== false;
      const priestHolding = priestName
        ? isNameHoldingAggroOfType(priestName, priorTarget)
        : false;

      if (!requirePriestAggro || priestHolding) {
        const npcMageName = chainNpcMageName || cfg.mageName || null;
        const huntMageName = chainHuntMageName || cfg.mageName || null;
        const warriorName = chainWarriorName || characterName;

        if (huntMageName && isCharacterOnline(huntMageName)) {
          stopCharacterSafe(huntMageName);
        }

        const readyNpcMage = await ensureChainMageRunning({
          cfg,
          mageName: npcMageName,
          chainCfg,
          preferredSubOut: [huntMageName],
          excludeSubOutNames: [chainWarriorName, chainPriestName],
          label: "hunt-chain-npc-mage",
        });
        st.lastAggroChainMageSwapAt = now();

        if (!readyNpcMage.ok) {
          logOnce(
            `hunt_chain_npc_mage_not_ready:${priorTarget}`,
            "hunt-chain blocked: NPC mage not ready",
            {
              priorTarget,
              npcMageName,
              ready: readyNpcMage.ready,
              online: readyNpcMage.online,
            },
            2000,
          );
          return { abortLoop: true };
        }

        const selectedNpcMage = npcMageName;
        const npcTaskId = `huntchain:npc:${nowMs}`;
        const npcPortOk = requestMageMagiport({
          mageName: selectedNpcMage,
          targetName: warriorName,
          taskId: npcTaskId,
          task: { target: "monsterhunter" },
        });

        if (npcPortOk) {
          const npcResult = await waitForMageMagiportResult({
            mageName: selectedNpcMage,
            taskId: npcTaskId,
            timeoutMs: Math.max(
              6000,
              Number(chainCfg.pendingTimeoutMs || 12000),
            ),
          });
          if (!npcResult?.message?.ok) {
            logOnce(
              `hunt_chain_npc_result_missing:${priorTarget}`,
              "hunt-chain blocked: NPC mage did not confirm successful port",
              { priorTarget, selectedNpcMage, npcTaskId },
              2000,
            );
            return { abortLoop: true };
          }

          if (selectedNpcMage && isCharacterOnline(selectedNpcMage)) {
            stopCharacterSafe(selectedNpcMage);
          }

          const readyHuntMage = await ensureChainMageRunning({
            cfg,
            mageName: huntMageName,
            chainCfg,
            preferredSubOut: [selectedNpcMage],
            excludeSubOutNames: [chainWarriorName, chainPriestName],
            label: "hunt-chain-hunt-mage-after-npc",
          });

          if (!readyHuntMage.ok) {
            logOnce(
              `hunt_chain_hunt_mage_not_ready_after_npc:${priorTarget}`,
              "hunt-chain blocked: hunt mage not ready after npc phase",
              {
                priorTarget,
                huntMageName,
                ready: readyHuntMage.ready,
                online: readyHuntMage.online,
              },
              2000,
            );
            return { abortLoop: true };
          }

          const selectedHuntMage = huntMageName;

          st.lastAggroChainRequestAt = nowMs;
          logOnce(
            `hunt_chain_npc:${priorTarget}`,
            "hunt-chain started: warrior requested NPC mage port",
            {
              priorTarget,
              priestName,
              npcMageName: selectedNpcMage,
              requestedNpcMage: npcMageName,
              npcMageReady: readyNpcMage.ok,
              huntMageName: selectedHuntMage,
              requestedHuntMage: huntMageName,
              huntMageReady: readyHuntMage.ok,
              warriorName,
            },
            2000,
          );

          st.pendingAggroChain = {
            at: now(),
            phase: "await_new_task",
            priorTarget,
            sameTargetOnly: chainCfg.sameTargetOnly !== false,
            huntMageName: selectedHuntMage,
            npcMageName: selectedNpcMage,
            warriorName,
          };
        } else {
          logOnce(
            `hunt_chain_npc_fail:${priorTarget}`,
            "hunt-chain fallback: NPC mage port request failed",
            {
              priorTarget,
              npcMageName: selectedNpcMage,
              requestedNpcMage: npcMageName,
              warriorName,
            },
            2500,
          );
        }
      } else {
        logOnce(
          `hunt_chain_priest_missing:${priorTarget}`,
          "hunt-chain blocked: priest is not holding same-target aggro",
          { priorTarget, priestName },
          2500,
        );
      }
    }

    if (nowMs - Number(st.lastTurnInRequest || 0) > 5000) {
      st.lastTurnInRequest = nowMs;
      ensureMoveToMonsterhunter?.();
      try {
        interactMonsterhunt?.();
        st.lastHuntMagePortTarget = null;
      } catch {
        // ignore
      }
    }
    return { abortLoop: true };
  }

  return { abortLoop: false };
};

module.exports = {
  handleFarmingLeaderHuntChainFlow,
};
