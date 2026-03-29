# Backend Chat Integration Guide

## Overview

The SuperCut frontend connects to a backend chat agent via Server-Sent Events (SSE). The agent is powered by Claude (Anthropic) with MCP tools that can read and write project data. The frontend sends the user's message + full conversation history + current UI state, and receives a stream of events.

---

## Endpoint

```
POST /chat/stream
Content-Type: application/json
Authorization: Bearer <jwt-access-token>
```

The backend runs at `http://localhost:3001`. The Vite dev server proxies `/chat` to it (configured in `vite.config.ts`).

---

## Request Body

```ts
{
  projectId: string;           // UUID — which project this chat is scoped to
  messages: Array<{            // Full conversation history — backend is stateless
    role: "user" | "assistant";
    content: string;
  }>;
  uiContext?: {                // What the user is currently looking at
    activeTab: string;         // "clips" | "characters" | "edits" | "skills" | "script"
    selectedCharacterId?: string | null;
    selectedEditId?: string | null;
    selectedEditTab?: string | null;   // "spec" | "renders"
    expandedClipId?: string | null;
    selectedSkillId?: string | null;
  };
}
```

**Important:** There is no server-side session. The frontend owns the conversation state and sends the full `messages` array on every request. The backend processes one turn and closes the stream.

---

## SSE Response Events

The response is `Content-Type: text/event-stream`. Each event is a line:
```
data: { "type": "...", ... }\n\n
```

### Event types

| type | Fields | Meaning |
|------|--------|---------|
| `text` | `text: string` | Streaming text token from Claude. Accumulate into the assistant message. |
| `tool_start` | `name: string` | Agent is calling a tool (e.g. `get_clips`). Show a loading indicator. |
| `tool_done` | `name: string` | Tool call completed. Hide loading indicator. |
| `navigate` | `view: string, id?: string, tab?: string` | Agent wants the UI to switch views. See "Navigation" below. |
| `question` | `question: string, options: string[]` | Agent is asking a clarifying question. Render buttons for each option. The user's selection should be sent as the next message. |
| `done` | — | Stream is complete. Finalize the assistant message. |
| `error` | `message: string` | An error occurred. Show to user. |

---

## Navigation

When the agent emits a `navigate` event, the frontend should update its routing/state.

### View values

| `view` | `id` | `tab` | Action |
|--------|------|-------|--------|
| `"clips"` | — | — | Switch to clips list |
| `"clip"` | clip UUID | — | Open/expand a specific clip |
| `"characters"` | — | — | Switch to characters list |
| `"character"` | character UUID | — | Open character detail |
| `"edits"` | — | — | Switch to edits list |
| `"edit"` | edit UUID | `"spec"` or `"renders"` | Open an edit, optionally a sub-tab |
| `"skills"` | — | — | Switch to skills view |
| `"script"` | — | — | Switch to script view |

**Best practice:** The frontend should handle navigation both from chat events AND from direct user interaction (clicks, URL routing). Chat navigation should call the same routing functions — do not create a parallel navigation system.

---

## Available Agent Tools (MCP)

These are the tools the Claude agent can call. Understanding them helps you know what the chat can do and what UI state may change as a result.

### Read Tools (do not mutate state)

| Tool | Params | Returns |
|------|--------|---------|
| `list_projects` | — | All projects (id, name, timestamps) |
| `get_clips` | `projectId` | All clips + their shots (title, duration, status, transcript) |
| `get_characters` | `projectId` | Face groups (label, nickname, description, detection count, clip IDs) |
| `get_character_appearances` | `projectId, characterId` | Time ranges per clip where character appears |
| `get_edits` | `projectId` | All edits (title, prompt, has timeline, render path) |
| `get_timeline` | `projectId, editId` | Full timeline with enriched shot/clip metadata |
| `get_renders` | `projectId, editId` | Render jobs (status, path, error, timestamps) |

### Write Tools (mutate state — may require UI refresh)

| Tool | Params | Side Effect |
|------|--------|-------------|
| `create_edit` | `projectId, title, prompt` | Creates edit + generates timeline via Gemini |
| `delete_edit` | `projectId, editId` | Deletes edit and its renders |
| `delete_clip` | `projectId, clipId` | Deletes clip, shots, face detections |
| `delete_character` | `projectId, characterId` | Deletes face group |
| `rename_character` | `projectId, characterId, nickname` | Updates character nickname |
| `render_edit` | `projectId, editId` | Starts background render (returns renderId) |
| `delete_renders` | `projectId, editId, renderIds` | Deletes render files |
| `reprocess_clips` | `projectId, clipIds` | Re-runs transcription + analysis |
| `detect_faces` | `projectId` | Runs face detection on unscanned clips |
| `recluster_faces` | `projectId` | Re-clusters all detections, re-identifies characters |

