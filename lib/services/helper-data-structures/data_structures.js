// Helper data-structures service.
// Purpose: shared data manipulation and indexing primitives.

class StaticIndex {
  constructor(staticObj = {}) {
    this.data = new Map();
    for (const [k, v] of Object.entries(staticObj || {})) {
      const key = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
      this.data.set(key, k);
    }
  }
}

class DynamicIndex {
  constructor(dynamicObj = {}) {
    this.source = dynamicObj;
    this.data = new Map();
    for (const [k, v] of Object.entries(dynamicObj || {})) {
      const key = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
      this.data.set(key, k);
    }
  }

  update(key, newValue) {
    const oldValue = this.source?.[key];

    if (this.source && typeof this.source === "object") {
      this.source[key] = newValue;
    }

    const oldKey =
      typeof oldValue === "object" && oldValue !== null
        ? JSON.stringify(oldValue)
        : oldValue;
    const newKey =
      typeof newValue === "object" && newValue !== null
        ? JSON.stringify(newValue)
        : newValue;

    if (oldValue !== undefined) this.data.delete(oldKey);
    this.data.set(newKey, key);
  }
}

function getKeyByValue(index, value) {
  const key =
    typeof value === "object" && value !== null ? JSON.stringify(value) : value;
  if (index?.has?.(key)) return index.get(key);
  return undefined;
}

function countItems(arr = []) {
  const itemCount = {};
  for (const item of arr) {
    if (itemCount[item]) {
      itemCount[item]++;
    } else {
      itemCount[item] = 1;
    }
  }
  return itemCount;
}

class StaticIndexByProperty {
  constructor(staticObj = {}, prop) {
    this.data = new Map();
    for (const [k, v] of Object.entries(staticObj || {})) {
      if (v && v[prop] !== undefined) {
        this.data.set(v[prop], k);
      }
    }
  }

  getKeyByProperty(value) {
    return this.data.get(value);
  }
}

function filterObjectsByProperty(obj = {}, prop, value) {
  return Object.values(obj || {}).filter((item) => item?.[prop] === value);
}

function is_off_timeout(last_action, time_ms) {
  if (last_action == null || new Date() - last_action >= time_ms) return true;
  return false;
}

function locate_items(item_name, item_level) {
  const itemArray = [];

  for (let i = 0; i < character.items.length; i++) {
    const item = character.items[i];
    if (!item) continue;
    if (item.name == item_name && item.level == item_level) {
      itemArray.push(i);
    }
  }

  return itemArray;
}

module.exports = {
  StaticIndex,
  DynamicIndex,
  getKeyByValue,
  countItems,
  StaticIndexByProperty,
  filterObjectsByProperty,
  is_off_timeout,
  locate_items,
};
