// Adventure Land MMORPG - Common Functions

// DATA MANIPULATION FUNCTIONS

class StaticIndex {
  // Build static reverse index once
  // Precompute Map<value, key> (or Map<value, key[]> if values aren’t unique). Lookups are O(1).

  constructor(staticObj) {
    this.data = new Map();
    for (const [k, v] of Object.entries(staticObj)) this.data.set(v, k); // unique values
  }
}

class DynamicIndex {
  // Build and maintain dynamic index
  // For the parts that change, update the reverse index incrementally
  //      whenever a change occurs (instead of rescanning the whole dataset).
  constructor(dynamicObj) {
    this.data = new Map();
    for (const [k, v] of Object.entries(dynamicObj)) {
      this.data.set(v, k); // unique values; use array if non-unique
    }
  }

  update(key, newValue) {
    // When dynamicObj changes, update indexes incrementally:
    const oldValue = dynamicObj[key];

    // Update the object
    dynamicObj[key] = newValue;

    // Update the index: remove old mapping, add new mapping
    if (oldValue !== undefined) this.data.delete(oldValue);
    this.data.set(newValue, key);
  }
}

// Lookup function that prefers dynamic overrides
function getKeyByValue(index, value) {
  if (index.has(value)) return index.get(value);
  return index.get(value);
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

// Function to get the nearest monster of a specific type
function getNearestMonsterOfType(mtype) {
  let nearestMonster = null;
  let nearestDistance = Infinity;
  for (let id in parent.entities) {
    let entity = parent.entities[id];
    if (entity.type == "monster") {
      // if it's of our target type
      if (entity.mtype == mtype) {
        let distance = parent.distance(parent.character, entity);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestMonster = entity;
        }
      }
    }
  }
  return nearestMonster;
}
