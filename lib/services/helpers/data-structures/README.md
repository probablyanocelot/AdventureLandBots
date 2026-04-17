# helpers/data-structures

Service-owned data manipulation and indexing helpers.

## Public API

- `StaticIndex`
- `DynamicIndex`
- `getKeyByValue(index, value)`
- `countItems(arr)`
- `StaticIndexByProperty`
- `filterObjectsByProperty(obj, prop, value)`
- `is_off_timeout(last_action, time_ms)`
- `locate_items(item_name, item_level)`

## Notes

`DynamicIndex` now stores the source object internally and updates it safely via `update(key, newValue)`.