### Interaction Tools (handled by frontend, not MCP)

| Tool | Params | Frontend Action |
|------|--------|-----------------|
| `navigate` | `view, id?, tab?` | Update routing state |
| `ask_user` | `question, options[]` | Render choice buttons; user's pick = next message |

---

## Implementation Architecture

### Recommended file structure

```
src/
  chat/
    useChatStream.ts     — React hook: manages messages[], streaming, SSE parsing
    ChatPanel.tsx         — UI: message list, input, tool activity, question buttons
    types.ts             — ChatMessage, SSEEvent, UIContext types
```

### useChatStream hook (core logic)

```ts
interface UseChatStream {
  messages: ChatMessage[];
  isStreaming: boolean;
  toolActivity: string | null;
  question: Question | null;
  send: (text: string) => void;
  answerQuestion: (option: string) => void;
}
```

Key behaviors:
1. Maintains `messages[]` in local state (not in the DB — conversation is ephemeral).
2. On `send()`: appends user message, POSTs to `/chat/stream`, reads SSE via `ReadableStream`.
3. Accumulates `text` events into a streaming buffer; on `done`, commits to `messages[]`.
4. On `navigate` events: calls an `onNavigate` callback passed from the parent page.
5. On `question` events: pauses input, renders option buttons.
6. On `answerQuestion()`: appends the selected option as a user message and re-sends.
7. Supports `AbortController` to cancel in-flight streams.

### Handling write tool side effects

When a `tool_done` event fires for a write tool, the frontend should refresh the affected data. Recommended approach:

```ts
const REFRESH_MAP: Record<string, () => void> = {
  create_edit:       () => refetchEdits(),
  delete_edit:       () => refetchEdits(),
  delete_clip:       () => refetchClips(),
  delete_character:  () => refetchCharacters(),
  rename_character:  () => refetchCharacters(),
  render_edit:       () => { /* start polling render status */ },
  delete_renders:    () => refetchRenders(),
  reprocess_clips:   () => refetchClips(),
  detect_faces:      () => { /* data arrives later; poll or ignore */ },
  recluster_faces:   () => { /* data arrives later; poll or ignore */ },
};
```

This keeps the UI in sync without waiting for Claude to tell you what changed.

### Auth

The chat endpoint requires JWT auth. Use the same token from `getAuthToken()` in `api/rpc.ts`:

```ts
headers: {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${getAuthToken()}`,
}
```

If the token is expired, call `refreshAccessToken()` before retrying.

---

## What Is NOT Available Yet (needs backend work)

These capabilities are referenced in the UI wireframes or the handoff doc but do **not** have backend endpoints or MCP tools yet:

| Capability | Status | What's needed |
|------------|--------|---------------|
| Update project name | No RPC method | Add `projects.update` RPC method |
| Update project description | No field in DB | Add `description` column to `projects` table + RPC |
| Update clip title/description | No RPC method | Add `clips.update` RPC method |
| Update shot title/description | No RPC method | Add `shots.update` RPC method |
| Upload file via chat | Chat can't trigger uploads | Would need a file-picker tool or separate upload flow |
| Clip processing progress (SSE) | Logs only, no SSE | Need an SSE endpoint for processing status |
| Gemini availability check | No endpoint | Add `system.status` RPC or similar |
| Edit timeline via chat (modify individual shots) | `edits.chat` exists via RPC, not via MCP | Add `edit_timeline` MCP tool or expose `edits.chat` |

For any of these, the approach is:
1. Add the RPC method in `backend/src/rpc/methods/`
2. (Optionally) add an MCP tool in `backend/src/mcp/server.ts` so the chat agent can also use it
3. Update `backend/API.md`

---

## Quick Start Checklist

1. Create `src/chat/types.ts` with message/event types
2. Create `src/chat/useChatStream.ts` hook
3. Create `src/chat/ChatPanel.tsx` component
4. Wire `onNavigate` from ChatPanel → your app's routing
5. Wire `tool_done` events → data refetch callbacks
6. Test with: "What clips do I have?" → should trigger `get_clips` and respond with clip list