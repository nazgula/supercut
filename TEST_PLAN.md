# Test Plan — Supercut

## Stack

| Package | Purpose |
|---|---|
| `vitest` | Test runner (native Vite integration) |
| `@testing-library/react` | Component / page rendering |
| `@testing-library/user-event` | User interaction simulation |
| `@testing-library/jest-dom` | DOM matchers (`toBeInTheDocument`, etc.) |
| `jsdom` | Browser DOM environment for vitest |

No changes to production code. Repository tests use a real in-memory sql.js
DB (WASM binary loaded directly from `node_modules`) against the real schema.
`persistDb` is a no-op in all tests.

---

## Layer 1 — Unit tests

### `src/db/utils.ts`

| Test | Assertion |
|---|---|
| valid JSON string | returns parsed value |
| malformed JSON | returns `null`, does not throw |
| null / undefined / empty string | returns `null` |

### `src/api/rpc.ts`

| Test | Assertion |
|---|---|
| `RpcError` shape | `name`, `code`, `message`, `data` set correctly; `instanceof Error` |
| `rpcCall` success | sends correct JSON-RPC body; returns `result` |
| `rpcCall` server error | throws `RpcError` with server code + message |
| `rpcCall` HTTP 500 | throws `RpcError` before attempting JSON parse |
| `rpcCall` unique IDs | two concurrent calls produce different `id` values |
| `refreshAccessToken` concurrency | two parallel calls share one in-flight fetch, not two |

---

## Layer 2 — Repository tests (real SQL, mocked persistence)

Each suite gets a fresh in-memory DB initialised with the real schema.
`persistDb` is mocked as a no-op.

### `projects`
- insert → list → get → update name → delete
- `getProject` on missing id returns `null`

### `clips`
- insert → list by `projectId` → `updateClip` status → delete
- insert re-read does not use `!` (explicit error path)

### `shots`
- insert with transcript JSON → list → `updateShot` transcript
- `rowToShot` with corrupt transcript JSON → returns `null` (not a crash)

### `edits`
- insert → `updateEdit` timeline (JSON round-trip) → delete
- `getEdit` on missing id returns `null`

### `renders`
- `insertRender` → status is `"rendering"`
- `updateRender` to `"done"` with `completedAt`
- `updateRender` to `"error"` with `errorMessage`

### `characters`
- insert → `getCharacter` → `updateCharacter` nickname

### `faceDetections`
- insert with bbox / embedding / pose → list by `clipId`
- corrupt bbox / embedding / pose JSON → fields are `null`, not a crash

### `skills`
- insert skill → `setEditSkills` → `getEditSkills` → `setEditSkills([])` removes links

---

## Layer 3 — Component tests

### `Button`
- renders all 5 variants without crashing
- shows spinner and is disabled while `loading={true}`
- `disabled` prop prevents click

### `ChatBubble`
- `role="user"` → right-aligned, slate background
- `role="ai"` → left-aligned, bone background
- optional `label` renders above message

### `SuggestionCard`
- renders `text` and `confidence`
- preview chips render with correct type labels
- Apply / Edit / Dismiss fire their handlers
- absent handlers hide the corresponding button

### `MaterialItem`
- compact (no thumbnail): title, duration, meta visible
- with thumbnail: gradient block rendered
- flag badge renders for `partial` and `bad` severity
- `title` attribute present on truncated filename span

### `MaterialStrip`
- name and role badge visible
- flag changes border colour

### `MaterialsPanel`
- first tab is active on mount
- clicking tab 2 shows tab 2 items
- empty tab shows "No items"

### `EdlGroup` / `EdlList`
- default state renders title + timecode
- `state="selected"` applies accent border
- `state="pending"` renders dashed border + drop message
- `EdlList` renders all groups

---

## Layer 4 — `AuthContext`

| Test |
|---|
| `login()` calls `rpcCall("auth.login")`, sets `user` and access token |
| `logout()` clears `user`, `authToken`, and `localStorage` refresh token |
| Mount with saved refresh token → calls `auth.refresh`, sets `user` |
| Mount with no refresh token → `isLoading` becomes `false` immediately |
| Unmount before refresh resolves → no setState after unmount |
| `signup()` returns message string, does not set `user` |

---

## Layer 5 — Page tests

### `AuthPage`
- renders email + password fields in login mode
- toggling to signup shows name field
- mode switch clears all input fields
- submit login calls `login()` from context
- `RpcError` from login displays error message

### `HomePage`
- renders sidebar with 3 hardcoded projects
- clicking a project item applies active styling
- chat input field is editable

---

## Out of scope

| Item | Reason |
|---|---|
| `LandingPage` | Static/marketing, no business logic |
| `db.ts` WASM init | Browser/Vite concern; covered implicitly by repo tests |
| CSS / Tailwind classes | Not the purpose of unit tests |
| `AuthContext` token storage in httpOnly cookie | Pending design decision (see OPEN_ISSUES.md) |
