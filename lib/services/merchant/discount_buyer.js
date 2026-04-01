const { itemsToBuy } = await require("./gathering/buying_rules.js");

const DEFAULT_SCAN_INTERVAL_MS = 1500;
const DEFAULT_MAX_DISTANCE = 300;
const DEFAULT_MAX_PRICE_RATIO = 0.85;

const normalizeItemList = (value, fallback = []) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : fallback)
        .map((name) =>
          typeof name === "string" ? name.trim().toLowerCase() : "",
        )
        .filter(Boolean),
    ),
  );

const normalizeMaxPriceByItem = (value) => {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [name, price] of Object.entries(value)) {
    const normalizedName =
      typeof name === "string" ? name.trim().toLowerCase() : "";
    const normalizedPrice = Number(price);
    if (!normalizedName) continue;
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) continue;
    out[normalizedName] = normalizedPrice;
  }
  return out;
};

const canAfford = (price, qty = 1) => {
  const total = Number(price || 0) * Math.max(1, Number(qty || 1));
  return Number(character?.gold || 0) >= total;
};

const safeTradeBuy = ({ seller, slotName, rid, qty = 1 }) => {
  try {
    const amount = Math.max(1, Number(qty || 1));

    if (typeof trade_buy === "function") {
      trade_buy(seller, slotName, amount);
      return true;
    }

    if (typeof parent?.trade_buy === "function") {
      parent.trade_buy(slotName, seller?.id, rid, amount);
      return true;
    }

    if (typeof parent?.socket?.emit === "function") {
      parent.socket.emit("trade_buy", {
        slot: slotName,
        id: seller?.id,
        rid,
        q: amount,
      });
      return true;
    }
  } catch {
    // ignore
  }

  return false;
};

const createDiscountBuyer = ({
  enabled = false,
  scanIntervalMs = DEFAULT_SCAN_INTERVAL_MS,
  maxDistance = DEFAULT_MAX_DISTANCE,
  maxPriceRatio = DEFAULT_MAX_PRICE_RATIO,
  includeItemNames,
  excludeItemNames,
  maxPriceByItem,
  maxQtyPerPurchase = 1,
  notify,
} = {}) => {
  const includeNames = normalizeItemList(includeItemNames, itemsToBuy);
  const excludeNames = normalizeItemList(excludeItemNames, []);
  const includeSet = new Set(includeNames);
  const excludeSet = new Set(excludeNames);

  const st = {
    enabled: Boolean(enabled),
    scanIntervalMs: Math.max(
      250,
      Number(scanIntervalMs || DEFAULT_SCAN_INTERVAL_MS),
    ),
    maxDistance: Math.max(20, Number(maxDistance || DEFAULT_MAX_DISTANCE)),
    maxPriceRatio: Math.max(
      0.01,
      Number(maxPriceRatio || DEFAULT_MAX_PRICE_RATIO),
    ),
    maxPriceByItem: normalizeMaxPriceByItem(maxPriceByItem),
    maxQtyPerPurchase: Math.max(1, Number(maxQtyPerPurchase || 1)),
    lastScanAt: 0,
    seenRid: new Set(),
  };

  const isEligibleItem = (itemName) => {
    if (!itemName) return false;
    const normalized = String(itemName).toLowerCase();
    if (excludeSet.has(normalized)) return false;
    if (!includeSet.size) return true;
    return includeSet.has(normalized);
  };

  const isPriceGood = (name, price) => {
    const normalizedName = String(name || "").toLowerCase();
    const numericPrice = Number(price || 0);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return false;

    const explicitMax = st.maxPriceByItem[normalizedName];
    if (Number.isFinite(explicitMax) && explicitMax > 0) {
      return numericPrice <= explicitMax;
    }

    const basePrice = Number(G?.items?.[normalizedName]?.g || 0);
    if (!Number.isFinite(basePrice) || basePrice <= 0) return false;
    return numericPrice <= basePrice * st.maxPriceRatio;
  };

  const scanAndBuy = () => {
    try {
      if (!st.enabled) return;

      const now = Date.now();
      if (now - st.lastScanAt < st.scanIntervalMs) return;
      st.lastScanAt = now;

      const entities = parent?.entities || {};

      for (const id in entities) {
        const seller = entities[id];
        if (!seller || seller.type !== "character") continue;
        if (seller.name === character?.name) continue;

        const dist =
          typeof parent?.distance === "function"
            ? Number(parent.distance(character, seller))
            : Infinity;
        if (!Number.isFinite(dist) || dist > st.maxDistance) continue;

        const slots = seller?.slots || {};
        for (const [slotName, slotItem] of Object.entries(slots)) {
          if (!slotName.startsWith("trade")) continue;
          if (!slotItem || typeof slotItem !== "object") continue;

          const name = String(slotItem.name || "").toLowerCase();
          if (!isEligibleItem(name)) continue;

          const rid = slotItem.rid;
          const ridKey = `${seller.id}:${slotName}:${rid}`;
          if (st.seenRid.has(ridKey)) continue;

          const price = Number(slotItem.price || slotItem.g || 0);
          if (!isPriceGood(name, price)) continue;

          const qty = Math.min(
            st.maxQtyPerPurchase,
            Math.max(1, Number(slotItem.q || 1)),
          );
          if (!canAfford(price, qty)) continue;

          const bought = safeTradeBuy({
            seller,
            slotName,
            rid,
            qty,
          });
          if (!bought) continue;

          st.seenRid.add(ridKey);
          if (typeof notify === "function") {
            notify({
              text: `discount buy ${name} x${qty} from ${seller.name} @ ${price}`,
              key: `discount:${ridKey}`,
            });
          }
        }
      }
    } catch {
      // ignore runtime failures
    }
  };

  const stopRoutine = () => {
    st.seenRid.clear();
    st.lastScanAt = 0;
  };

  return {
    scanAndBuy,
    stopRoutine,
  };
};

module.exports = {
  createDiscountBuyer,
};
