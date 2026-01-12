// Adventure Land MMORPG - Common Functions

// DATA MANIPULATION FUNCTIONS

class StaticIndex {
  // Build static reverse index once
  // Precompute Map<value, key> (or Map<value, key[]> if values aren’t unique). Lookups are O(1).

  constructor(staticObj) {
    this.data = new Map();
    for (const [k, v] of Object.entries(staticObj)) {
      // Use JSON.stringify for object values, primitive values as-is
      const key = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
      this.data.set(key, k); // unique values
    }
  }
}

class DynamicIndex {
  // Build and maintain dynamic index
  // For the parts that change, update the reverse index incrementally
  //      whenever a change occurs (instead of rescanning the whole dataset).
  constructor(dynamicObj) {
    this.data = new Map();
    for (const [k, v] of Object.entries(dynamicObj)) {
      const key = typeof v === "object" && v !== null ? JSON.stringify(v) : v;
      this.data.set(key, k); // unique values; use array if non-unique
    }
  }

  update(key, newValue) {
    // When dynamicObj changes, update indexes incrementally:
    const oldValue = dynamicObj[key];

    // Update the object
    dynamicObj[key] = newValue;

    // Update the index: remove old mapping, add new mapping
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

// Lookup function that prefers dynamic overrides
function getKeyByValue(index, value) {
  const key =
    typeof value === "object" && value !== null ? JSON.stringify(value) : value;
  if (index.has(key)) return index.get(key);
  return undefined;
}

// Data manipulation function to count occurrences of items in an array
function countItems(arr) {
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
  // Indexes by a given property (e.g., 'name')
  constructor(staticObj, prop) {
    this.data = new Map();
    for (const [k, v] of Object.entries(staticObj)) {
      if (v && v[prop] !== undefined) {
        this.data.set(v[prop], k);
      }
    }
  }
  getKeyByProperty(value) {
    return this.data.get(value);
  }
}

// Universal filter function: returns all objects in obj where obj[prop] === value
function filterObjectsByProperty(obj, prop, value) {
  return Object.values(obj).filter((item) => item[prop] === value);
}

export {
  StaticIndex,
  DynamicIndex,
  getKeyByValue,
  countItems,
  StaticIndexByProperty,
  filterObjectsByProperty,
};
