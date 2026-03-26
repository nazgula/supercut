# Spec 06 — Chat Column (Editor Assistant)

## Goal
Chat column: always-visible right panel. Editor Assistant powered by `/chat/stream`. LogRail shows clip processing progress via polling (not SSE — not yet in API).

## Layout
- Fixed width: 40% of main area
- `border-left: 1px solid bone-50`
- Header: avatar + "Editor Assistant" name
- LogRail: collapsible, appears while processing
- Messages area: grows upward, scroll
- Input bar: pinned to bottom

## Landing state
When no project selected:
- Hide tabs
- Center greeting + single input in chat area (not bottom bar)
- Input bar hidden

When project selected + messages exist:
- Show message history (top-scroll)
- Input bar visible

## LogRail
Since the API has no SSE for clip processing, LogRail shows derived state from `clips.list` polling:
- While any clip `status === 'processing'`: show log rail with spinner lines
  - Line per clip: "⟳ [clip filename] — processing..."
- When clip transitions to `ready`: "✓ [clip title]"
- When clip transitions to `error`: "✗ [clip filename] — [errorMessage]"
- When all done: "✓ All files processed" + auto-collapse after 3s
- Log rail is visible only when active (collapsed otherwise)

This is a simulation of streaming logs based on polling state changes. Document this clearly in code.

## Chat API integration
- Connect to `POST /chat/stream` (SSE)
- Request body: `{ messages: [{role, content}], projectId?, context? }`
  - Check how video-editor frontend calls this (same pattern)
- Parse SSE chunks, append to current AI message as it streams
- On stream end: finalize message

## Editor Assistant context
- On each message, include project context:
  - `projectId`
  - Current `page.type` (what the user is looking at)
  - Active edit ID if on edit-detail page
- Chat does NOT execute actions in this spec (v1 — read-only assistant)
- Actions like "rename character" are future work (spec 07+)

## Message types
- User message: right-aligned, `bg-navy-500`, bone text
- AI message: left-aligned, `bg-bone-25`, border
- Both reuse existing `ChatBubble` component
- Action buttons from wireframe are future work

## Input bar
- Text input: "Ask about your footage..."
- Mic button: noop for now (future: voice input)
- Send button: accent color, submits message

## State
```ts
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}
```
- Message history is in-memory (per session) — not persisted to API

## Acceptance criteria
- Chat column always visible
- Messages send and receive via `/chat/stream`
- AI responses stream token-by-token
- LogRail shows/hides based on processing state
- Landing state shows greeting when no project active
