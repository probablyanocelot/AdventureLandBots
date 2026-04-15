// Action helpers for the enhanced bank overview UI.
// Move event handling, bank slot movement, and retrieval operations here.

const onDragStartBankSlot = (context, e, packName, index) => {
  if (!context.slotMoveMode) {
    return;
  }
  context.draggedBankSlot = { packName, index };
  const dataTransfer = e && e.originalEvent && e.originalEvent.dataTransfer;
  if (dataTransfer) {
    dataTransfer.effectAllowed = "move";
    try {
      dataTransfer.setData("text/plain", JSON.stringify({ packName, index }));
    } catch (_err) {}
  }
};

const onDragEndBankSlot = (context, _e) => {
  const hadDragOver = !!context.dragOverBankSlot;
  context.draggedBankSlot = null;
  context.dragOverBankSlot = null;
  if (hadDragOver) {
    context.renderActivePage();
  }
};

const onDragEnterBankSlot = (context, e, packName, index) => {
  if (!context.slotMoveMode) {
    return;
  }
  e.preventDefault();
  if (context.isDragOverBankSlot(packName, index)) {
    return;
  }
  context.dragOverBankSlot = { packName, index };
  context.renderActivePage();
};

const onDragOverBankSlot = (context, e) => {
  if (!context.slotMoveMode) {
    return;
  }
  e.preventDefault();
  const dataTransfer = e && e.originalEvent && e.originalEvent.dataTransfer;
  if (dataTransfer) {
    dataTransfer.dropEffect = "move";
  }
};

const onDropBankSlot = async (context, e, packName, index) => {
  e.preventDefault();
  if (!context.slotMoveMode) {
    return;
  }
  const hadDragOver = !!context.dragOverBankSlot;
  context.dragOverBankSlot = null;
  let source = context.draggedBankSlot || context.selectedBankSlot;
  if (!source) {
    try {
      const dataTransfer = e && e.originalEvent && e.originalEvent.dataTransfer;
      const raw = dataTransfer ? dataTransfer.getData("text/plain") : "";
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.packName === "string" &&
          typeof parsed.index === "number"
        ) {
          source = {
            packName: parsed.packName,
            index: parsed.index,
          };
        }
      }
    } catch (_err) {}
  }
  context.draggedBankSlot = null;
  if (!source) {
    if (hadDragOver) {
      context.renderActivePage();
    }
    return;
  }
  if (source.packName === packName && source.index === index) {
    if (hadDragOver) {
      context.renderActivePage();
    }
    return;
  }
  context.clearSelectedBankSlot();
  await context.tryMoveSelectedBankSlotTo(source, packName, index);
  context.renderActivePage();
};

const onMouseDownBankItem = async (context, e, itemKey, level) => {
  e.preventDefault();
  switch (e.which) {
    case 3: // right click
      for (const key in context.groups) {
        const group = context.groups[key];
        const item = group.items[itemKey];
        if (!item) continue;
        let resolvedLevelKey = level;
        let itemByLevel = item.levels[level];
        if (!itemByLevel && level === "all") {
          const sortedLevelKeys = Object.keys(item.levels || {}).sort(
            (a, b) => Number(a) - Number(b),
          );
          for (const levelKey of sortedLevelKeys) {
            const candidate = item.levels[levelKey];
            if (
              candidate &&
              candidate.indexes &&
              candidate.indexes.length > 0
            ) {
              resolvedLevelKey = levelKey;
              itemByLevel = candidate;
              break;
            }
          }
        }
        if (itemByLevel && itemByLevel.indexes.length > 0) {
          const [pack, index] = itemByLevel.indexes.splice(0, 1)[0];
          const bankItem = context.getBankItem(pack, index);
          const retrievedAmount = (bankItem && bankItem.q) || 1;
          const didRetrieve = await context.safeRetrieveFromBank(
            pack,
            index,
            bankItem || {
              name: itemKey,
              level: Number(level),
              q: 1,
            },
          );
          if (!didRetrieve) {
            break;
          }
          itemByLevel.amount -= retrievedAmount;
          if (itemByLevel.amount <= 0) {
            delete item.levels[resolvedLevelKey];
          }
          break;
        }
      }
      context.renderActivePage();
      break;
    case 2: // middle click
      context.cycleDesignatedPack(itemKey);
      context.renderActivePage();
      break;
    default:
      parent.render_item_info(itemKey);
      break;
  }
};

const onMouseDownBankSlotItem = async (
  context,
  e,
  packName,
  index,
  itemInfo,
) => {
  e.preventDefault();
  if (e.which === 3) {
    if (context.slotMoveMode && context.selectedBankSlot) {
      context.clearSelectedBankSlot();
      context.renderActivePage();
      return;
    }
    if (itemInfo && itemInfo.name) {
      parent.render_item_info(itemInfo.name);
    }
    return;
  }
  if (e.which === 1) {
    if (
      context.slotMoveMode &&
      (context.groupedDisplayMode === "bank_slots" ||
        context.groupedDisplayMode === "all_slots")
    ) {
      if (context.isSelectedBankSlot(packName, index)) {
        context.clearSelectedBankSlot();
        context.renderActivePage();
        return;
      }
      if (context.selectedBankSlot) {
        const source = context.selectedBankSlot;
        context.clearSelectedBankSlot();
        await context.tryMoveSelectedBankSlotTo(source, packName, index);
        context.renderActivePage();
        return;
      }
      context.selectedBankSlot = { packName, index };
      context.renderActivePage();
      return;
    }
    if (await context.safeRetrieveFromBank(packName, index, itemInfo)) {
      context.renderActivePage();
    }
    return;
  }
};

const onMouseDownBankSlotEmpty = async (context, e, packName, index) => {
  e.preventDefault();
  if (e.which === 3) {
    if (context.slotMoveMode && context.selectedBankSlot) {
      context.clearSelectedBankSlot();
      context.renderActivePage();
    }
    return;
  }
  if (e.which !== 1) {
    return;
  }
  if (
    !context.slotMoveMode ||
    (context.groupedDisplayMode !== "bank_slots" &&
      context.groupedDisplayMode !== "all_slots") ||
    !context.selectedBankSlot
  ) {
    return;
  }
  const source = context.selectedBankSlot;
  context.clearSelectedBankSlot();
  await context.tryMoveSelectedBankSlotTo(source, packName, index);
  context.renderActivePage();
};

const onMouseDownTellerItem = async (context, e, packName, index, itemInfo) => {
  e.preventDefault();
  switch (e.which) {
    case 1: // left click: retrieve
      if (await context.safeRetrieveFromBank(packName, index, itemInfo)) {
        context.renderActivePage();
      }
      break;
    default:
      parent.render_item_info(itemInfo.name);
      break;
  }
};

module.exports = {
  onDragStartBankSlot,
  onDragEndBankSlot,
  onDragEnterBankSlot,
  onDragOverBankSlot,
  onDropBankSlot,
  onMouseDownBankItem,
  onMouseDownBankSlotItem,
  onMouseDownBankSlotEmpty,
  onMouseDownTellerItem,
};
