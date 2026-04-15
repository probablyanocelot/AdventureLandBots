// Rendering helpers for the enhanced bank overview UI.
// Move page rendering, item rendering, and DOM assembly here.

const abbreviateNumber = (number) => {
  const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
  if (!number) {
    return number;
  }
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;
  if (tier === 0) return number;
  const suffix = SI_SYMBOL[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = number / scale;
  return (
    scaled.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + suffix
  );
};

const renderActivePage = (
  context,
  bankItemsContainer,
  tellerItemsContainer,
) => {
  const $ = parent.$;
  const { totalBankSlots, totalUnusedBankSlots, groups, usingCachedBank } =
    context.groupBankByItem();
  context.groups = groups;
  bankItemsContainer =
    bankItemsContainer !== null && bankItemsContainer !== void 0
      ? bankItemsContainer
      : $("#bank-items-container");
  tellerItemsContainer =
    tellerItemsContainer !== null && tellerItemsContainer !== void 0
      ? tellerItemsContainer
      : $("#bank-teller-items-container");
  const groupedPageButton = $("#bank-page-grouped");
  const tellerPageButton = $("#bank-page-tellers");
  const searchInput = $("#bank-search-input");
  const sortButton = $("#bank-sort-button");
  const groupModeButton = $("#bank-group-mode-button");
  const viewModeButton = $("#bank-view-mode-button");
  const slotMoveButton = $("#bank-toggle-slotmove");
  const combineFilledButton = $("#bank-toggle-filled");
  const combineEmptyButton = $("#bank-toggle-empty");
  const toggleLockedButton = $("#bank-toggle-locked");
  const slotOverview = $("#bank-slot-overview");
  const searchFilterChip = $("#bank-search-filter-chip");
  const legend = $("#bank-extra-legend");
  const slotMoveSelection = $("#bank-slotmove-selection");
  slotOverview.html(
    `${totalUnusedBankSlots} / ${totalBankSlots} free slots${usingCachedBank ? " (cached)" : ""}`,
  );
  const parsedSearch = context.parseSearchQuery(context.search || "");
  if (searchFilterChip && searchFilterChip.length === 1) {
    const chipParts = [];
    const anyActive = parsedSearch.property === "any";
    const pActive = parsedSearch.property === "p";
    chipParts.push(
      `<span class='gamebutton gamebutton-small' style='display:inline-block; margin-left:0; opacity:${anyActive ? "1" : "0.75"}; color:${anyActive ? "#d8f2ff" : "#b7c3d0"};' onclick='parent.enhanced_bank_ui.setPropertyPresetFilter("any")'>prop:any</span>`,
    );
    chipParts.push(
      `<span class='gamebutton gamebutton-small' style='display:inline-block; margin-left:3px; opacity:${pActive ? "1" : "0.75"}; color:${pActive ? "#e7d7ff" : "#b7c3d0"};' onclick='parent.enhanced_bank_ui.setPropertyPresetFilter("p")'>prop:p</span>`,
    );
    if (parsedSearch.text) {
      chipParts.push(
        `<span class='gamebutton gamebutton-small' style='display:inline-block; margin-left:3px; color:#e8d3a3;'>text:${parsedSearch.text}</span><span class='gamebutton gamebutton-small' style='display:inline-block; margin-left:3px;' onclick='parent.enhanced_bank_ui.clearSearchTextFilter()'>✕</span>`,
      );
    }
    if (parsedSearch.property) {
      chipParts.push(
        `<span class='gamebutton gamebutton-small' style='display:inline-block; margin-left:3px; color:#c7d6ff;'>prop:${parsedSearch.property}</span><span class='gamebutton gamebutton-small' style='display:inline-block; margin-left:3px;' onclick='parent.enhanced_bank_ui.clearSearchPropertyFilter()'>✕</span>`,
      );
    }
    if (chipParts.length > 0) {
      searchFilterChip.html(chipParts.join(""));
    } else {
      searchFilterChip.html("");
    }
  }
  if (legend && legend.length === 1) {
    context.renderExtraLegend();
  }
  if (
    context.activePage === "grouped" &&
    (context.groupedDisplayMode === "bank_slots" ||
      context.groupedDisplayMode === "all_slots") &&
    context.slotMoveMode &&
    context.selectedBankSlot
  ) {
    slotMoveSelection.html(
      `Selected: ${context.getPackLabel(context.selectedBankSlot.packName)} slot ${context.selectedBankSlot.index + 1} (ESC/right click to cancel)`,
    );
  } else {
    slotMoveSelection.html("");
  }
  groupedPageButton.css({
    opacity: context.activePage === "grouped" ? "1" : "0.65",
  });
  tellerPageButton.css({
    opacity: context.activePage === "tellers" ? "1" : "0.65",
  });
  searchInput.prop("disabled", context.activePage !== "grouped");
  searchInput.css("opacity", context.activePage === "grouped" ? "1" : "0.35");
  sortButton.html(`Sort: ${context.getSortModeLabel()}`);
  sortButton.css("opacity", context.activePage === "grouped" ? "1" : "0.35");
  groupModeButton.html(`Group: ${context.getGroupModeLabel()}`);
  groupModeButton.css(
    "opacity",
    context.activePage === "grouped" &&
      context.groupedDisplayMode === "aggregated"
      ? "1"
      : "0.35",
  );
  viewModeButton.html(`View: ${context.getGroupedDisplayModeLabel()}`);
  viewModeButton.css(
    "opacity",
    context.activePage === "grouped" ? "1" : "0.35",
  );
  slotMoveButton.html(`Slot Move: ${context.slotMoveMode ? "On" : "Off"}`);
  slotMoveButton.css(
    "opacity",
    context.activePage === "grouped" &&
      (context.groupedDisplayMode === "bank_slots" ||
        context.groupedDisplayMode === "all_slots")
      ? "1"
      : "0.35",
  );
  combineFilledButton.html(
    `Combine Items: ${context.combineFilledSlots ? "On" : "Off"}`,
  );
  combineFilledButton.css(
    "opacity",
    context.activePage === "tellers" ||
      (context.activePage === "grouped" &&
        (context.groupedDisplayMode === "bank_slots" ||
          context.groupedDisplayMode === "all_slots" ||
          context.groupedDisplayMode === "aggregated"))
      ? "1"
      : "0.35",
  );
  combineEmptyButton.html(
    `Combine Empty: ${context.combineEmptySlots ? "On" : "Off"}`,
  );
  combineEmptyButton.css(
    "opacity",
    context.activePage === "tellers" ||
      (context.activePage === "grouped" &&
        (context.groupedDisplayMode === "bank_slots" ||
          context.groupedDisplayMode === "all_slots"))
      ? "1"
      : "0.35",
  );
  toggleLockedButton.html(
    `Hide Locked: ${context.hideLockedTellers ? "On" : "Off"}`,
  );
  toggleLockedButton.css(
    "opacity",
    context.activePage === "tellers" ? "1" : "0.35",
  );
  if (context.activePage === "grouped") {
    bankItemsContainer.show();
    tellerItemsContainer.hide();
    context.renderBankItems(context.search, bankItemsContainer);
    return;
  }
  bankItemsContainer.hide();
  tellerItemsContainer.show();
  context.renderTellerItems(tellerItemsContainer);
};

const renderTellerItems = (context, tellerItemsContainer) => {
  let _a;
  const $ = parent.$;
  tellerItemsContainer =
    tellerItemsContainer !== null && tellerItemsContainer !== void 0
      ? tellerItemsContainer
      : $("#bank-teller-items-container");
  if (tellerItemsContainer && tellerItemsContainer.length === 0) {
    console.warn(
      "#bank-teller-items-container could not be found, can't rerender data",
    );
    return;
  }
  if (!tellerItemsContainer || tellerItemsContainer.length !== 1) {
    return;
  }
  tellerItemsContainer.html("");
  tellerItemsContainer.css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignContent: "flex-start",
    gap: "8px",
  });
  const { bank, usingCachedBank } = context.getBankSource();
  if (!Object.keys(bank).length) {
    tellerItemsContainer.append(
      "<div class='gamebutton gamebutton-small'>Not in bank</div>",
    );
    return;
  }
  const sortedPackNames = Object.keys(bank)
    .filter((packName) => {
      const packItems = bank[packName];
      return /^items\d+$/i.test(packName) && Array.isArray(packItems);
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  if (sortedPackNames.length === 0) {
    tellerItemsContainer.append(
      "<div class='gamebutton gamebutton-small'>No teller packs detected</div>",
    );
    return;
  }
  if (usingCachedBank) {
    tellerItemsContainer.append(
      "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bb7ff;'>Showing cached bank snapshot</div>",
    );
  }
  const sortedKnownPackNames = context.getSortedKnownPackNames(bank);
  const visibleKnownPackNames = context.hideLockedTellers
    ? sortedKnownPackNames.filter((packName) =>
        context.isPackUnlocked(packName, bank),
      )
    : sortedKnownPackNames;
  const unlockedPackCount = sortedKnownPackNames.filter((packName) =>
    context.isPackUnlocked(packName, bank),
  ).length;
  const tellerQuickActions = $(
    "<div style='flex:0 0 100%; margin-bottom: 6px;'></div>",
  );
  tellerQuickActions.append(
    "<div class='gamebutton gamebutton-small' style='display:inline-block; margin-right:4px;'>Teller quick goto</div>",
  );
  tellerQuickActions.append(
    `<div class='gamebutton gamebutton-small' style='display:inline-block; margin-right:4px; margin-bottom:4px;'>Unlocked ${unlockedPackCount}/${sortedKnownPackNames.length}</div>`,
  );
  if (context.hideLockedTellers) {
    tellerQuickActions.append(
      "<div class='gamebutton gamebutton-small' style='display:inline-block; margin-right:4px; margin-bottom:4px;'>Showing unlocked tellers only</div>",
    );
  }
  for (const packName of visibleKnownPackNames) {
    const statusLabel = context.getPackStatusLabel(
      packName,
      bank,
      usingCachedBank,
    );
    const isUnlocked = context.isPackUnlocked(packName, bank);
    tellerQuickActions.append(
      `<div class='gamebutton gamebutton-small' style='display:inline-block; margin-right:4px; margin-bottom:4px; opacity:${isUnlocked ? "1" : "0.75"};' onclick='parent.enhanced_bank_ui.gotoTellerPack("${packName}")' title='Go to ${packName} map'>${context.getPackLabel(packName)} · ${statusLabel}</div>`,
    );
  }
  tellerItemsContainer.append(tellerQuickActions);
  for (const packName of sortedPackNames) {
    const packItems = bank[packName] || [];
    const usedSlots = packItems.reduce((acc, item) => acc + (item ? 1 : 0), 0);
    const packMeta = context.getPackMeta(packName);
    const statusLabel = context.getPackStatusLabel(
      packName,
      bank,
      usingCachedBank,
    );
    const packContainer = $("<div style='width: 265px; flex: 0 0 265px;'>");
    packContainer.append(
      `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${context.getPackLabel(packName)} ${usedSlots}/${packItems.length}</div>`,
    );
    packContainer.append(
      `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px; opacity: 0.9;' onclick='parent.enhanced_bank_ui.gotoTellerPack("${packName}")' title='Go to teller map'>Go to ${packMeta && packMeta.map ? packMeta.map : "bank"} · ${statusLabel}</div>`,
    );
    const itemsContainer = $("<div style='margin-bottom: 10px'>");
    packContainer.append(itemsContainer);
    const tellerEntries = [];
    for (let slotIndex = 0; slotIndex < packItems.length; ) {
      const itemInfo = packItems[slotIndex];
      if (!itemInfo) {
        if (context.combineEmptySlots) {
          const startIndex = slotIndex;
          while (slotIndex < packItems.length && !packItems[slotIndex]) {
            slotIndex++;
          }
          tellerEntries.push({
            kind: "empty",
            startIndex,
            slotCount: slotIndex - startIndex,
          });
          continue;
        }
        tellerEntries.push({
          kind: "empty",
          startIndex: slotIndex,
          slotCount: 1,
        });
        slotIndex++;
        continue;
      }
      if (context.combineFilledSlots) {
        const baseItem = itemInfo;
        const firstSlotIndex = slotIndex;
        let slotCount = 0;
        let totalQuantity = 0;
        while (slotIndex < packItems.length) {
          const candidateItem = packItems[slotIndex];
          if (!candidateItem) {
            break;
          }
          if (!context.canCombineFilledSlotItems(baseItem, candidateItem)) {
            break;
          }
          totalQuantity += candidateItem.q || 1;
          slotCount++;
          slotIndex++;
        }
        const combinedItemInfo = Object.assign({}, itemInfo, {
          q: totalQuantity,
        });
        tellerEntries.push({
          kind: "item",
          slotIndex: firstSlotIndex,
          slotCount,
          itemInfo: combinedItemInfo,
          sourceItemInfo: itemInfo,
        });
        continue;
      }
      tellerEntries.push({
        kind: "item",
        slotIndex,
        slotCount: 1,
        itemInfo,
        sourceItemInfo: itemInfo,
      });
      slotIndex++;
    }
    for (const entry of tellerEntries) {
      if (entry.kind === "empty") {
        const tellerEmpty = context.createBaseEmptySlot({
          countText: entry.slotCount > 1 ? `x${entry.slotCount}` : "",
          opacity: entry.slotCount > 1 ? 0.75 : 0.55,
        });
        itemsContainer.append(tellerEmpty);
        continue;
      }
      const gItem = G.items[entry.itemInfo.name] || {};
      const itemContainer = $(
        parent.item_container(
          {
            skin: gItem.skin,
          },
          entry.itemInfo,
        ),
      );
      if (entry.slotCount > 1) {
        itemContainer.attr("title", `Combined ${entry.slotCount} slots`);
      }
      const specialVariant = context.getItemSpecialVariant(entry.itemInfo);
      context.applySpecialItemStyling(
        itemContainer,
        specialVariant === "shiny",
        specialVariant === "glitched",
      );
      context.applyExtraItemMarkers(itemContainer, entry.itemInfo);
      itemContainer.on("mousedown", (event) => {
        parent.enhanced_bank_ui.onMouseDownTellerItem(
          event,
          packName,
          entry.slotIndex,
          entry.sourceItemInfo,
        );
      });
      itemsContainer.append(itemContainer);
    }
    tellerItemsContainer.append(packContainer);
  }
};

const renderBankItems = (context, search = "", bankItemsContainer) => {
  let _a;
  context.search = search;
  bankItemsContainer =
    bankItemsContainer !== null && bankItemsContainer !== void 0
      ? bankItemsContainer
      : parent.$("#bank-items-container");
  if (bankItemsContainer && bankItemsContainer.length === 0) {
    console.warn(
      "#bank-items-container could not be found, can't rerender data",
    );
  }
  if (bankItemsContainer && bankItemsContainer.length === 1) {
    if (context.groupedDisplayMode === "all_slots") {
      renderAllBankSlots(context, search, bankItemsContainer);
      return;
    }
    if (context.groupedDisplayMode === "bank_slots") {
      renderBankItemsBySlots(context, search, bankItemsContainer);
      return;
    }
    bankItemsContainer.html("");
    const groups = context.filter(search);
    const sortedGroupKeys = context.getSortedGroupKeys(groups);
    for (const itemType of sortedGroupKeys) {
      const itemsByType = groups[itemType];
      if (!itemsByType) {
        continue;
      }
      const itemTypeContainer = $("<div style='float:left; margin-left:5px;'>");
      const groupDisplayLabel = context.getDisplayGroupLabel(itemType);
      const canJumpToTeller =
        context.groupMode === "teller_pack" && /^items\d+$/i.test(itemType);
      const groupHeader = canJumpToTeller
        ? `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px; cursor:pointer;' onclick='parent.enhanced_bank_ui.gotoTellerPack("${itemType}")' title='Go to ${itemType} map'>${groupDisplayLabel}</div>`
        : `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${groupDisplayLabel}</div>`;
      itemTypeContainer.append(groupHeader);
      bankItemsContainer.append(itemTypeContainer);
      const itemsContainer = $("<div style='margin-bottom: 10px'>");
      itemTypeContainer.append(itemsContainer);
      const sortedItemKeys = context.getSortedItemKeys(itemsByType);
      for (const itemKey of sortedItemKeys) {
        const gItem = G.items[itemKey];
        const { amount, levels } =
          (_a = itemsByType.items[itemKey]) !== null && _a !== void 0 ? _a : {};
        const designatedPack = context.getDesignatedPack(itemKey);
        if (context.combineFilledSlots) {
          let totalAmount = 0;
          let hasShiny = false;
          let hasGlitched = false;
          for (const levelKey in levels) {
            const levelData = levels[levelKey];
            if (!levelData) {
              continue;
            }
            totalAmount += levelData.amount || 0;
            hasShiny = hasShiny || !!(levelData.shinyCount || 0);
            hasGlitched = hasGlitched || !!(levelData.glitchedCount || 0);
          }
          if (totalAmount > 0) {
            const fakeItemInfo = { name: itemKey, q: totalAmount };
            const itemContainer = $(
              parent.item_container(
                {
                  skin: gItem.skin,
                },
                fakeItemInfo,
              ),
            );
            if (designatedPack) {
              itemContainer.css({
                boxShadow: "inset 0 0 0 1px rgba(119,189,255,0.95)",
              });
              itemContainer.attr(
                "title",
                `Designated teller: ${context.getPackLabel(designatedPack)} (middle click to cycle) · Combined all levels`,
              );
            } else {
              itemContainer.attr(
                "title",
                "No designated teller (middle click to cycle) · Combined all levels",
              );
            }
            context.applySpecialItemStyling(
              itemContainer,
              hasShiny,
              hasGlitched,
            );
            context.applyExtraItemMarkers(itemContainer, fakeItemInfo);
            itemContainer.attr(
              "onmousedown",
              `parent.enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', 'all')`,
            );
            const countElement = itemContainer.find(".iqui");
            countElement.css({
              fontSize: "16px",
            });
            const count = Number(countElement.text());
            const prettyCount = abbreviateNumber(count);
            if (prettyCount) {
              countElement.html(prettyCount.toString());
            }
            itemsContainer.append(itemContainer);
          }
          continue;
        }
        for (const level in levels) {
          const data = levels[Number(level)];
          const fakeItemInfo = { name: itemKey };
          if (Number(level) > 0) {
            fakeItemInfo.level = Number(level);
          }
          if (data.amount) {
            fakeItemInfo.q = data.amount;
          }
          const itemContainer = $(
            parent.item_container(
              {
                skin: gItem.skin,
              },
              fakeItemInfo,
            ),
          );
          if (designatedPack) {
            itemContainer.css({
              boxShadow: "inset 0 0 0 1px rgba(119,189,255,0.95)",
            });
            itemContainer.attr(
              "title",
              `Designated teller: ${context.getPackLabel(designatedPack)} (middle click to cycle)`,
            );
          } else {
            itemContainer.attr(
              "title",
              "No designated teller (middle click to cycle)",
            );
          }
          context.applySpecialItemStyling(
            itemContainer,
            !!(data && data.shinyCount),
            !!(data && data.glitchedCount),
          );
          context.applyExtraItemMarkers(itemContainer, fakeItemInfo);
          itemContainer.attr(
            "onmousedown",
            `parent.enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', ${level})`,
          );
          const levelElement = itemContainer.find(".iuui");
          levelElement.css({
            fontSize: "16px",
          });
          const countElement = itemContainer.find(".iqui");
          countElement.css({
            fontSize: "16px",
          });
          const count = Number(countElement.text());
          const prettyCount = abbreviateNumber(count);
          if (prettyCount) {
            countElement.html(prettyCount.toString());
          }
          itemsContainer.append(itemContainer);
        }
      }
    }
    bankItemsContainer.append("<div style='clear:both;'>");
  }
};

const renderBankItemsBySlots = (context, search = "", bankItemsContainer) => {
  const $ = parent.$;
  const searchQuery = context.parseSearchQuery(search);
  bankItemsContainer =
    bankItemsContainer !== null && bankItemsContainer !== void 0
      ? bankItemsContainer
      : $("#bank-items-container");
  if (!bankItemsContainer || bankItemsContainer.length !== 1) {
    return;
  }
  bankItemsContainer.html("");
  bankItemsContainer.css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignContent: "flex-start",
    gap: "8px",
  });
  const { bank, usingCachedBank } = context.getBankSource();
  if (!Object.keys(bank).length) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small'>Not in bank</div>",
    );
    return;
  }
  const sortedPackNames = Object.keys(bank)
    .filter((packName) => {
      const packItems = bank[packName];
      return /^items\d+$/i.test(packName) && Array.isArray(packItems);
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  if (!sortedPackNames.length) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small'>No teller packs detected</div>",
    );
    return;
  }
  if (usingCachedBank) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bb7ff;'>Showing cached bank snapshot</div>",
    );
  }
  if (context.slotMoveMode) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bd08f;'>Slot Move: drag source slot onto target, or click source then target (cross-teller needs 1 empty inventory slot; ESC/right click cancels)</div>",
    );
  }
  for (const packName of sortedPackNames) {
    const packItems = bank[packName] || [];
    const usedSlots = packItems.reduce((acc, item) => acc + (item ? 1 : 0), 0);
    const packContainer = $("<div style='width: 265px; flex: 0 0 265px;'>");
    packContainer.append(
      `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${context.getPackLabel(packName)} ${usedSlots}/${packItems.length}</div>`,
    );
    const itemsContainer = $("<div style='margin-bottom: 10px'>");
    packContainer.append(itemsContainer);
    const slotEntries = [];
    for (let slotIndex = 0; slotIndex < packItems.length; ) {
      const itemInfo = packItems[slotIndex];
      if (!itemInfo) {
        if (context.combineEmptySlots) {
          const startIndex = slotIndex;
          while (slotIndex < packItems.length && !packItems[slotIndex]) {
            slotIndex++;
          }
          slotEntries.push({
            kind: "empty",
            startIndex,
            slotCount: slotIndex - startIndex,
          });
          continue;
        }
        slotEntries.push({
          kind: "empty",
          startIndex: slotIndex,
          slotCount: 1,
        });
        slotIndex++;
        continue;
      }
      if (context.combineFilledSlots) {
        const baseItem = itemInfo;
        const firstSlotIndex = slotIndex;
        let slotCount = 0;
        let totalQuantity = 0;
        while (slotIndex < packItems.length) {
          const candidateItem = packItems[slotIndex];
          if (!candidateItem) {
            break;
          }
          if (!context.canCombineFilledSlotItems(baseItem, candidateItem)) {
            break;
          }
          totalQuantity += candidateItem.q || 1;
          slotCount++;
          slotIndex++;
        }
        const combinedItemInfo = Object.assign({}, itemInfo, {
          q: totalQuantity,
        });
        slotEntries.push({
          kind: "item",
          slotIndex: firstSlotIndex,
          slotCount,
          itemInfo: combinedItemInfo,
          sourceItemInfo: itemInfo,
        });
        continue;
      }
      slotEntries.push({
        kind: "item",
        slotIndex,
        slotCount: 1,
        itemInfo,
        sourceItemInfo: itemInfo,
      });
      slotIndex++;
    }
    let renderedInPack = 0;
    for (const entry of slotEntries) {
      if (entry.kind === "empty") {
        if (!searchQuery.text && !searchQuery.property) {
          const isSelectedEmpty = context.isSelectedBankSlot(
            packName,
            entry.startIndex,
          );
          const isDragOverEmpty = context.isDragOverBankSlot(
            packName,
            entry.startIndex,
          );
          const emptySlot = context.createBaseEmptySlot({
            title: `${context.getPackLabel(packName)} slot ${entry.startIndex + 1}`,
            countText: entry.slotCount > 1 ? `x${entry.slotCount}` : "",
            selected: isSelectedEmpty,
            dragOver: entry.slotCount === 1 ? isDragOverEmpty : false,
            opacity: entry.slotCount > 1 ? 0.75 : 0.35,
          });
          if (context.slotMoveMode && entry.slotCount === 1) {
            emptySlot.on("dragenter", (event) => {
              parent.enhanced_bank_ui.onDragEnterBankSlot(
                event,
                packName,
                entry.startIndex,
              );
            });
            emptySlot.on("dragover", (event) => {
              parent.enhanced_bank_ui.onDragOverBankSlot(event);
            });
            emptySlot.on("drop", (event) => {
              parent.enhanced_bank_ui.onDropBankSlot(
                event,
                packName,
                entry.startIndex,
              );
            });
            emptySlot.on("mousedown", (event) => {
              parent.enhanced_bank_ui.onMouseDownBankSlotEmpty(
                event,
                packName,
                entry.startIndex,
              );
            });
          }
          itemsContainer.append(emptySlot);
          renderedInPack++;
        }
        continue;
      }
      if (!context.doesItemMatchSearch(entry.itemInfo, searchQuery)) {
        continue;
      }
      const itemInfo = entry.itemInfo;
      const itemDef = G.items[itemInfo.name] || {};
      const itemContainer = $(
        parent.item_container(
          {
            skin: itemDef.skin,
          },
          itemInfo,
        ),
      );
      if (entry.slotCount > 1) {
        itemContainer.attr(
          "title",
          `${context.getPackLabel(packName)} slot ${entry.slotIndex + 1} · Combined ${entry.slotCount} slots`,
        );
      } else {
        itemContainer.attr(
          "title",
          `${context.getPackLabel(packName)} slot ${entry.slotIndex + 1}`,
        );
      }
      const specialVariant = context.getItemSpecialVariant(itemInfo);
      context.applySpecialItemStyling(
        itemContainer,
        specialVariant === "shiny",
        specialVariant === "glitched",
      );
      context.applyExtraItemMarkers(itemContainer, itemInfo);
      if (context.isSelectedBankSlot(packName, entry.slotIndex)) {
        itemContainer.css({
          boxShadow: "inset 0 0 0 2px rgba(124, 255, 196, 0.95)",
        });
      }
      if (context.isDragOverBankSlot(packName, entry.slotIndex)) {
        itemContainer.css({
          boxShadow: "inset 0 0 0 2px rgba(122, 186, 255, 0.95)",
        });
      }
      if (context.slotMoveMode && entry.slotCount === 1) {
        itemContainer.attr("draggable", "true");
        itemContainer.css({ cursor: "grab" });
        itemContainer.on("dragstart", (event) => {
          parent.enhanced_bank_ui.onDragStartBankSlot(
            event,
            packName,
            entry.slotIndex,
          );
        });
        itemContainer.on("dragend", (event) => {
          parent.enhanced_bank_ui.onDragEndBankSlot(event);
        });
        itemContainer.on("dragenter", (event) => {
          parent.enhanced_bank_ui.onDragEnterBankSlot(
            event,
            packName,
            entry.slotIndex,
          );
        });
        itemContainer.on("dragover", (event) => {
          parent.enhanced_bank_ui.onDragOverBankSlot(event);
        });
        itemContainer.on("drop", (event) => {
          parent.enhanced_bank_ui.onDropBankSlot(
            event,
            packName,
            entry.slotIndex,
          );
        });
      }
      if (context.slotMoveMode && entry.slotCount > 1) {
        itemContainer.css({ cursor: "not-allowed", opacity: 0.9 });
        itemContainer.attr(
          "title",
          `${context.getPackLabel(packName)} slot ${entry.slotIndex + 1} · Combined ${entry.slotCount} slots (disable Combine Items to drag individual slots)`,
        );
      }
      if (entry.slotCount === 1 || !context.slotMoveMode) {
        itemContainer.on("mousedown", (event) => {
          parent.enhanced_bank_ui.onMouseDownBankSlotItem(
            event,
            packName,
            entry.slotIndex,
            entry.sourceItemInfo,
          );
        });
      }
      itemsContainer.append(itemContainer);
      renderedInPack++;
    }
    if (renderedInPack > 0) {
      bankItemsContainer.append(packContainer);
    }
  }
  bankItemsContainer.append("<div style='clear:both; width:100%;'></div>");
};

