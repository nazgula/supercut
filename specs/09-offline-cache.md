---
spec: 09
title: Offline Cache Layer — Write-Through Local SQLite
status: executing
---

## Summary

Wrap `rpcCall` with a caching layer that writes every successful API response into the local sql.js SQLite DB, and falls back to reading from it when the backend is unreachable.

---

## Design

### Architecture

```
 Component
    │
    ▼
 cachedRpcCall(method, params)
    │
    ├─ online ──► rpcCall(method, params)
    │                 │
    │                 ├─ success → cache result to local DB → return result
    │                 └─ failure (network) → read from local DB → return cached
    │
    └─ offline (navigator.onLine === false) → read from local DB directly
```

### Cache key

Each cacheable RPC method maps to a specific local DB repository function. Not all methods are cacheable — only read methods that return entity data.

### Cacheable methods

| RPC method | Local DB read | Local DB write |
|---|---|---|
| `projects.list` | `listProjects()` | upsert all returned projects |
| `clips.list` | `listClips(projectId)` | upsert all returned clips |
| `edits.list` | `listEdits(projectId)` | upsert all returned edits |
| `edits.renders` | `listRenders(editId)` | upsert all returned renders |
| `faces.list` | `listFaceGroups(projectId)` | store in characters table |
| `faces.appearances` | query face_detections | store appearances |

### Non-cacheable methods (pass-through only)

- `projects.create`, `edits.create`, `edits.render`, `edits.renderVideo`
- `faces.recluster`, `faces.rename`
- All `auth.*` methods
- `/upload`, `/chat/stream` (not RPC)

### Online behavior

1. Call `rpcCall(method, params)` as normal
2. On success, if method is cacheable, write/upsert result into local SQLite
3. Return the API result

### Offline behavior

1. If `navigator.onLine === false` or `rpcCall` throws a network error
2. Look up the method in the cache map
3. Read from local SQLite and return
4. If no cached data exists, throw a clear error ("Offline — no cached data")

### Reconnect behavior

1. When `navigator.onLine` flips back to `true`, the next `cachedRpcCall` will hit the API
2. Fresh data overwrites stale cache
3. No explicit "sync" step needed — the write-through cache is self-healing

---

## Implementation

### New file: `src/api/cachedRpc.ts`

```ts
export async function cachedRpcCall<T>(method: string, params?: Record<string, unknown>): Promise<T>
```

- Imports `rpcCall` from `./rpc`
- Imports db repositories for cache read/write
- Maps method names to cache handlers
- Catches network errors (TypeError from fetch, or rpcCall HTTP errors) and falls back to cache

### Changes to existing files

- **All component files** that call `rpcCall` for cacheable methods → switch to `cachedRpcCall`
- **db repositories** — fix the `uuid` import issue (use `crypto.randomUUID()` instead) and `BindParams` type

---

## Tests

### Setup: vitest

### Test scenarios

1. **Online — caches on read**: call `cachedRpcCall("projects.list")`, verify local DB contains the projects
2. **Offline — reads from cache**: populate cache, simulate offline (`navigator.onLine = false`), call `cachedRpcCall("projects.list")`, verify returns cached data
3. **Reconnect — refreshes cache**: go back online, call again, verify fresh data from API replaces old cache
4. **Offline with empty cache**: simulate offline with no cached data, verify throws clear error
5. **Non-cacheable methods offline**: verify they throw (no fallback)

### Cleanup

All tests delete their test data from SQLite tables at the end (teardown/afterEach).

---

## Out of scope

- Write-back (creating/editing entities while offline, syncing later)
- Cache expiry / TTL
- Conflict resolution
- IndexedDB (stay with sql.js for now, swap to better-sqlite3 in Electron)
