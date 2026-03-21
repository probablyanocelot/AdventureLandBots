/******/ (() => {
  // webpackBootstrap
  /******/ "use strict";
  /******/ let __webpack_modules__ = {
    /***/ "./src/bank.ts":
      /*!*********************!*\
  !*** ./src/bank.ts ***!
  \*********************/
      /***/ function (__unused_webpack_module, exports, __webpack_require__) {
        // npx tsc ./src/ui/inventory-enhancements.ts --target esnext --module amd --outFile "./src/ui/inventory-enhancements.js"
        // parent.enhanced_bank_ui.show()
        let __awaiter =
          (this && this.__awaiter) ||
          function (thisArg, _arguments, P, generator) {
            function adopt(value) {
              return value instanceof P
                ? value
                : new P(function (resolve) {
                    resolve(value);
                  });
            }
            return new (P || (P = Promise))(function (resolve, reject) {
              function fulfilled(value) {
                try {
                  step(generator.next(value));
                } catch (e) {
                  reject(e);
                }
              }
              function rejected(value) {
                try {
                  step(generator["throw"](value));
                } catch (e) {
                  reject(e);
                }
              }
              function step(result) {
                result.done
                  ? resolve(result.value)
                  : adopt(result.value).then(fulfilled, rejected);
              }
              step(
                (generator = generator.apply(thisArg, _arguments || [])).next(),
              );
            });
          };
        Object.defineProperty(exports, "__esModule", { value: true });
        const utils_1 = __webpack_require__(/*! ./utils */ "./src/utils.ts");
        const types = {
          helmet: "Helmets",
          chest: "Armors",
          pants: "Pants",
          gloves: "Gloves",
          shoes: "Shoes",
          cape: "Capes",
          ring: "Rings",
          earring: "Earrings",
          amulet: "Amulets",
          belt: "Belts",
          orb: "Orbs",
          weapon: "Weapons",
          shield: "Shields",
          source: "Offhands",
          quiver: "Offhands",
          misc_offhand: "Offhands",
          elixir: "Elixirs",
          pot: "Potions",
          cscroll: "Scrolls",
          uscroll: "Scrolls",
          pscroll: "Scrolls",
          offering: "Scrolls",
          material: "Crafting and Collecting",
          exchange: "Exchangeables",
          dungeon_key: "Keys",
          token: "Tokens",
          other: "Others",
        };
        class EnhancedBankUI {
          constructor() {
            this.groups = {};
            this.activePage = "grouped";
            this.search = "";
            this.sortMode = "name_asc";
            this.groupMode = "type";
            this.groupedDisplayMode = "aggregated";
            this.slotMoveMode = false;
            this.selectedBankSlot = null;
            this.dragOverBankSlot = null;
            this.slotMoveEscapeBound = false;
            this.draggedBankSlot = null;
            this.slotMoveInProgress = false;
            this.lastSlotMoveAt = 0;
            this.slotMoveCooldownMs = 300;
            this.combineFilledSlots = false;
            this.combineEmptySlots = false;
            this.hideLockedTellers = false;
            this.specialStylesInjected = false;
            this.cachedBankData = null;
            this.itemTellerPreferences = {};
            this.panelId = "enhanced-bank-ui-panel";
            this.buttonIntervalId = null;
            this.searchDebounceTimer = null;
            this.uiSettingsStorageKey = "enhanced_bank_ui_settings_v1";
            this.preferenceStorageKey =
              "enhanced_bank_ui_item_teller_preferences_v1";
            this.loadUISettings();
            this.loadItemTellerPreferences();
            this.buttonIntervalId = setInterval(() => {
              const $ = parent.$;
              const trc = $("#toprightcorner");
              const id = "bankbutton";
              const button = trc.find("#" + id);
              const hasCachedBank =
                this.cachedBankData &&
                Object.keys(this.cachedBankData).length > 0;
              if (character.bank) {
                this.captureBankSnapshot();
                // inside bank
                if (!button || button.length === 0) {
                  trc.prepend(
                    `<div id='${id}' class='gamebutton' onclick='parent.enhanced_bank_ui.show()' title='open enhanced bank overview'>BANK</div>`,
                  );
                } else {
                  button.text("BANK");
                  button.attr("title", "open enhanced bank overview");
                }
              } else if (hasCachedBank) {
                if (!button || button.length === 0) {
                  trc.prepend(
                    `<div id='${id}' class='gamebutton' onclick='parent.enhanced_bank_ui.show()' title='open cached enhanced bank overview'>BANK*</div>`,
                  );
                } else {
                  button.text("BANK*");
                  button.attr("title", "open cached enhanced bank overview");
                }
              } else {
                // outside bank
                if (button && button.length > 0) {
                  button.remove();
                }
              }
            }, 1000);
          }
          destroy() {
            const $ = parent.$;
            try {
              if (this.buttonIntervalId) {
                clearInterval(this.buttonIntervalId);
                this.buttonIntervalId = null;
              }
              if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = null;
              }
            } catch (_err) {}
            try {
              const doc =
                typeof parent !== "undefined" && parent.document
                  ? parent.document
                  : document;
              if ($ && $.fn) {
                $(doc).off("keydown.enhancedBankSlotMove");
              }
            } catch (_err) {}
            this.slotMoveEscapeBound = false;
            this.hide();
          }
          hide() {
            const $ = parent.$;
            if (!($ && $.fn)) {
              return;
            }
            $("#" + this.panelId).remove();
          }
          show() {
            const $ = parent.$;
            this.ensureSpecialStylesInjected();
            this.ensureSlotMoveEscapeBinding();
            this.hide();
            const {
              totalBankSlots,
              totalUnusedBankSlots,
              groups,
              usingCachedBank,
            } = this.groupBankByItem();
            this.groups = groups;
            const container = $("<div>", {
              style:
                "border: 5px solid gray; background-color: black; padding: 10px; width: 98%",
            });
            const title = $(
              "<div style='color: #f1c054; border-bottom: 2px dashed #C7CACA; margin-bottom: 3px; margin-left: 3px; margin-right: 3px' class='cbold'>",
            );
            container.append(title);
            title.append("Bank");
            title.append(
              "<div class='gamebutton gamebutton-small' style='display:inline-block; float:right; margin-left:6px;' onclick='parent.enhanced_bank_ui.hide()'>Close</div>",
            );
            title.append(`<span style='margin-left: 8px;'>
          <div id='bank-page-grouped' class='gamebutton gamebutton-small' style='display:inline-block; margin-right: 4px;' onclick='parent.enhanced_bank_ui.setPage("grouped")'>Grouped</div>
          <div id='bank-page-tellers' class='gamebutton gamebutton-small' style='display:inline-block;' onclick='parent.enhanced_bank_ui.setPage("tellers")'>Tellers</div>
        </span>`);
            const searchButton = $(
              `<input id='bank-search-input' placeholder='search item/id or prop:expires' oninput='parent.enhanced_bank_ui.onSearchInput(this.value)' value='${this.search || ""}' />`,
            );
            title.append(searchButton);
            title.append(
              `<div id='bank-sort-button' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 6px;' onclick='parent.enhanced_bank_ui.cycleSortMode()'>Sort: ${this.getSortModeLabel()}</div>`,
            );
            title.append(
              `<div id='bank-group-mode-button' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 6px;' onclick='parent.enhanced_bank_ui.cycleGroupMode()'>Group: ${this.getGroupModeLabel()}</div>`,
            );
            title.append(
              `<div id='bank-view-mode-button' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 6px;' onclick='parent.enhanced_bank_ui.toggleGroupedDisplayMode()'>View: ${this.getGroupedDisplayModeLabel()}</div>`,
            );
            title.append(
              `<div id='bank-toggle-slotmove' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 4px;' onclick='parent.enhanced_bank_ui.toggleSlotMoveMode()'>Slot Move: ${this.slotMoveMode ? "On" : "Off"}</div>`,
            );
            title.append(
              `<div id='bank-toggle-filled' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 6px;' onclick='parent.enhanced_bank_ui.toggleCombineFilledSlots()'>Combine Items: ${this.combineFilledSlots ? "On" : "Off"}</div>`,
            );
            title.append(
              `<div id='bank-toggle-empty' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 4px;' onclick='parent.enhanced_bank_ui.toggleCombineEmptySlots()'>Combine Empty: ${this.combineEmptySlots ? "On" : "Off"}</div>`,
            );
            title.append(
              `<div id='bank-toggle-locked' class='gamebutton gamebutton-small' style='display:inline-block; margin-left: 4px;' onclick='parent.enhanced_bank_ui.toggleHideLockedTellers()'>Hide Locked: ${this.hideLockedTellers ? "On" : "Off"}</div>`,
            );
            title.append(
              `<span id='bank-slot-overview'>${totalUnusedBankSlots} / ${totalBankSlots} free slots</span>`,
            );
            title.append(
              "<span id='bank-search-filter-chip' style='margin-left:6px;'></span>",
            );
            title.append(
              "<span id='bank-extra-legend' style='margin-left:6px; color:#bfc7d2; font-size:11px;'></span>",
            );
            title.append(
              "<span id='bank-slotmove-selection' style='margin-left:6px; color:#9bd08f;'></span>",
            );
            if (usingCachedBank) {
              title.append(
                "<span style='margin-left:6px; color:#9bb7ff;'>(cached)</span>",
              );
            }
            const bankItemsContainer = $("<div>", {
              id: "bank-items-container",
            });
            const tellerItemsContainer = $("<div>", {
              id: "bank-teller-items-container",
            });
            container.append(bankItemsContainer);
            container.append(tellerItemsContainer);
            // trigger render after elements exist in the dom
            this.renderActivePage(bankItemsContainer, tellerItemsContainer);
            const panel = $(
              `<div id='${this.panelId}' style='position:fixed; top:54px; right:16px; width:min(980px, calc(100vw - 32px)); max-height:calc(100vh - 64px); overflow:auto; z-index:2147483000; pointer-events:auto;'></div>`,
            );
            panel.append(container);
            $(parent.document.body).append(panel);
          }
          setPage(page) {
            if (page !== "grouped" && page !== "tellers") {
              return;
            }
            this.activePage = page;
            this.saveUISettings();
            this.renderActivePage();
          }
          getSortModeLabel() {
            switch (this.sortMode) {
              case "name_desc":
                return "Name ↓";
              case "amount_desc":
                return "Qty ↓";
              default:
                return "Name ↑";
            }
          }
          cycleSortMode() {
            const nextMode = {
              name_asc: "name_desc",
              name_desc: "amount_desc",
              amount_desc: "name_asc",
            };
            this.sortMode = nextMode[this.sortMode] || "name_asc";
            this.saveUISettings();
            this.renderActivePage();
          }
          getGroupModeLabel() {
            switch (this.groupMode) {
              case "teller_pack":
                return "Teller Pack";
              case "item_group":
                return "Item Group";
              default:
                return "Type";
            }
          }
          cycleGroupMode() {
            const nextMode = {
              type: "item_group",
              item_group: "teller_pack",
              teller_pack: "type",
            };
            this.groupMode = nextMode[this.groupMode] || "type";
            this.saveUISettings();
            this.renderActivePage();
          }
          getGroupedDisplayModeLabel() {
            switch (this.groupedDisplayMode) {
              case "all_slots":
                return "All Slots";
              case "bank_slots":
                return "Bank Slots";
              default:
                return "Aggregated";
            }
          }
          toggleGroupedDisplayMode() {
            const nextMode = {
              aggregated: "bank_slots",
              bank_slots: "all_slots",
              all_slots: "aggregated",
            };
            this.groupedDisplayMode =
              nextMode[this.groupedDisplayMode] || "aggregated";
            if (
              this.groupedDisplayMode !== "bank_slots" &&
              this.groupedDisplayMode !== "all_slots"
            ) {
              this.clearSelectedBankSlot();
              this.draggedBankSlot = null;
              this.dragOverBankSlot = null;
            }
            this.saveUISettings();
            this.renderActivePage();
          }
          toggleSlotMoveMode() {
            this.slotMoveMode = !this.slotMoveMode;
            if (!this.slotMoveMode) {
              this.clearSelectedBankSlot();
              this.draggedBankSlot = null;
              this.dragOverBankSlot = null;
            }
            this.saveUISettings();
            this.renderActivePage();
          }
          clearSelectedBankSlot() {
            this.selectedBankSlot = null;
          }
          isDragOverBankSlot(packName, index) {
            return !!(
              this.dragOverBankSlot &&
              this.dragOverBankSlot.packName === packName &&
              this.dragOverBankSlot.index === index
            );
          }
          ensureSlotMoveEscapeBinding() {
            const $ = parent.$;
            if (!($ && $.fn)) {
              return;
            }
            if (this.slotMoveEscapeBound) {
              return;
            }
            const doc =
              typeof parent !== "undefined" && parent.document
                ? parent.document
                : document;
            $(doc).off("keydown.enhancedBankSlotMove");
            $(doc).on("keydown.enhancedBankSlotMove", (event) => {
              if (event.key !== "Escape") {
                return;
              }
              if (!this.selectedBankSlot) {
                return;
              }
              this.clearSelectedBankSlot();
              this.renderActivePage();
              if (parent.game_log) {
                parent.game_log("Cleared selected bank slot");
              }
            });
            this.slotMoveEscapeBound = true;
          }
          isSelectedBankSlot(packName, index) {
            return !!(
              this.selectedBankSlot &&
              this.selectedBankSlot.packName === packName &&
              this.selectedBankSlot.index === index
            );
          }
          onDragStartBankSlot(e, packName, index) {
            if (!this.slotMoveMode) {
              return;
            }
            this.draggedBankSlot = { packName, index };
            const dataTransfer =
              e && e.originalEvent && e.originalEvent.dataTransfer;
            if (dataTransfer) {
              dataTransfer.effectAllowed = "move";
              try {
                dataTransfer.setData(
                  "text/plain",
                  JSON.stringify({ packName, index }),
                );
              } catch (_err) {}
            }
          }
          onDragEndBankSlot(_e) {
            const hadDragOver = !!this.dragOverBankSlot;
            this.draggedBankSlot = null;
            this.dragOverBankSlot = null;
            if (hadDragOver) {
              this.renderActivePage();
            }
          }
          onDragEnterBankSlot(e, packName, index) {
            if (!this.slotMoveMode) {
              return;
            }
            e.preventDefault();
            if (this.isDragOverBankSlot(packName, index)) {
              return;
            }
            this.dragOverBankSlot = { packName, index };
            this.renderActivePage();
          }
          onDragOverBankSlot(e) {
            if (!this.slotMoveMode) {
              return;
            }
            e.preventDefault();
            const dataTransfer =
              e && e.originalEvent && e.originalEvent.dataTransfer;
            if (dataTransfer) {
              dataTransfer.dropEffect = "move";
            }
          }
          onDropBankSlot(e, packName, index) {
            return __awaiter(this, void 0, void 0, function* () {
              e.preventDefault();
              if (!this.slotMoveMode) {
                return;
              }
              const hadDragOver = !!this.dragOverBankSlot;
              this.dragOverBankSlot = null;
              let source = this.draggedBankSlot || this.selectedBankSlot;
              if (!source) {
                try {
                  const dataTransfer =
                    e && e.originalEvent && e.originalEvent.dataTransfer;
                  const raw = dataTransfer
                    ? dataTransfer.getData("text/plain")
                    : "";
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
              this.draggedBankSlot = null;
              if (!source) {
                if (hadDragOver) {
                  this.renderActivePage();
                }
                return;
              }
              if (source.packName === packName && source.index === index) {
                if (hadDragOver) {
                  this.renderActivePage();
                }
                return;
              }
              this.clearSelectedBankSlot();
              yield this.tryMoveSelectedBankSlotTo(source, packName, index);
              this.renderActivePage();
            });
          }
          moveBankSlots(packName, fromIndex, toIndex) {
            return __awaiter(this, void 0, void 0, function* () {
              if (fromIndex === toIndex) {
                return true;
              }
              if (!character.bank) {
                if (parent.game_log) {
                  parent.game_log(
                    "Can't reorder bank slots while away from bank",
                  );
                }
                return false;
              }
              try {
                if (typeof bank_swap === "function") {
                  yield bank_swap(packName, fromIndex, toIndex);
                } else {
                  parent.socket.emit("bank", {
                    operation: "move",
                    pack: packName,
                    a: fromIndex,
                    b: toIndex,
                  });
                }
                const swapInPack = (store) => {
                  if (!store || !Array.isArray(store[packName])) {
                    return;
                  }
                  const packItems = store[packName];
                  const temp = packItems[fromIndex];
                  packItems[fromIndex] = packItems[toIndex];
                  packItems[toIndex] = temp;
                };
                swapInPack(character.bank);
                swapInPack(this.cachedBankData);
                return true;
              } catch (_err) {
                if (parent.game_log) {
                  parent.game_log("Failed to reorder bank slots");
                }
                return false;
              }
            });
          }
          getFirstEmptyInventorySlot() {
            if (!Array.isArray(character.items)) {
              return null;
            }
            for (let i = 0; i < character.items.length; i++) {
              if (!character.items[i]) {
                return i;
              }
            }
            return null;
          }
          storeToBank(packName, index, inventoryIndex) {
            return __awaiter(this, void 0, void 0, function* () {
              if (typeof bank_store === "function") {
                yield bank_store(inventoryIndex, packName, index);
                return;
              }
              parent.socket.emit("bank", {
                operation: "swap",
                pack: packName,
                str: index,
                inv: inventoryIndex,
              });
            });
          }
          moveBankSlotsAcrossPacks(
            sourcePack,
            sourceIndex,
            targetPack,
            targetIndex,
          ) {
            return __awaiter(this, void 0, void 0, function* () {
              if (!character.bank) {
                if (parent.game_log) {
                  parent.game_log(
                    "Can't move between teller packs while away from bank",
                  );
                }
                return false;
              }
              const sourceItem = this.getBankItem(sourcePack, sourceIndex);
              if (!sourceItem) {
                return false;
              }
              if (sourcePack === targetPack && sourceIndex === targetIndex) {
                return true;
              }
              const transferInventorySlot = this.getFirstEmptyInventorySlot();
              if (transferInventorySlot === null) {
                if (parent.game_log) {
                  parent.game_log(
                    "Need one empty inventory slot for cross-teller move",
                  );
                }
                return false;
              }
              const targetHadItem = !!this.getBankItem(targetPack, targetIndex);
              let pulledSourceToInventory = false;
              let storedSourceToTarget = false;
              try {
                yield this.retrieveFromBank(
                  sourcePack,
                  sourceIndex,
                  transferInventorySlot,
                );
                pulledSourceToInventory = true;
                yield this.storeToBank(
                  targetPack,
                  targetIndex,
                  transferInventorySlot,
                );
                storedSourceToTarget = true;
                if (targetHadItem) {
                  yield this.storeToBank(
                    sourcePack,
                    sourceIndex,
                    transferInventorySlot,
                  );
                }
                this.captureBankSnapshot();
                return true;
              } catch (_err) {
                if (
                  pulledSourceToInventory &&
                  !storedSourceToTarget &&
                  character.items &&
                  character.items[transferInventorySlot]
                ) {
                  try {
                    yield this.storeToBank(
                      sourcePack,
                      sourceIndex,
                      transferInventorySlot,
                    );
                  } catch (_rollbackErr) {}
                }
                if (
                  storedSourceToTarget &&
                  targetHadItem &&
                  character.items &&
                  character.items[transferInventorySlot]
                ) {
                  try {
                    yield this.storeToBank(
                      sourcePack,
                      sourceIndex,
                      transferInventorySlot,
                    );
                  } catch (_rollbackErr) {}
                }
                this.captureBankSnapshot();
                if (parent.game_log) {
                  parent.game_log(
                    "Cross-teller slot move failed (rollback attempted)",
                  );
                }
                return false;
              }
            });
          }
          moveSelectedBankSlotTo(source, packName, index) {
            return __awaiter(this, void 0, void 0, function* () {
              if (!source) {
                return false;
              }
              if (source.packName === packName) {
                return yield this.moveBankSlots(packName, source.index, index);
              }
              return yield this.moveBankSlotsAcrossPacks(
                source.packName,
                source.index,
                packName,
                index,
              );
            });
          }
          tryMoveSelectedBankSlotTo(source, packName, index) {
            return __awaiter(this, void 0, void 0, function* () {
              const now = Date.now();
              if (this.slotMoveInProgress) {
                return false;
              }
              if (now - this.lastSlotMoveAt < this.slotMoveCooldownMs) {
                return false;
              }
              this.slotMoveInProgress = true;
              try {
                return yield this.moveSelectedBankSlotTo(
                  source,
                  packName,
                  index,
                );
              } finally {
                this.lastSlotMoveAt = Date.now();
                this.slotMoveInProgress = false;
              }
            });
          }
          parseSearchQuery(search) {
            const normalized = (search || "").toLowerCase().trim();
            if (!normalized) {
              return { text: "", property: "" };
            }
            const match = normalized.match(
              /(?:^|\s)(?:prop|property|p)\s*:\s*([a-z0-9_.-]+)/,
            );
            if (!match) {
              return { text: normalized, property: "" };
            }
            const property = (match[1] || "").trim();
            const text = normalized
              .replace(match[0], " ")
              .replace(/\s+/g, " ")
              .trim();
            return { text, property };
          }
          onSearchInput(search = "") {
            this.search = search;
            if (this.searchDebounceTimer) {
              clearTimeout(this.searchDebounceTimer);
            }
            this.searchDebounceTimer = setTimeout(() => {
              this.searchDebounceTimer = null;
              this.renderBankItems(this.search);
            }, 90);
          }
          clearSearchFilter() {
            this.search = "";
            const $ = parent.$;
            const searchInput = $("#bank-search-input");
            if (searchInput && searchInput.length === 1) {
              searchInput.val("");
            }
            this.renderActivePage();
          }
          clearSearchTextFilter() {
            const parsed = this.parseSearchQuery(this.search || "");
            this.search = parsed.property ? `prop:${parsed.property}` : "";
            const $ = parent.$;
            const searchInput = $("#bank-search-input");
            if (searchInput && searchInput.length === 1) {
              searchInput.val(this.search);
            }
            this.renderActivePage();
          }
          clearSearchPropertyFilter() {
            const parsed = this.parseSearchQuery(this.search || "");
            this.search = parsed.text || "";
            const $ = parent.$;
            const searchInput = $("#bank-search-input");
            if (searchInput && searchInput.length === 1) {
              searchInput.val(this.search);
            }
            this.renderActivePage();
          }
          setPropertyPresetFilter(property) {
            const parsed = this.parseSearchQuery(this.search || "");
            const normalizedProperty = String(property || "").trim();
            const toggledOff = parsed.property === normalizedProperty;
            const nextProperty = toggledOff ? "" : normalizedProperty;
            const nextParts = [];
            if (parsed.text) {
              nextParts.push(parsed.text);
            }
            if (nextProperty) {
              nextParts.push(`prop:${nextProperty}`);
            }
            this.search = nextParts.join(" ").trim();
            const $ = parent.$;
            const searchInput = $("#bank-search-input");
            if (searchInput && searchInput.length === 1) {
              searchInput.val(this.search);
            }
            this.renderActivePage();
          }
          itemMatchesPropertyFilter(itemInfo, propertyFilter) {
            if (!propertyFilter) {
              return true;
            }
            if (!itemInfo || typeof itemInfo !== "object") {
              return false;
            }
            if (propertyFilter === "any") {
              for (const key in itemInfo) {
                if (
                  key !== "name" &&
                  key !== "q" &&
                  key !== "level" &&
                  key !== "p" &&
                  itemInfo[key] !== undefined &&
                  itemInfo[key] !== null
                ) {
                  return true;
                }
              }
              if (typeof itemInfo.p === "string") {
                return itemInfo.p !== "shiny" && itemInfo.p !== "glitched";
              }
              if (itemInfo.p && typeof itemInfo.p === "object") {
                return Object.keys(itemInfo.p).length > 0;
              }
              return false;
            }
            if (propertyFilter === "p") {
              if (typeof itemInfo.p === "string") {
                return itemInfo.p !== "shiny" && itemInfo.p !== "glitched";
              }
              return !!(itemInfo.p && typeof itemInfo.p === "object");
            }
            if (propertyFilter.startsWith("p.")) {
              const pKey = propertyFilter.slice(2);
              return !!(
                itemInfo.p &&
                typeof itemInfo.p === "object" &&
                pKey &&
                itemInfo.p[pKey] !== undefined &&
                itemInfo.p[pKey] !== null
              );
            }
            return (
              itemInfo[propertyFilter] !== undefined &&
              itemInfo[propertyFilter] !== null
            );
          }
          groupedItemMatchesPropertyFilter(groupedItem, propertyFilter) {
            if (!propertyFilter) {
              return true;
            }
            if (!groupedItem || !groupedItem.levels) {
              return false;
            }
            for (const levelKey in groupedItem.levels) {
              const levelData = groupedItem.levels[levelKey];
              if (!levelData || !Array.isArray(levelData.indexes)) {
                continue;
              }
              for (const [packName, index] of levelData.indexes) {
                const itemInfo = this.getBankItem(packName, index);
                if (this.itemMatchesPropertyFilter(itemInfo, propertyFilter)) {
                  return true;
                }
              }
            }
            return false;
          }
          doesItemMatchSearch(itemInfo, searchQuery) {
            const query =
              typeof searchQuery === "string"
                ? this.parseSearchQuery(searchQuery)
                : searchQuery || { text: "", property: "" };
            const normalizedSearch = query.text || "";
            if (!itemInfo || !itemInfo.name) {
              return false;
            }
            if (
              !this.itemMatchesPropertyFilter(itemInfo, query.property || "")
            ) {
              return false;
            }
            if (!normalizedSearch) {
              return true;
            }
            if (!itemInfo || !itemInfo.name) {
              return false;
            }
            const itemName = (itemInfo.name || "").toLowerCase();
            const itemDef = G.items[itemInfo.name] || {};
            const itemDisplayName = (itemDef.name || "").toLowerCase();
            return (
              itemName.indexOf(normalizedSearch) !== -1 ||
              itemDisplayName.indexOf(normalizedSearch) !== -1
            );
          }
          onMouseDownBankSlotItem(e, packName, index, itemInfo) {
            return __awaiter(this, void 0, void 0, function* () {
              e.preventDefault();
              if (e.which === 3) {
                if (this.slotMoveMode && this.selectedBankSlot) {
                  this.clearSelectedBankSlot();
                  this.renderActivePage();
                  return;
                }
                if (itemInfo && itemInfo.name) {
                  parent.render_item_info(itemInfo.name);
                }
                return;
              }
              if (e.which === 1) {
                if (
                  this.slotMoveMode &&
                  (this.groupedDisplayMode === "bank_slots" ||
                    this.groupedDisplayMode === "all_slots")
                ) {
                  if (this.isSelectedBankSlot(packName, index)) {
                    this.clearSelectedBankSlot();
                    this.renderActivePage();
                    return;
                  }
                  if (this.selectedBankSlot) {
                    const source = this.selectedBankSlot;
                    this.clearSelectedBankSlot();
                    yield this.tryMoveSelectedBankSlotTo(
                      source,
                      packName,
                      index,
                    );
                    this.renderActivePage();
                    return;
                  }
                  this.selectedBankSlot = { packName, index };
                  this.renderActivePage();
                  return;
                }
                if (
                  yield this.safeRetrieveFromBank(packName, index, itemInfo)
                ) {
                  this.renderActivePage();
                }
                return;
              }
            });
          }
          onMouseDownBankSlotEmpty(e, packName, index) {
            return __awaiter(this, void 0, void 0, function* () {
              e.preventDefault();
              if (e.which === 3) {
                if (this.slotMoveMode && this.selectedBankSlot) {
                  this.clearSelectedBankSlot();
                  this.renderActivePage();
                }
                return;
              }
              if (e.which !== 1) {
                return;
              }
              if (
                !this.slotMoveMode ||
                (this.groupedDisplayMode !== "bank_slots" &&
                  this.groupedDisplayMode !== "all_slots") ||
                !this.selectedBankSlot
              ) {
                return;
              }
              const source = this.selectedBankSlot;
              this.clearSelectedBankSlot();
              yield this.tryMoveSelectedBankSlotTo(source, packName, index);
              this.renderActivePage();
            });
          }
          toggleCombineFilledSlots() {
            this.combineFilledSlots = !this.combineFilledSlots;
            this.saveUISettings();
            this.renderActivePage();
          }
          toggleCombineEmptySlots() {
            this.combineEmptySlots = !this.combineEmptySlots;
            this.saveUISettings();
            this.renderActivePage();
          }
          toggleHideLockedTellers() {
            this.hideLockedTellers = !this.hideLockedTellers;
            this.saveUISettings();
            this.renderActivePage();
          }
          ensureSpecialStylesInjected() {
            const $ = parent.$;
            if (!($ && $.fn)) {
              return;
            }
            if (
              this.specialStylesInjected ||
              $("#enhanced-bank-special-style").length > 0
            ) {
              this.specialStylesInjected = true;
              return;
            }
            const styleTag = $(
              "<style id='enhanced-bank-special-style'>@keyframes bankShinePulse{0%{box-shadow:inset 0 0 0 1px rgba(255,215,0,0.55),0 0 2px rgba(255,215,0,0.25);}50%{box-shadow:inset 0 0 0 1px rgba(255,239,145,0.9),0 0 8px rgba(255,215,0,0.55);}100%{box-shadow:inset 0 0 0 1px rgba(255,215,0,0.6),0 0 3px rgba(255,215,0,0.3);}}@keyframes bankGlitchPulse{0%{box-shadow:inset 0 0 0 1px rgba(0,206,209,0.4),0 0 2px rgba(0,206,209,0.2);}50%{box-shadow:inset 0 0 0 1px rgba(0,255,255,0.9),0 0 9px rgba(0,206,209,0.6);}100%{box-shadow:inset 0 0 0 1px rgba(0,206,209,0.45),0 0 3px rgba(0,206,209,0.25);}}@keyframes bankDualPulse{0%{box-shadow:inset 0 0 0 1px rgba(255,215,0,0.6),0 0 2px rgba(0,206,209,0.35);}50%{box-shadow:inset 0 0 0 1px rgba(0,255,255,0.95),0 0 9px rgba(255,215,0,0.5);}100%{box-shadow:inset 0 0 0 1px rgba(255,215,0,0.65),0 0 3px rgba(0,206,209,0.35);}}</style>",
            );
            $("head").append(styleTag);
            this.specialStylesInjected = true;
          }
          getItemSpecialVariant(itemInfo) {
            if (!itemInfo || !itemInfo.p || typeof itemInfo.p !== "string") {
              return null;
            }
            if (itemInfo.p === "shiny") {
              return "shiny";
            }
            if (itemInfo.p === "glitched") {
              return "glitched";
            }
            return null;
          }
          stableSerialize(value) {
            if (value === null || value === undefined) {
              return String(value);
            }
            if (typeof value !== "object") {
              return JSON.stringify(value);
            }
            if (Array.isArray(value)) {
              return `[${value.map((v) => this.stableSerialize(v)).join(",")}]`;
            }
            const keys = Object.keys(value).sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" }),
            );
            return `{${keys
              .map(
                (k) => `${JSON.stringify(k)}:${this.stableSerialize(value[k])}`,
              )
              .join(",")}}`;
          }
          getItemCombineSignature(itemInfo) {
            if (!itemInfo || typeof itemInfo !== "object") {
              return "";
            }
            const signatureSource = {};
            for (const key in itemInfo) {
              if (key === "q") {
                continue;
              }
              signatureSource[key] = itemInfo[key];
            }
            return this.stableSerialize(signatureSource);
          }
          canCombineFilledSlotItems(baseItem, candidateItem) {
            if (!baseItem || !candidateItem) {
              return false;
            }
            return (
              this.getItemCombineSignature(baseItem) ===
              this.getItemCombineSignature(candidateItem)
            );
          }
          getExtraMarkerTheme(extraKey) {
            const canonicalThemes = {
              p: { bg: "#3b2f44", color: "#f0ccff" },
              "p.expires": { bg: "#3c3328", color: "#ffe2b8" },
              "p.data": { bg: "#2f3340", color: "#d5dcff" },
              l: { bg: "#3a2d2d", color: "#ffd0d0" },
              b: { bg: "#253632", color: "#b9ffe9" },
              v: { bg: "#273942", color: "#c9efff" },
              m: { bg: "#2f3a33", color: "#c8ffd6" },
              s: { bg: "#3d2f3d", color: "#f7ceff" },
              c: { bg: "#2a3a40", color: "#c4efff" },
              expires: { bg: "#4a3a2a", color: "#ffe4bf" },
              data: { bg: "#2f3548", color: "#d8e1ff" },
              rid: { bg: "#2a2f37", color: "#d2d8e3" },
            };
            const canonical = canonicalThemes[String(extraKey || "")];
            if (canonical) {
              return canonical;
            }
            const palette = [
              { bg: "#3b2f44", color: "#f0ccff" },
              { bg: "#2f3a33", color: "#c8ffd6" },
              { bg: "#2f3340", color: "#d5dcff" },
              { bg: "#3c3328", color: "#ffe2b8" },
              { bg: "#3a2d2d", color: "#ffd0d0" },
              { bg: "#273942", color: "#c9efff" },
              { bg: "#3d2f3d", color: "#f7ceff" },
              { bg: "#253632", color: "#b9ffe9" },
            ];
            const source = String(extraKey || "extra");
            let hash = 0;
            for (let i = 0; i < source.length; i++) {
              hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
            }
            return palette[hash % palette.length];
          }
          getExtraMarkerLabel(extraKey) {
            const key = String(extraKey || "X");
            if (key === "p") {
              return "P";
            }
            if (key.startsWith("p.")) {
              const pKey = key.slice(2);
              return (pKey.toUpperCase().slice(0, 2) || "P").replace(
                /[^A-Z0-9]/g,
                "",
              );
            }
            return (key.toUpperCase().slice(0, 2) || "X").replace(
              /[^A-Z0-9]/g,
              "",
            );
          }
          getExtraMarkerDisplayName(extraKey) {
            const key = String(extraKey || "extra");
            if (key === "p") {
              return "p (property)";
            }
            if (key.startsWith("p.")) {
              return `p.${key.slice(2)}`;
            }
            return key;
          }
          getExtraLegendEntries() {
            const { bank } = this.getBankSource();
            const legendMap = {};
            const coreKeys = {
              name: true,
              q: true,
              level: true,
              p: true,
            };
            for (const packName in bank) {
              if (
                !/^items\d+$/i.test(packName) ||
                !Array.isArray(bank[packName])
              ) {
                continue;
              }
              const packItems = bank[packName];
              for (let i = 0; i < packItems.length; i++) {
                const itemInfo = packItems[i];
                if (!itemInfo || typeof itemInfo !== "object") {
                  continue;
                }
                if (
                  typeof itemInfo.p === "string" &&
                  itemInfo.p !== "shiny" &&
                  itemInfo.p !== "glitched"
                ) {
                  legendMap.p = true;
                } else if (itemInfo.p && typeof itemInfo.p === "object") {
                  for (const pKey in itemInfo.p) {
                    legendMap[`p.${pKey}`] = true;
                  }
                }
                for (const key in itemInfo) {
                  if (coreKeys[key]) {
                    continue;
                  }
                  const value = itemInfo[key];
                  if (value === undefined || value === null) {
                    continue;
                  }
                  legendMap[key] = true;
                }
              }
            }
            const keys = Object.keys(legendMap).sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" }),
            );
            return keys.slice(0, 12).map((key) => {
              const theme = this.getExtraMarkerTheme(key);
              return {
                key,
                label: this.getExtraMarkerLabel(key),
                name: this.getExtraMarkerDisplayName(key),
                bg: theme.bg,
                color: theme.color,
              };
            });
          }
          renderExtraLegend() {
            const $ = parent.$;
            const legendContainer = $("#bank-extra-legend");
            if (!legendContainer || legendContainer.length !== 1) {
              return;
            }
            const entries = this.getExtraLegendEntries();
            if (!entries.length) {
              legendContainer.html("");
              return;
            }
            const chunks = entries.map(
              (entry) =>
                `<span title='${entry.name}' style='display:inline-flex; align-items:center; margin-left:4px;'><span style='display:inline-block; min-width:11px; height:11px; line-height:11px; text-align:center; font-size:8px; border-radius:2px; padding:0 2px; font-weight:700; background:${entry.bg}; color:${entry.color}; border:1px solid rgba(0,0,0,0.45);'>${entry.label}</span><span style='margin-left:2px; color:#9da7b6;'>${entry.name}</span></span>`,
            );
            legendContainer.html(
              `<span style='color:#b7bfca;'>Extras:</span>${chunks.join("")}`,
            );
          }
          getExtraItemMarkers(itemInfo) {
            if (!itemInfo || typeof itemInfo !== "object") {
              return [];
            }
            const markers = [];
            const addMarker = (extraKey, title) => {
              const label = this.getExtraMarkerLabel(extraKey);
              const theme = this.getExtraMarkerTheme(extraKey);
              if (!label) {
                return;
              }
              markers.push({
                key: extraKey,
                label,
                title,
                bg: theme.bg,
                color: theme.color,
              });
            };
            if (typeof itemInfo.p === "string") {
              if (itemInfo.p !== "shiny" && itemInfo.p !== "glitched") {
                addMarker("p", `Property: ${itemInfo.p}`);
              }
            } else if (itemInfo.p && typeof itemInfo.p === "object") {
              const propKeys = Object.keys(itemInfo.p);
              for (const key of propKeys) {
                addMarker(
                  `p.${key}`,
                  `Property ${key}: ${String(itemInfo.p[key])}`,
                );
              }
            }
            const coreKeys = {
              name: true,
              q: true,
              level: true,
              p: true,
            };
            for (const key in itemInfo) {
              if (coreKeys[key]) {
                continue;
              }
              const value = itemInfo[key];
              if (value === undefined || value === null) {
                continue;
              }
              let valueText = "";
              try {
                valueText =
                  typeof value === "object"
                    ? JSON.stringify(value)
                    : String(value);
              } catch (_err) {
                valueText = String(value);
              }
              if (valueText.length > 40) {
                valueText = `${valueText.slice(0, 37)}...`;
              }
              addMarker(key, `${key}: ${valueText}`);
            }
            return markers.slice(0, 4);
          }
          applyExtraItemMarkers(itemContainer, itemInfo) {
            if (!itemContainer || !itemInfo) {
              return;
            }
            const markers = this.getExtraItemMarkers(itemInfo);
            if (!markers.length) {
              return;
            }
            itemContainer.css({ position: "relative" });
            markers.forEach((marker, idx) => {
              const top = 1 + idx * 11;
              itemContainer.append(
                `<div title='${marker.title}' style='position:absolute; top:${top}px; left:1px; min-width:11px; height:11px; line-height:11px; text-align:center; font-size:8px; border-radius:2px; padding:0 2px; pointer-events:none; font-weight:700; background:${marker.bg}; color:${marker.color}; border:1px solid rgba(0,0,0,0.45);'>${marker.label}</div>`,
              );
            });
          }
          applySpecialItemStyling(itemContainer, hasShiny, hasGlitched) {
            if (!itemContainer) {
              return;
            }
            const badgeStyle =
              "position:absolute; top:1px; right:1px; min-width:11px; height:11px; line-height:11px; text-align:center; font-size:8px; border-radius:2px; padding:0 2px; pointer-events:none; font-weight:700;";
            if (hasShiny && hasGlitched) {
              itemContainer.css({
                animation: "bankDualPulse 1.4s ease-in-out infinite",
              });
              itemContainer.append(
                `<div style='${badgeStyle} background:#2e2e2e; color:#7fffd4; border:1px solid #ffd700;'>SG</div>`,
              );
              return;
            }
            if (hasShiny) {
              itemContainer.css({
                animation: "bankShinePulse 1.8s ease-in-out infinite",
              });
              itemContainer.append(
                `<div style='${badgeStyle} background:#2b2b2b; color:#ffd700; border:1px solid #d4af37;'>S</div>`,
              );
              return;
            }
            if (hasGlitched) {
              itemContainer.css({
                animation: "bankGlitchPulse 1.2s ease-in-out infinite",
              });
              itemContainer.append(
                `<div style='${badgeStyle} background:#1f2a2a; color:#00ced1; border:1px solid #00ced1;'>G</div>`,
              );
            }
          }
          createBaseEmptySlot(options = {}) {
            const { title, label, countText, selected, dragOver, opacity } =
              options;
            const slot = $(parent.item_container({}));
            slot.css({
              position: "relative",
              display: "inline-block",
              width: "46px",
              minWidth: "46px",
              maxWidth: "46px",
              height: "46px",
              boxSizing: "border-box",
              margin: "2px",
              verticalAlign: "top",
              opacity: opacity !== undefined ? String(opacity) : "0.55",
            });
            if (title) {
              slot.attr("title", title);
            }
            if (label) {
              slot.append(
                `<div style='position:absolute; left:1px; top:1px; font-size:8px; color:#8f97a1; pointer-events:none;'>${label}</div>`,
              );
            }
            if (countText) {
              slot.append(
                `<div style='position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); color:#9ea3a8; font-size:12px; font-weight:600; pointer-events:none;'>${countText}</div>`,
              );
            }
            if (selected) {
              slot.css({
                boxShadow: "inset 0 0 0 2px rgba(124, 255, 196, 0.95)",
                opacity: "0.85",
              });
            }
            if (dragOver) {
              slot.css({
                boxShadow: "inset 0 0 0 2px rgba(122, 186, 255, 0.95)",
                opacity: "0.95",
              });
            }
            return slot;
          }
          getSortedItemKeys(itemsByType) {
            const keys = Object.keys(itemsByType.items || {});
            if (this.sortMode === "amount_desc") {
              return keys.sort((a, b) => {
                const aItem = itemsByType.items[a] || { levels: {} };
                const bItem = itemsByType.items[b] || { levels: {} };
                const sumLevels = (item) =>
                  Object.values(item.levels || {}).reduce(
                    (sum, levelData) => sum + (levelData.amount || 0),
                    0,
                  );
                const diff = sumLevels(bItem) - sumLevels(aItem);
                if (diff !== 0) return diff;
                return a.localeCompare(b);
              });
            }
            if (this.sortMode === "name_desc") {
              return keys.sort((a, b) => b.localeCompare(a));
            }
            return keys.sort((a, b) => a.localeCompare(b));
          }
          getSortedGroupKeys(groups) {
            if (this.groupMode === "teller_pack") {
              return Object.keys(groups).sort((a, b) =>
                a.localeCompare(b, undefined, {
                  numeric: true,
                  sensitivity: "base",
                }),
              );
            }
            if (this.groupMode === "item_group") {
              return Object.keys(groups).sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: "base" }),
              );
            }
            const preferredKeys = [...new Set(Object.values(types))];
            const preferredExisting = preferredKeys.filter(
              (key) => groups[key],
            );
            const extraKeys = Object.keys(groups)
              .filter((key) => !preferredKeys.includes(key))
              .sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: "base" }),
              );
            return preferredExisting.concat(extraKeys);
          }
          getDisplayGroupLabel(groupKey) {
            if (
              this.groupMode === "teller_pack" &&
              /^items\d+$/i.test(groupKey)
            ) {
              return this.getPackLabel(groupKey);
            }
            return groupKey;
          }
          getGroupLabelForItem(gItem, packName = "") {
            if (this.groupMode === "teller_pack") {
              return packName || "unknown_pack";
            }
            if (this.groupMode === "item_group") {
              const rawGroup =
                (gItem && (gItem.group || gItem.set || gItem.category)) ||
                (gItem && gItem.type) ||
                "misc";
              return `Group: ${rawGroup}`;
            }
            let type = types[gItem.type] || "Others";
            if (gItem.e) {
              type = types.exchange || "Others";
            }
            return type;
          }
          getBankSource() {
            if (character.bank) {
              return { bank: character.bank, usingCachedBank: false };
            }
            if (this.cachedBankData) {
              return { bank: this.cachedBankData, usingCachedBank: true };
            }
            return { bank: {}, usingCachedBank: false };
          }
          captureBankSnapshot() {
            if (!character.bank) {
              return;
            }
            try {
              this.cachedBankData = JSON.parse(JSON.stringify(character.bank));
            } catch (_err) {
              const fallback = {};
              for (const packName in character.bank) {
                const packItems = character.bank[packName];
                fallback[packName] = Array.isArray(packItems)
                  ? packItems.map((item) =>
                      item ? Object.assign({}, item) : null,
                    )
                  : packItems;
              }
              this.cachedBankData = fallback;
            }
          }
          getPreferenceStorage() {
            try {
              if (typeof parent !== "undefined" && parent.localStorage) {
                return parent.localStorage;
              }
            } catch (_err) {}
            try {
              if (typeof localStorage !== "undefined") {
                return localStorage;
              }
            } catch (_err) {}
            return null;
          }
          loadUISettings() {
            const storage = this.getPreferenceStorage();
            if (!storage) {
              return;
            }
            try {
              const raw = storage.getItem(this.uiSettingsStorageKey);
              if (!raw) {
                return;
              }
              const parsed = JSON.parse(raw);
              if (!parsed || typeof parsed !== "object") {
                return;
              }
              if (
                parsed.activePage === "grouped" ||
                parsed.activePage === "tellers"
              ) {
                this.activePage = parsed.activePage;
              }
              if (
                parsed.sortMode === "name_asc" ||
                parsed.sortMode === "name_desc" ||
                parsed.sortMode === "amount_desc"
              ) {
                this.sortMode = parsed.sortMode;
              }
              if (
                parsed.groupMode === "type" ||
                parsed.groupMode === "item_group"
              ) {
                this.groupMode = parsed.groupMode;
              }
              if (parsed.groupMode === "teller_pack") {
                this.groupMode = parsed.groupMode;
              }
              if (
                parsed.groupedDisplayMode === "aggregated" ||
                parsed.groupedDisplayMode === "bank_slots" ||
                parsed.groupedDisplayMode === "all_slots"
              ) {
                this.groupedDisplayMode = parsed.groupedDisplayMode;
              }
              this.slotMoveMode = !!parsed.slotMoveMode;
              this.combineFilledSlots = !!parsed.combineFilledSlots;
              this.combineEmptySlots = !!parsed.combineEmptySlots;
              this.hideLockedTellers = !!parsed.hideLockedTellers;
            } catch (_err) {}
          }
          saveUISettings() {
            const storage = this.getPreferenceStorage();
            if (!storage) {
              return;
            }
            try {
              storage.setItem(
                this.uiSettingsStorageKey,
                JSON.stringify({
                  activePage: this.activePage,
                  sortMode: this.sortMode,
                  groupMode: this.groupMode,
                  groupedDisplayMode: this.groupedDisplayMode,
                  slotMoveMode: this.slotMoveMode,
                  combineFilledSlots: this.combineFilledSlots,
                  combineEmptySlots: this.combineEmptySlots,
                  hideLockedTellers: this.hideLockedTellers,
                }),
              );
            } catch (_err) {}
          }
          loadItemTellerPreferences() {
            this.itemTellerPreferences = {};
            const storage = this.getPreferenceStorage();
            if (!storage) {
              return;
            }
            try {
              const raw = storage.getItem(this.preferenceStorageKey);
              if (!raw) {
                return;
              }
              const parsed = JSON.parse(raw);
              if (!parsed || typeof parsed !== "object") {
                return;
              }
              for (const itemName in parsed) {
                const packName = parsed[itemName];
                if (
                  typeof itemName === "string" &&
                  itemName &&
                  typeof packName === "string" &&
                  /^items\d+$/i.test(packName)
                ) {
                  this.itemTellerPreferences[itemName] = packName;
                }
              }
            } catch (_err) {
              this.itemTellerPreferences = {};
            }
          }
          saveItemTellerPreferences() {
            const storage = this.getPreferenceStorage();
            if (!storage) {
              return;
            }
            try {
              storage.setItem(
                this.preferenceStorageKey,
                JSON.stringify(this.itemTellerPreferences || {}),
              );
            } catch (_err) {}
          }
          getDesignatedPack(itemName) {
            if (!itemName || !this.itemTellerPreferences) {
              return null;
            }
            const designatedPack = this.itemTellerPreferences[itemName];
            return typeof designatedPack === "string" ? designatedPack : null;
          }
          setDesignatedPack(itemName, packName) {
            if (!itemName) {
              return;
            }
            if (packName) {
              this.itemTellerPreferences[itemName] = packName;
            } else {
              delete this.itemTellerPreferences[itemName];
            }
            this.saveItemTellerPreferences();
          }
          getAssignablePackNames() {
            const { bank } = this.getBankSource();
            const knownPackNames = this.getSortedKnownPackNames(bank);
            const unlockedPackNames = knownPackNames.filter((packName) =>
              this.isPackUnlocked(packName, bank),
            );
            if (unlockedPackNames.length > 0) {
              return unlockedPackNames;
            }
            return knownPackNames;
          }
          cycleDesignatedPack(itemName) {
            const assignablePackNames = this.getAssignablePackNames();
            if (!assignablePackNames.length) {
              if (parent.game_log) {
                parent.game_log("No teller packs available for designation");
              }
              return;
            }
            const currentPack = this.getDesignatedPack(itemName);
            const currentIndex = assignablePackNames.indexOf(currentPack);
            if (currentIndex === -1) {
              this.setDesignatedPack(itemName, assignablePackNames[0]);
            } else if (currentIndex === assignablePackNames.length - 1) {
              this.setDesignatedPack(itemName, null);
            } else {
              this.setDesignatedPack(
                itemName,
                assignablePackNames[currentIndex + 1],
              );
            }
          }
          removeBankSlotLocally(packName, index) {
            if (
              character.bank &&
              Array.isArray(character.bank[packName]) &&
              character.bank[packName][index]
            ) {
              character.bank[packName][index] = null;
            }
            if (
              this.cachedBankData &&
              Array.isArray(this.cachedBankData[packName]) &&
              this.cachedBankData[packName][index]
            ) {
              this.cachedBankData[packName][index] = null;
            }
          }
          retrieveFromBank(packName, index, inventoryIndex = -1) {
            return __awaiter(this, void 0, void 0, function* () {
              if (typeof bank_retrieve === "function") {
                yield bank_retrieve(packName, index, inventoryIndex);
                return;
              }
              parent.socket.emit("bank", {
                operation: "swap",
                pack: packName,
                str: index,
                inv: inventoryIndex, // server interprets -1 as first available inventory slot
              });
            });
          }
          getBankItem(packName, index) {
            const { bank } = this.getBankSource();
            const packItems = bank[packName];
            if (!Array.isArray(packItems)) {
              return null;
            }
            return packItems[index] || null;
          }
          getRetrieveInventorySlot(itemInfo) {
            if (
              !itemInfo ||
              !itemInfo.name ||
              !Array.isArray(character.items)
            ) {
              return null;
            }
            const candidateItem = {
              name: itemInfo.name,
              q: itemInfo.q || 1,
            };
            if (itemInfo.level !== undefined) {
              candidateItem.level = itemInfo.level;
            }
            if (
              typeof can_add_item === "function" &&
              !can_add_item(character, candidateItem)
            ) {
              return null;
            }
            const gItem = G.items[itemInfo.name] || {};
            if (gItem.s && typeof can_stack === "function") {
              for (let i = 0; i < character.items.length; i++) {
                if (
                  can_stack(character.items[i], candidateItem, null, {
                    ignore_pvp: true,
                  })
                ) {
                  return i;
                }
              }
            }
            if (character.esize > 0) {
              return -1;
            }
            for (let i = 0; i < character.items.length; i++) {
              if (!character.items[i]) {
                return i;
              }
            }
            return null;
          }
          safeRetrieveFromBank(packName, index, itemInfo) {
            return __awaiter(this, void 0, void 0, function* () {
              if (!character.bank) {
                if (parent.game_log) {
                  parent.game_log("Can't retrieve while away from bank");
                }
                return false;
              }
              const sourceItem = itemInfo || this.getBankItem(packName, index);
              if (!sourceItem || !sourceItem.name) {
                return false;
              }
              const retrieveInventorySlot =
                this.getRetrieveInventorySlot(sourceItem);
              if (retrieveInventorySlot === null) {
                if (parent.game_log) {
                  parent.game_log("Can't retrieve: inventory is full");
                }
                return false;
              }
              try {
                yield this.retrieveFromBank(
                  packName,
                  index,
                  retrieveInventorySlot,
                );
                this.removeBankSlotLocally(packName, index);
                return true;
              } catch (_err) {
                if (parent.game_log) {
                  parent.game_log("Failed to retrieve item from bank");
                }
                return false;
              }
            });
          }
          onMouseDownTellerItem(e, packName, index, itemInfo) {
            return __awaiter(this, void 0, void 0, function* () {
              e.preventDefault();
              switch (e.which) {
                case 1: // left click: retrieve
                  if (
                    yield this.safeRetrieveFromBank(packName, index, itemInfo)
                  ) {
                    this.renderActivePage();
                  }
                  break;
                default:
                  parent.render_item_info(itemInfo.name);
                  break;
              }
            });
          }
          getPackLabel(packName) {
            const match = /^items(\d+)$/i.exec(packName);
            if (!match) {
              return packName;
            }
            const tellerNumber = Number(match[1]) + 1;
            return `Teller ${tellerNumber} (${packName})`;
          }
          getPackMeta(packName) {
            if (typeof bank_packs === "undefined" || !bank_packs[packName]) {
              return null;
            }
            const info = bank_packs[packName];
            if (!Array.isArray(info) || info.length < 1) {
              return null;
            }
            return {
              map: info[0],
              goldCost: info[1] || 0,
              shellCost: info[2] || 0,
            };
          }
          getSortedKnownPackNames(bank) {
            const knownPackNames = new Set();
            if (typeof bank_packs !== "undefined" && bank_packs) {
              for (const packName in bank_packs) {
                if (/^items\d+$/i.test(packName)) {
                  knownPackNames.add(packName);
                }
              }
            }
            if (bank) {
              for (const packName in bank) {
                if (/^items\d+$/i.test(packName)) {
                  knownPackNames.add(packName);
                }
              }
            }
            return Array.from(knownPackNames).sort((a, b) =>
              a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: "base",
              }),
            );
          }
          isPackUnlocked(packName, bank) {
            return !!(bank && Array.isArray(bank[packName]));
          }
          getPackStatusLabel(packName, bank, usingCachedBank = false) {
            if (this.isPackUnlocked(packName, bank)) {
              return "Unlocked";
            }
            const meta = this.getPackMeta(packName);
            if (!meta) {
              return "Unknown";
            }
            if (meta.goldCost <= 0 && meta.shellCost <= 0) {
              return "Base";
            }
            if (usingCachedBank) {
              return "Unknown (cached)";
            }
            return `Locked · ${(0, utils_1.abbreviateNumber)(meta.goldCost) || 0}g / ${meta.shellCost || 0} shell`;
          }
          gotoTellerPack(packName) {
            return __awaiter(this, void 0, void 0, function* () {
              const meta = this.getPackMeta(packName);
              if (!meta || !meta.map) {
                if (parent.game_log) {
                  parent.game_log(`No location metadata found for ${packName}`);
                }
                return;
              }
              try {
                if (typeof smart_move === "function") {
                  yield smart_move(meta.map);
                  return;
                }
                if (typeof transport === "function") {
                  yield transport(meta.map);
                  return;
                }
                if (parent.game_log) {
                  parent.game_log("No movement API available for teller goto");
                }
              } catch (_err) {
                if (parent.game_log) {
                  parent.game_log(`Failed to move to ${meta.map}`);
                }
              }
            });
          }
          renderActivePage(bankItemsContainer, tellerItemsContainer) {
            const $ = parent.$;
            const {
              totalBankSlots,
              totalUnusedBankSlots,
              groups,
              usingCachedBank,
            } = this.groupBankByItem();
            this.groups = groups;
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
            const parsedSearch = this.parseSearchQuery(this.search || "");
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
              this.renderExtraLegend();
            }
            if (
              this.activePage === "grouped" &&
              (this.groupedDisplayMode === "bank_slots" ||
                this.groupedDisplayMode === "all_slots") &&
              this.slotMoveMode &&
              this.selectedBankSlot
            ) {
              slotMoveSelection.html(
                `Selected: ${this.getPackLabel(this.selectedBankSlot.packName)} slot ${this.selectedBankSlot.index + 1} (ESC/right click to cancel)`,
              );
            } else {
              slotMoveSelection.html("");
            }
            groupedPageButton.css({
              opacity: this.activePage === "grouped" ? "1" : "0.65",
            });
            tellerPageButton.css({
              opacity: this.activePage === "tellers" ? "1" : "0.65",
            });
            searchInput.prop("disabled", this.activePage !== "grouped");
            searchInput.css(
              "opacity",
              this.activePage === "grouped" ? "1" : "0.35",
            );
            sortButton.html(`Sort: ${this.getSortModeLabel()}`);
            sortButton.css(
              "opacity",
              this.activePage === "grouped" ? "1" : "0.35",
            );
            groupModeButton.html(`Group: ${this.getGroupModeLabel()}`);
            groupModeButton.css(
              "opacity",
              this.activePage === "grouped" &&
                this.groupedDisplayMode === "aggregated"
                ? "1"
                : "0.35",
            );
            viewModeButton.html(`View: ${this.getGroupedDisplayModeLabel()}`);
            viewModeButton.css(
              "opacity",
              this.activePage === "grouped" ? "1" : "0.35",
            );
            slotMoveButton.html(
              `Slot Move: ${this.slotMoveMode ? "On" : "Off"}`,
            );
            slotMoveButton.css(
              "opacity",
              this.activePage === "grouped" &&
                (this.groupedDisplayMode === "bank_slots" ||
                  this.groupedDisplayMode === "all_slots")
                ? "1"
                : "0.35",
            );
            combineFilledButton.html(
              `Combine Items: ${this.combineFilledSlots ? "On" : "Off"}`,
            );
            combineFilledButton.css(
              "opacity",
              this.activePage === "tellers" ||
                (this.activePage === "grouped" &&
                  (this.groupedDisplayMode === "bank_slots" ||
                    this.groupedDisplayMode === "all_slots" ||
                    this.groupedDisplayMode === "aggregated"))
                ? "1"
                : "0.35",
            );
            combineEmptyButton.html(
              `Combine Empty: ${this.combineEmptySlots ? "On" : "Off"}`,
            );
            combineEmptyButton.css(
              "opacity",
              this.activePage === "tellers" ||
                (this.activePage === "grouped" &&
                  (this.groupedDisplayMode === "bank_slots" ||
                    this.groupedDisplayMode === "all_slots"))
                ? "1"
                : "0.35",
            );
            toggleLockedButton.html(
              `Hide Locked: ${this.hideLockedTellers ? "On" : "Off"}`,
            );
            toggleLockedButton.css(
              "opacity",
              this.activePage === "tellers" ? "1" : "0.35",
            );
            if (this.activePage === "grouped") {
              bankItemsContainer.show();
              tellerItemsContainer.hide();
              this.renderBankItems(this.search, bankItemsContainer);
              return;
            }
            bankItemsContainer.hide();
            tellerItemsContainer.show();
            this.renderTellerItems(tellerItemsContainer);
          }
          renderTellerItems(tellerItemsContainer) {
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
            const { bank, usingCachedBank } = this.getBankSource();
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
            const sortedKnownPackNames = this.getSortedKnownPackNames(bank);
            const visibleKnownPackNames = this.hideLockedTellers
              ? sortedKnownPackNames.filter((packName) =>
                  this.isPackUnlocked(packName, bank),
                )
              : sortedKnownPackNames;
            const unlockedPackCount = sortedKnownPackNames.filter((packName) =>
              this.isPackUnlocked(packName, bank),
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
            if (this.hideLockedTellers) {
              tellerQuickActions.append(
                "<div class='gamebutton gamebutton-small' style='display:inline-block; margin-right:4px; margin-bottom:4px;'>Showing unlocked tellers only</div>",
              );
            }
            for (const packName of visibleKnownPackNames) {
              const statusLabel = this.getPackStatusLabel(
                packName,
                bank,
                usingCachedBank,
              );
              const isUnlocked = this.isPackUnlocked(packName, bank);
              tellerQuickActions.append(
                `<div class='gamebutton gamebutton-small' style='display:inline-block; margin-right:4px; margin-bottom:4px; opacity:${isUnlocked ? "1" : "0.75"};' onclick='parent.enhanced_bank_ui.gotoTellerPack("${packName}")' title='Go to ${packName} map'>${this.getPackLabel(packName)} · ${statusLabel}</div>`,
              );
            }
            tellerItemsContainer.append(tellerQuickActions);
            for (const packName of sortedPackNames) {
              const packItems =
                (_a = bank[packName]) !== null && _a !== void 0 ? _a : [];
              const usedSlots = packItems.reduce(
                (acc, item) => acc + (item ? 1 : 0),
                0,
              );
              const packMeta = this.getPackMeta(packName);
              const statusLabel = this.getPackStatusLabel(
                packName,
                bank,
                usingCachedBank,
              );
              const packContainer = $(
                "<div style='width: 265px; flex: 0 0 265px;'>",
              );
              packContainer.append(
                `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${this.getPackLabel(packName)} ${usedSlots}/${packItems.length}</div>`,
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
                  if (this.combineEmptySlots) {
                    const startIndex = slotIndex;
                    while (
                      slotIndex < packItems.length &&
                      !packItems[slotIndex]
                    ) {
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
                if (this.combineFilledSlots) {
                  const baseItem = itemInfo;
                  const firstSlotIndex = slotIndex;
                  let slotCount = 0;
                  let totalQuantity = 0;
                  while (slotIndex < packItems.length) {
                    const candidateItem = packItems[slotIndex];
                    if (!candidateItem) {
                      break;
                    }
                    if (
                      !this.canCombineFilledSlotItems(baseItem, candidateItem)
                    ) {
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
                  const tellerEmpty = this.createBaseEmptySlot({
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
                  itemContainer.attr(
                    "title",
                    `Combined ${entry.slotCount} slots`,
                  );
                }
                const specialVariant = this.getItemSpecialVariant(
                  entry.itemInfo,
                );
                this.applySpecialItemStyling(
                  itemContainer,
                  specialVariant === "shiny",
                  specialVariant === "glitched",
                );
                this.applyExtraItemMarkers(itemContainer, entry.itemInfo);
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
          }
          filter(search) {
            const result = {};
            const searchQuery = this.parseSearchQuery(search);
            const normalizedSearch = searchQuery.text;
            for (const groupName in this.groups) {
              const group = this.groups[groupName];
              let itemKey;
              for (itemKey in group.items) {
                const gItem = G.items[itemKey];
                const item = group.items[itemKey];
                let shouldAdd = false;
                const propertyMatches = this.groupedItemMatchesPropertyFilter(
                  item,
                  searchQuery.property,
                );
                if (normalizedSearch) {
                  const normalizedItemKey = (itemKey || "").toLowerCase();
                  const normalizedName = (
                    gItem && gItem.name ? gItem.name : ""
                  ).toLowerCase();
                  const itemKeyMatches =
                    normalizedItemKey.indexOf(normalizedSearch) > -1;
                  const itemNameMatches =
                    normalizedName.indexOf(normalizedSearch) > -1;
                  if ((itemKeyMatches || itemNameMatches) && propertyMatches) {
                    shouldAdd = true;
                  }
                } else if (propertyMatches) {
                  shouldAdd = true;
                }
                if (shouldAdd) {
                  if (!result[groupName]) {
                    result[groupName] = { amount: 0, items: {} };
                  }
                  result[groupName].items[itemKey] = item;
                }
              }
            }
            return result;
          }
          groupBankByItem() {
            let _a, _b;
            let totalBankSlots = 0;
            let totalUsedBankSlots = 0;
            let totalUnusedBankSlots = 0;
            const groups = {};
            const { bank, usingCachedBank } = this.getBankSource();
            let packName;
            for (packName in bank) {
              const packItems = bank[packName];
              if (!/^items\d+$/i.test(packName) || !Array.isArray(packItems)) {
                continue;
              }
              totalBankSlots +=
                (_a = packItems.length) !== null && _a !== void 0 ? _a : 0;
              for (let index = 0; index < packItems.length; index++) {
                const itemInfo = packItems[index];
                if (!itemInfo) {
                  totalUnusedBankSlots++;
                  continue;
                }
                const gItem = G.items[itemInfo.name] || {};
                const level =
                  (_b = itemInfo.level) !== null && _b !== void 0 ? _b : 0;
                let groupLabel = this.getGroupLabelForItem(gItem, packName);
                let itemByType = groups[groupLabel];
                if (!itemByType) {
                  itemByType = { amount: 0, items: {} };
                  groups[groupLabel] = itemByType;
                }
                let itemData = itemByType.items[itemInfo.name];
                if (!itemData) {
                  itemData = { amount: 0, levels: {} };
                  itemByType.items[itemInfo.name] = itemData;
                }
                let levels = itemData.levels[level];
                if (!levels) {
                  levels = {
                    amount: itemInfo.q || 1,
                    indexes: [[packName, index]],
                    shinyCount: itemInfo.p === "shiny" ? 1 : 0,
                    glitchedCount: itemInfo.p === "glitched" ? 1 : 0,
                  };
                  itemData.levels[level] = levels;
                } else {
                  itemData.amount += itemInfo.q || 1;
                  levels.amount += itemInfo.q || 1;
                  levels.indexes.push([packName, index]);
                  if (itemInfo.p === "shiny") {
                    levels.shinyCount = (levels.shinyCount || 0) + 1;
                  }
                  if (itemInfo.p === "glitched") {
                    levels.glitchedCount = (levels.glitchedCount || 0) + 1;
                  }
                }
                totalUsedBankSlots++;
              }
            }
            return {
              totalBankSlots,
              totalUsedBankSlots,
              totalUnusedBankSlots,
              groups,
              usingCachedBank,
            };
          }
          onMouseDownBankItem(e, itemKey, level) {
            return __awaiter(this, void 0, void 0, function* () {
              e.preventDefault();
              switch (e.which) {
                case 3: // right click
                  for (const key in this.groups) {
                    const group = this.groups[key];
                    const item = group.items[itemKey];
                    if (!item) continue;
                    let resolvedLevelKey = level;
                    let itemByLevel = item.levels[level];
                    if (!itemByLevel && level === "all") {
                      const sortedLevelKeys = Object.keys(
                        item.levels || {},
                      ).sort((a, b) => Number(a) - Number(b));
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
                      const bankItem = this.getBankItem(pack, index);
                      const retrievedAmount = (bankItem && bankItem.q) || 1;
                      const didRetrieve = yield this.safeRetrieveFromBank(
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
                  this.renderActivePage();
                  break;
                case 2: // middle click
                  this.cycleDesignatedPack(itemKey);
                  this.renderActivePage();
                  break;
                default:
                  parent.render_item_info(itemKey);
                  break;
              }
            });
          }
          renderBankItems(search = "", bankItemsContainer) {
            let _a;
            this.search = search;
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
              if (this.groupedDisplayMode === "all_slots") {
                this.renderAllBankSlots(search, bankItemsContainer);
                return;
              }
              if (this.groupedDisplayMode === "bank_slots") {
                this.renderBankItemsBySlots(search, bankItemsContainer);
                return;
              }
              // clear contents
              bankItemsContainer.html("");
              const groups = this.filter(search);
              const sortedGroupKeys = this.getSortedGroupKeys(groups);
              for (const itemType of sortedGroupKeys) {
                const itemsByType = groups[itemType];
                if (!itemsByType) {
                  continue;
                }
                const itemTypeContainer = $(
                  "<div style='float:left; margin-left:5px;'>",
                );
                const groupDisplayLabel = this.getDisplayGroupLabel(itemType);
                const canJumpToTeller =
                  this.groupMode === "teller_pack" &&
                  /^items\d+$/i.test(itemType);
                const groupHeader = canJumpToTeller
                  ? `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px; cursor:pointer;' onclick='parent.enhanced_bank_ui.gotoTellerPack("${itemType}")' title='Go to ${itemType} map'>${groupDisplayLabel}</div>`
                  : `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${groupDisplayLabel}</div>`;
                itemTypeContainer.append(groupHeader);
                bankItemsContainer.append(itemTypeContainer);
                const itemsContainer = $("<div style='margin-bottom: 10px'>");
                itemTypeContainer.append(itemsContainer);
                // loop items
                const sortedItemKeys = this.getSortedItemKeys(itemsByType);
                for (const itemKey of sortedItemKeys) {
                  const gItem = G.items[itemKey];
                  const { amount, levels } =
                    (_a = itemsByType.items[itemKey]) !== null && _a !== void 0
                      ? _a
                      : {};
                  const designatedPack = this.getDesignatedPack(itemKey);
                  if (this.combineFilledSlots) {
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
                      hasGlitched =
                        hasGlitched || !!(levelData.glitchedCount || 0);
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
                          `Designated teller: ${this.getPackLabel(designatedPack)} (middle click to cycle) · Combined all levels`,
                        );
                      } else {
                        itemContainer.attr(
                          "title",
                          "No designated teller (middle click to cycle) · Combined all levels",
                        );
                      }
                      this.applySpecialItemStyling(
                        itemContainer,
                        hasShiny,
                        hasGlitched,
                      );
                      this.applyExtraItemMarkers(itemContainer, fakeItemInfo);
                      itemContainer.attr(
                        "onmousedown",
                        `parent.enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', 'all')`,
                      );
                      const countElement = itemContainer.find(".iqui");
                      countElement.css({
                        fontSize: "16px",
                      });
                      const count = Number(countElement.text());
                      const prettyCount = (0, utils_1.abbreviateNumber)(count);
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
                          // onclick: "render_item_info('" + itemKey + "')",
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
                        `Designated teller: ${this.getPackLabel(designatedPack)} (middle click to cycle)`,
                      );
                    } else {
                      itemContainer.attr(
                        "title",
                        "No designated teller (middle click to cycle)",
                      );
                    }
                    this.applySpecialItemStyling(
                      itemContainer,
                      !!(data && data.shinyCount),
                      !!(data && data.glitchedCount),
                    );
                    this.applyExtraItemMarkers(itemContainer, fakeItemInfo);
                    // handle left and right click
                    itemContainer.attr(
                      "onmousedown",
                      `parent.enhanced_bank_ui.onMouseDownBankItem(event, '${itemKey}', ${level})`,
                    );
                    // level container
                    const levelElement = itemContainer.find(".iuui");
                    levelElement.css({
                      fontSize: "16px",
                    });
                    // find quantity in item container and make it pretty
                    const countElement = itemContainer.find(".iqui");
                    countElement.css({
                      fontSize: "16px",
                    });
                    const count = Number(countElement.text());
                    const prettyCount = (0, utils_1.abbreviateNumber)(count);
                    if (prettyCount) {
                      countElement.html(prettyCount.toString());
                    }
                    itemsContainer.append(itemContainer);
                  }
                }
              }
              bankItemsContainer.append("<div style='clear:both;'>");
            }
          }
          renderBankItemsBySlots(search = "", bankItemsContainer) {
            const $ = parent.$;
            const searchQuery = this.parseSearchQuery(search);
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
            const { bank, usingCachedBank } = this.getBankSource();
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
            if (this.slotMoveMode) {
              bankItemsContainer.append(
                "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bd08f;'>Slot Move: drag source slot onto target, or click source then target (cross-teller needs 1 empty inventory slot; ESC/right click cancels)</div>",
              );
            }
            for (const packName of sortedPackNames) {
              const packItems = bank[packName] || [];
              const usedSlots = packItems.reduce(
                (acc, item) => acc + (item ? 1 : 0),
                0,
              );
              const packContainer = $(
                "<div style='width: 265px; flex: 0 0 265px;'>",
              );
              packContainer.append(
                `<div class='gamebutton gamebutton-small' style='margin-bottom: 5px'>${this.getPackLabel(packName)} ${usedSlots}/${packItems.length}</div>`,
              );
              const itemsContainer = $("<div style='margin-bottom: 10px'>");
              packContainer.append(itemsContainer);
              const slotEntries = [];
              for (let slotIndex = 0; slotIndex < packItems.length; ) {
                const itemInfo = packItems[slotIndex];
                if (!itemInfo) {
                  if (this.combineEmptySlots) {
                    const startIndex = slotIndex;
                    while (
                      slotIndex < packItems.length &&
                      !packItems[slotIndex]
                    ) {
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
                if (this.combineFilledSlots) {
                  const baseItem = itemInfo;
                  const firstSlotIndex = slotIndex;
                  let slotCount = 0;
                  let totalQuantity = 0;
                  while (slotIndex < packItems.length) {
                    const candidateItem = packItems[slotIndex];
                    if (!candidateItem) {
                      break;
                    }
                    if (
                      !this.canCombineFilledSlotItems(baseItem, candidateItem)
                    ) {
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
                    const isSelectedEmpty = this.isSelectedBankSlot(
                      packName,
                      entry.startIndex,
                    );
                    const isDragOverEmpty = this.isDragOverBankSlot(
                      packName,
                      entry.startIndex,
                    );
                    const emptySlot = this.createBaseEmptySlot({
                      title: `${this.getPackLabel(packName)} slot ${entry.startIndex + 1}`,
                      countText:
                        entry.slotCount > 1 ? `x${entry.slotCount}` : "",
                      selected: isSelectedEmpty,
                      dragOver: entry.slotCount === 1 ? isDragOverEmpty : false,
                      opacity: entry.slotCount > 1 ? 0.75 : 0.35,
                    });
                    if (this.slotMoveMode && entry.slotCount === 1) {
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
                if (!this.doesItemMatchSearch(entry.itemInfo, searchQuery)) {
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
                    `${this.getPackLabel(packName)} slot ${entry.slotIndex + 1} · Combined ${entry.slotCount} slots`,
                  );
                } else {
                  itemContainer.attr(
                    "title",
                    `${this.getPackLabel(packName)} slot ${entry.slotIndex + 1}`,
                  );
                }
                const specialVariant = this.getItemSpecialVariant(itemInfo);
                this.applySpecialItemStyling(
                  itemContainer,
                  specialVariant === "shiny",
                  specialVariant === "glitched",
                );
                this.applyExtraItemMarkers(itemContainer, itemInfo);
                if (this.isSelectedBankSlot(packName, entry.slotIndex)) {
                  itemContainer.css({
                    boxShadow: "inset 0 0 0 2px rgba(124, 255, 196, 0.95)",
                  });
                }
                if (this.isDragOverBankSlot(packName, entry.slotIndex)) {
                  itemContainer.css({
                    boxShadow: "inset 0 0 0 2px rgba(122, 186, 255, 0.95)",
                  });
                }
                if (this.slotMoveMode && entry.slotCount === 1) {
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
                if (this.slotMoveMode && entry.slotCount > 1) {
                  itemContainer.css({ cursor: "not-allowed", opacity: 0.9 });
                  itemContainer.attr(
                    "title",
                    `${this.getPackLabel(packName)} slot ${entry.slotIndex + 1} · Combined ${entry.slotCount} slots (disable Combine Items to drag individual slots)`,
                  );
                }
                if (entry.slotCount === 1 || !this.slotMoveMode) {
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
            bankItemsContainer.append(
              "<div style='clear:both; width:100%;'></div>",
            );
          }
          renderAllBankSlots(search = "", bankItemsContainer) {
            const $ = parent.$;
            const searchQuery = this.parseSearchQuery(search);
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
            const { bank, usingCachedBank } = this.getBankSource();
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
            if (this.slotMoveMode) {
              bankItemsContainer.append(
                "<div class='gamebutton gamebutton-small' style='flex:0 0 100%; margin-bottom:6px; color:#9bd08f;'>All Slots: drag source slot onto target, or click source then target (ESC/right click cancels)</div>",
              );
            }
            for (const packName of sortedPackNames) {
              const packItems = bank[packName] || [];
              for (
                let slotIndex = 0;
                slotIndex < packItems.length;
                slotIndex++
              ) {
                const label = `${packName.replace("items", "T")}.${slotIndex + 1}`;
                const itemInfo = packItems[slotIndex];
                if (!itemInfo) {
                  if (!searchQuery.text && !searchQuery.property) {
                    const isSelectedEmpty = this.isSelectedBankSlot(
                      packName,
                      slotIndex,
                    );
                    const emptySlot = this.createBaseEmptySlot({
                      title: `${this.getPackLabel(packName)} slot ${slotIndex + 1}`,
                      label,
                      selected: isSelectedEmpty,
                      dragOver: this.isDragOverBankSlot(packName, slotIndex),
                      opacity: 0.32,
                    });
                    if (this.slotMoveMode) {
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
                if (!this.doesItemMatchSearch(itemInfo, searchQuery)) {
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
                  `${this.getPackLabel(packName)} slot ${slotIndex + 1}`,
                );
                const specialVariant = this.getItemSpecialVariant(itemInfo);
                this.applySpecialItemStyling(
                  itemContainer,
                  specialVariant === "shiny",
                  specialVariant === "glitched",
                );
                this.applyExtraItemMarkers(itemContainer, itemInfo);
                if (this.isSelectedBankSlot(packName, slotIndex)) {
                  itemContainer.css({
                    boxShadow: "inset 0 0 0 2px rgba(124, 255, 196, 0.95)",
                  });
                }
                if (this.isDragOverBankSlot(packName, slotIndex)) {
                  itemContainer.css({
                    boxShadow: "inset 0 0 0 2px rgba(122, 186, 255, 0.95)",
                  });
                }
                if (this.slotMoveMode) {
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
                    parent.enhanced_bank_ui.onDropBankSlot(
                      event,
                      packName,
                      slotIndex,
                    );
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
            bankItemsContainer.append(
              "<div style='clear:both; width:100%;'></div>",
            );
          }
        }
        if (
          parent.enhanced_bank_ui &&
          typeof parent.enhanced_bank_ui.destroy === "function"
        ) {
          try {
            parent.enhanced_bank_ui.destroy();
          } catch (_err) {}
        }
        parent.enhanced_bank_ui = new EnhancedBankUI();

        /***/
      },

    /***/ "./src/utils.ts":
      /*!**********************!*\
  !*** ./src/utils.ts ***!
  \**********************/
      /***/ (__unused_webpack_module, exports) => {
        Object.defineProperty(exports, "__esModule", { value: true });
        exports.abbreviateNumber = void 0;
        // https://stackoverflow.com/a/40724354/28145
        function abbreviateNumber(number) {
          const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];
          if (!number) {
            return number;
          }
          // what tier? (determines SI symbol)
          const tier = (Math.log10(Math.abs(number)) / 3) | 0;
          // if zero, we don't need a suffix
          if (tier === 0) return number;
          // get suffix and determine scale
          const suffix = SI_SYMBOL[tier];
          const scale = Math.pow(10, tier * 3);
          // scale the number
          const scaled = number / scale;
          // format number and add suffix
          //   return scaled.toFixed(1) + suffix;
          return (
            scaled.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            }) + suffix
          );
        }
        exports.abbreviateNumber = abbreviateNumber;

        /***/
      },

    /******/
  };
  /************************************************************************/
  /******/ // The module cache
  /******/ let __webpack_module_cache__ = {};
  /******/
  /******/ // The require function
  /******/ function __webpack_require__(moduleId) {
    /******/ // Check if module is in cache
    /******/ let cachedModule = __webpack_module_cache__[moduleId];
    /******/ if (cachedModule !== undefined) {
      /******/ return cachedModule.exports;
      /******/
    }
    /******/ // Create a new module (and put it into the cache)
    /******/ let module = (__webpack_module_cache__[moduleId] = {
      /******/ // no module.id needed
      /******/ // no module.loaded needed
      /******/ exports: {},
      /******/
    });
    /******/
    /******/ // Execute the module function
    /******/ __webpack_modules__[moduleId].call(
      module.exports,
      module,
      module.exports,
      __webpack_require__,
    );
    /******/
    /******/ // Return the exports of the module
    /******/ return module.exports;
    /******/
  }
  /******/
  /************************************************************************/
  /******/
  /******/ // startup
  /******/ // Load entry module and return exports
  /******/ // This entry module is referenced by other modules so it can't be inlined
  /******/ let __webpack_exports__ = __webpack_require__("./src/bank.ts");
  /******/
  /******/
})();