const renderAllBankSlots = (context, search = "", bankItemsContainer) => {
  const $ = parent.$;
  const searchQuery = context.parseSearchQuery(search);
  bankItemsContainer =
    bankItemsContainer !== null && bankItemsContainer !== void 0
      ? bankItemsContainer
      : $("#bank-items-container");
  if (!bankItemsContainer || bankItemsContainer.length !== 1) {
    return;
  }
  bankItemsContainer.html("");
  bankItemsContainer.css({
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignContent: "flex-start",
    gap: "4px",
  });
  const { bank, usingCachedBank } = context.getBankSource();
  if (!Object.keys(bank).length) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small'>Not in bank</div>",
    );
    return;
  }
  const sortedPackNames = Object.keys(bank)
    .filter((packName) => {
      const packItems = bank[packName];
      return /^items\d+$/i.test(packName) && Array.isArray(packItems);
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  if (!sortedPackNames.length) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small'>No teller packs detected</div>",
    );
    return;
  }
  if (usingCachedBank) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bb7ff;'>Showing cached bank snapshot</div>",
    );
  }
  if (context.slotMoveMode) {
    bankItemsContainer.append(
      "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bd08f;'>All Slots: drag source slot onto target, or click source then target (ESC/right click cancels)</div>",
    );
  }
  for (const packName of sortedPackNames) {
    const packItems = bank[packName] || [];
    for (let slotIndex = 0; slotIndex < packItems.length; slotIndex++) {
      const label = `${packName.replace("items", "T")}.${slotIndex + 1}`;
      const itemInfo = packItems[slotIndex];
      if (!itemInfo) {
        if (!searchQuery.text && !searchQuery.property) {
          const isSelectedEmpty = context.isSelectedBankSlot(
            packName,
            slotIndex,
          );
          const emptySlot = context.createBaseEmptySlot({
            title: `${context.getPackLabel(packName)} slot ${slotIndex + 1}`,
            label,
            selected: isSelectedEmpty,
            dragOver: context.isDragOverBankSlot(packName, slotIndex),
            opacity: 0.32,
          });
          if (context.slotMoveMode) {
            emptySlot.on("dragenter", (event) => {
              parent.enhanced_bank_ui.onDragEnterBankSlot(
                event,
                packName,
                slotIndex,
              );
            });
            emptySlot.on("dragover", (event) => {
              parent.enhanced_bank_ui.onDragOverBankSlot(event);
            });
            emptySlot.on("drop", (event) => {
              parent.enhanced_bank_ui.onDropBankSlot(
                event,
                packName,
                slotIndex,
              );
            });
            emptySlot.on("mousedown", (event) => {
              parent.enhanced_bank_ui.onMouseDownBankSlotEmpty(
                event,
                packName,
                slotIndex,
              );
            });
          }
          bankItemsContainer.append(emptySlot);
        }
        continue;
      }
      if (!context.doesItemMatchSearch(itemInfo, searchQuery)) {
        continue;
      }
      const itemDef = G.items[itemInfo.name] || {};
      const itemContainer = $(
        parent.item_container(
          {
            skin: itemDef.skin,
          },
          itemInfo,
        ),
      );
      itemContainer.css({
        position: "relative",
        boxSizing: "border-box",
      });
      itemContainer.append(
        `<div style='position:absolute; left:1px; top:1px; font-size:8px; color:#8f97a1;'>${label}</div>`,
      );
      itemContainer.attr(
        "title",
        `${context.getPackLabel(packName)} slot ${slotIndex + 1}`,
      );
      const specialVariant = context.getItemSpecialVariant(itemInfo);
      context.applySpecialItemStyling(
        itemContainer,
        specialVariant === "shiny",
        specialVariant === "glitched",
      );
      context.applyExtraItemMarkers(itemContainer, itemInfo);
      if (context.isSelectedBankSlot(packName, slotIndex)) {
        itemContainer.css({
          boxShadow: "inset 0 0 0 2px rgba(124, 255, 196, 0.95)",
        });
      }
      if (context.isDragOverBankSlot(packName, slotIndex)) {
        itemContainer.css({
          boxShadow: "inset 0 0 0 2px rgba(122, 186, 255, 0.95)",
        });
      }
      if (context.slotMoveMode) {
        itemContainer.attr("draggable", "true");
        itemContainer.css({ cursor: "grab" });
        itemContainer.on("dragstart", (event) => {
          parent.enhanced_bank_ui.onDragStartBankSlot(
            event,
            packName,
            slotIndex,
          );
        });
        itemContainer.on("dragend", (event) => {
          parent.enhanced_bank_ui.onDragEndBankSlot(event);
        });
        itemContainer.on("dragenter", (event) => {
          parent.enhanced_bank_ui.onDragEnterBankSlot(
            event,
            packName,
            slotIndex,
          );
        });
        itemContainer.on("dragover", (event) => {
          parent.enhanced_bank_ui.onDragOverBankSlot(event);
        });
        itemContainer.on("drop", (event) => {
          parent.enhanced_bank_ui.onDropBankSlot(event, packName, slotIndex);
        });
      }
      itemContainer.on("mousedown", (event) => {
        parent.enhanced_bank_ui.onMouseDownBankSlotItem(
          event,
          packName,
          slotIndex,
          itemInfo,
        );
      });
      bankItemsContainer.append(itemContainer);
    }
  }
  bankItemsContainer.append("<div style='clear:both; width:100%;'></div>");
};

module.exports = {
  renderActivePage,
  renderTellerItems,
  renderBankItems,
  renderBankItemsBySlots,
  renderAllBankSlots,
};
