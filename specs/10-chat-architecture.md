---
spec: 10
title: Chat Architecture Rework
status: executing
---

## Summary

Restructure chat into a clean hook + thin renderer pattern. Fix message persistence across navigation, add project status card on entry, improve new project naming, add sliding window for API calls.

## Changes

### 1. Extract `useChatStream` hook
- `src/chat/types.ts` — Message, Question, SSEEvent, UIContext types
- `src/chat/useChatStream.ts` — all chat logic: SSE streaming, event routing, tool effects, message storage
- Messages stored in `Map<string, Message[]>` keyed by projectId
- Sliding window: send only last 20 messages to backend API, show all in UI
- Returns: `{ messages, streaming, toolActivity, question, send, answerQuestion, cancel }`

### 2. Unified ChatColumn (always mounted)
- Absorbs ChatGreeting — no more component swap
- Landing state: greeting centered vertically (as ChatGreeting was)
- Project state with no messages: "What are we working on?" prompt
- Project state with messages: scrollable messages + input at bottom
- ProjectStatusCard shown at top of messages area on project entry

### 3. ProjectStatusCard
- Data-driven card (not AI) shown when entering a project
- Fetches: clips (count by status), characters (count), edits (count)
- Derives status: idle / ingesting / rendering
- Uses cachedRpcCall — works offline from cache
- Dismissible or collapses after first message

### 4. New project naming
- Create with temp name "Untitled Project"
- Send user's intent as first chat message
- Frontend extracts a smarter name: first sentence, cleaned, capped at 50 chars
- Backend gap: `projects.update` needed for agentic naming (flagged in OPEN_ISSUES)

### 5. Sliding window
- UI shows full message history (scrollback)
- API receives only last 20 messages
- Backend re-reads project state via MCP tools — doesn't need old messages

## Files

| File | Action |
|---|---|
| `src/chat/types.ts` | New — shared types |
| `src/chat/useChatStream.ts` | New — hook extracted from ChatColumn |
| `src/chat/useChatStream.test.ts` | New — tests |
| `src/components/app/ChatColumn.tsx` | Rewrite — thin renderer |
| `src/components/app/ChatGreeting.tsx` | Delete — absorbed into ChatColumn |
| `src/components/app/ProjectStatusCard.tsx` | New — data summary card |
| `src/pages/AppShell.tsx` | Update — always render ChatColumn |
| `src/context/AppContext.tsx` | Update — remove pendingMessage, add pendingIntent |
| `CLAUDE.md` | Update — chat architecture section |
| `OPEN_ISSUES.md` | Update — consolidate backend requests |
