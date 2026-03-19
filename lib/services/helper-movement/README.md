# helper-movement

Service-owned movement helper utilities.

## Public API

- `createMoveManager()`
- `roundCoord(value)`
- `normalizeDest(dest)`
- `destSignature(dest)`
- `isCloseToDest(dest, threshold?)`

## Notes

This service owns movement request throttling/serialization behavior used by farming and combat runtimes.
