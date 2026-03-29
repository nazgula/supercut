/**
 * useChatStream — React hook for the chat-driven editor.
 *
 * Manages per-project message history, SSE streaming to /chat/stream,
 * tool activity tracking, question events, navigation, and data refresh
 * on write-tool completion.
 *
 * Messages are stored in a Map<projectId, Message[]> so they survive
 * navigation within a session. They are NOT persisted to disk — closing
 * the app clears all conversations.
 *
 * Only the last 20 messages are sent to the backend (sliding window).
 * The backend re-reads full project state via MCP tools each turn.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE, getAuthToken, refreshAccessToken } from "../api/rpc";
import { cachedRpcCall } from "../api/cachedRpc";
import type { WorkspacePage } from "../context/AppContext";
import {
  type ChatMessage,
  type ChatQuestion,
  type ChatUIContext,
  type SSEEvent,
  parseSSELine,
  slidingWindow,
} from "./types";

// ─── Types ────────────────────────────────────────────────────

interface UseChatStreamOptions {
  activeProjectId: string | null;
  page: WorkspacePage;
  navigate: (page: WorkspacePage) => void;
  refreshProjects: () => Promise<void>;
}

export interface UseChatStreamReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  toolActivity: string | null;
  question: ChatQuestion | null;
  send: (text: string) => void;
  answerQuestion: (option: string) => void;
  cancel: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────

export function useChatStream({
  activeProjectId,
  page,
  navigate,
  refreshProjects,
}: UseChatStreamOptions): UseChatStreamReturn {
  // Per-project message store (survives navigation within session)
  const allMessagesRef = useRef<Map<string, ChatMessage[]>>(new Map());

  // Current project's messages (reactive)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [question, setQuestion] = useState<ChatQuestion | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const projectIdRef = useRef<string | null>(null);

  // ─── Sync messages when project changes ───────────────────

  useEffect(() => {
    const prevId = projectIdRef.current;

    // Save current messages for previous project
    if (prevId && messages.length > 0) {
      allMessagesRef.current.set(prevId, messages);
    }

    // Load messages for new project
    projectIdRef.current = activeProjectId;
    if (activeProjectId) {
      const stored = allMessagesRef.current.get(activeProjectId) ?? [];
      setMessages(stored);
    } else {
      setMessages([]);
    }

    // Reset streaming state on project switch
    setToolActivity(null);
    setQuestion(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId]);

  // ─── Keep ref in sync with state ──────────────────────────

  useEffect(() => {
    if (activeProjectId && messages.length > 0) {
      allMessagesRef.current.set(activeProjectId, messages);
    }
  }, [messages, activeProjectId]);

  // ─── Build uiContext ──────────────────────────────────────

  const buildUiContext = useCallback((): ChatUIContext => {
    const ctx: ChatUIContext = { activeTab: "clips" };

    switch (page.type) {
      case "materials":
      case "material-detail":
        ctx.activeTab = "clips";
        if (page.type === "material-detail") ctx.expandedClipId = page.clipId;
        break;
      case "script":
        ctx.activeTab = "script";
        break;
      case "characters":
      case "character-detail":
        ctx.activeTab = "characters";
        if (page.type === "character-detail") ctx.selectedCharacterId = page.groupId;
        break;
      case "edits":
      case "edit-detail":
        ctx.activeTab = "edits";
        if (page.type === "edit-detail") {
          ctx.selectedEditId = page.editId;
          ctx.selectedEditTab = page.tab === "renders" ? "renders" : "spec";
        }
        break;
    }

    return ctx;
  }, [page]);

  // ─── Send message ─────────────────────────────────────────

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !activeProjectId) return;

      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: "", streaming: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setToolActivity(null);
      setQuestion(null);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const currentMessages = [...(allMessagesRef.current.get(activeProjectId) ?? []), userMsg];

        let token = getAuthToken();
        const body = JSON.stringify({
          projectId: activeProjectId,
          messages: slidingWindow(currentMessages),
          uiContext: buildUiContext(),
        });

        let res = await fetch(`${API_BASE}/chat/stream`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body,
          signal: abort.signal,
        });

        // Retry on 401
        if (res.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            token = getAuthToken();
            res = await fetch(`${API_BASE}/chat/stream`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body,
              signal: abort.signal,
            });
          }
        }

        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const event = parseSSELine(line);
            if (event) handleEvent(event, assistantId, activeProjectId);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "Sorry, something went wrong. Please try again.", streaming: false }
              : m
          )
        );
      } finally {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
        );
        setIsStreaming(false);
        setToolActivity(null);
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeProjectId, isStreaming, buildUiContext]
  );

  // ─── SSE event handler ────────────────────────────────────

  function handleEvent(event: SSEEvent, assistantId: string, projectId: string) {
    switch (event.type) {
      case "text":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + event.text } : m
          )
        );
        break;

      case "tool_start":
        setToolActivity(event.name);
        break;

      case "tool_done":
        setToolActivity(null);
        handleToolDone(event.name, projectId);
        break;

      case "navigate":
        handleNavigate(event, projectId);
        break;

      case "question":
        setQuestion({ text: event.question, options: event.options });
        break;

      case "error":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + `\n\n⚠ ${event.message}` } : m
          )
        );
        break;

      case "done":
        break;
    }
  }

  // ─── Write tool side effects ──────────────────────────────

  function handleToolDone(toolName: string, projectId: string) {
    const refreshClips = () => cachedRpcCall("clips.list", { projectId }).catch(() => {});
    const refreshEdits = () => cachedRpcCall("edits.list", { projectId }).catch(() => {});
    const refreshCharacters = () => cachedRpcCall("faces.list", { projectId }).catch(() => {});

    const actions: Record<string, () => void> = {
      create_edit: refreshEdits,
      delete_edit: refreshEdits,
      delete_clip: refreshClips,
      delete_character: refreshCharacters,
      rename_character: refreshCharacters,
      render_edit: refreshEdits,
      delete_renders: refreshEdits,
      reprocess_clips: refreshClips,
      detect_faces: refreshCharacters,
      recluster_faces: refreshCharacters,
    };

    actions[toolName]?.();
    refreshProjects();
  }

  // ─── Navigation handler ───────────────────────────────────

  function handleNavigate(event: SSEEvent & { type: "navigate" }, projectId: string) {
    const { view, id, tab } = event;

    switch (view) {
      case "clips":
      case "materials":
        navigate({ type: "materials", projectId });
        break;
      case "clip":
        if (id) navigate({ type: "material-detail", projectId, clipId: id });
        break;
      case "characters":
        navigate({ type: "characters", projectId });
        break;
      case "character":
        if (id) navigate({ type: "character-detail", projectId, groupId: id });
        break;
      case "edits":
        navigate({ type: "edits", projectId });
        break;
      case "edit":
        if (id) navigate({ type: "edit-detail", projectId, editId: id, tab: tab === "renders" ? "renders" : "edl" });
        break;
    }
  }

  // ─── Answer question ──────────────────────────────────────

  const answerQuestion = useCallback(
    (option: string) => {
      setQuestion(null);
      send(option);
    },
    [send]
  );

  // ─── Cancel stream ────────────────────────────────────────

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, toolActivity, question, send, answerQuestion, cancel };
}
