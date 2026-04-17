# helpers/data

Data analysis helper utilities for AdventureLand.

## Public API

Exports from `index.js`:

- `DEFAULT_ITEM` — default item name used for drop chance lookups (`goldenegg`).
- `isDropArray(drop)` — returns true when a drop entry is a valid weighted drop array.
- `getDropWeight(drop)` — returns the numeric weight for a drop entry.
- `getDropType(drop)` — returns the drop type string for a drop entry.
- `isItemDrop(drop, item)` — returns true when the drop entry is the requested item.
- `isOpenDrop(drop)` — returns true when the drop entry is an `open` nested drop table reference.
- `getDropTableWeight(dropTable)` — totals the weights for a drop table.
- `getNestedDropName(drop)` — returns the nested drop table name for an `open` entry.
- `getNestedDropTable(dropName)` — resolves a nested drop table from `G.drops`.
- `getItemDropChance(dropTable, item, options)` — computes the chance to drop an item from a drop table.
- `getItemDropProbability(dropTable, item, options)` — computes the actual independent chance to receive at least one of an item from a drop table, including nested `open` entries when `includeOpen` is true.
- `getGlobalDropProbability(item, options)` — returns the probability of an item dropping from `G.drops.maps.global`.
- `getMapDropProbability(mapName, item, options)` — returns the probability of an item dropping from a specific map's drop table.
- `getMapAndGlobalDropProbability(mapName, item, options)` — returns the combined probability of an item dropping from global and map drop tables.
- `DEFAULT_STAT_KEY` — default monster stat key for ratio calculations (`max_hp`).
- `getRatio(numerator, denominator, options)` — safe ratio calculation with finite fallback.
- `getMonsterValue(monster, statKey)` — numeric stat value from a monster definition.
- `getMonsterStat(monster, statKey)` — stat lookup with fallback to `max_hp`/`hp`.
- `getMonsterStatRatio(monster, numeratorKey, denominatorKey, options)` — stat ratio helper.
- `buildMonsterRow(mtype, dropTable, item, statKey, options)` — builds a scored monster row.
- `filterValidRows(rows)` — removes rows with zero chance or stat.
- `sortRowsByRatio(rows)` — sorts monster rows by ascending ratio.
- `getCollectedMonsterRows(item, statKey, options)` — collects monster drop-stat rows from `G.drops.monsters`.
- `getMonsterXp(monster)` — returns the XP reward for a monster definition.
- `getMonsterHp(monster)` — returns the monster hit points.
- `getMonsterTimeToKillSeconds(monster, characterAttack, characterFrequency)` — estimates seconds to kill a monster.
- `getMonsterXpPerSecond(monster, characterAttack, characterFrequency)` — computes estimated XP/sec for the given character attack and frequency.
- `buildMonsterXpRow(mtype, characterAttack, characterFrequency)` — builds a rank row with time-to-kill and XP/sec.
- `filterValidXpRows(rows)` — removes invalid XP/sec rows.
- `sortRowsByXpPerSecond(rows)` — sorts monster rows by descending XP/sec.
- `getCollectedMonsterXpRows(characterAttack, characterFrequency)` — collects XP/sec rows for all `G.monsters`.
- `printTopXpRows(params)` — logs the top XP/sec monster rows.

## Usage

```js
const helperData = await require("./lib/services/helpers/data");

const dropTable = G.drops?.monsters?.rock ?? [];
const chance = helperData.getItemDropChance(dropTable, "goldenegg", {
  includeOpen: true,
});

const rows = helperData.getCollectedMonsterRows("goldenegg", "max_hp", {
  includeOpen: true,
});
helperData.printTopRows({
  item: "goldenegg",
  statKey: "max_hp",
  limit: 10,
  options: { includeOpen: true },
});

const globalChance = helperData.getGlobalDropProbability("goldenegg", {
  includeOpen: true,
});
const totalChance = helperData.getMapAndGlobalDropProbability(
  "forest",
  "goldenegg",
  { includeOpen: true },
);

const xpRows = helperData.getCollectedMonsterXpRows(
  character.attack,
  character.frequency,
);
helperData.printTopXpRows({
  attack: character.attack,
  frequency: character.frequency,
  limit: 15,
});
```

## Notes

- `getItemDropChance` supports nested `open` drop tables and avoids infinite recursion via a visited set.
- `getCollectedMonsterRows` depends on `G.drops.monsters` and `G.monsters` being defined in runtime data.
- Use `printTopRows()` for quick console inspection of the best value-to-drop ratios.
