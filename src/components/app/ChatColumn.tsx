import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { API_BASE, getAuthToken, refreshAccessToken } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";
import { ChatBubble } from "../ui/ChatBubble";
import type { Clip } from "../workspace/MaterialsPage";

// ─── Types ────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Question {
  text: string;
  options: string[];
}

interface LogLine {
  clipId: string;
  text: string;
  state: "processing" | "done" | "error";
}

// ─── ChatColumn ───────────────────────────────────────────────

export function ChatColumn() {
  const { page, activeProjectId, navigate, pendingMessage, setPendingMessage, refreshProjects } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [logVisible, setLogVisible] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevClipsRef = useRef<Clip[]>([]);
  const logCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSentRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const hasProject = activeProjectId != null;
  const hasMessages = messages.length > 0;

  // ─── Log rail: clip processing updates ─────────────────────

  useEffect(() => {
    if (!hasProject) return;
    const prev = prevClipsRef.current;
    const newLines: LogLine[] = [];

    for (const clip of clips) {
      const prevClip = prev.find((c) => c.id === clip.id);
      if (!prevClip && clip.status === "processing") {
        newLines.push({ clipId: clip.id, text: `⟳ ${clip.filename} — processing…`, state: "processing" });
      } else if (prevClip?.status === "processing" && clip.status === "ready") {
        newLines.push({ clipId: clip.id, text: `✓ ${clip.title || clip.filename}`, state: "done" });
      } else if (prevClip?.status === "processing" && clip.status === "error") {
        newLines.push({ clipId: clip.id, text: `✗ ${clip.filename} — ${clip.errorMessage ?? "error"}`, state: "error" });
      }
    }

    if (newLines.length > 0) {
      setLogLines((prev) => [...prev, ...newLines]);
      setLogVisible(true);
    }

    const anyProcessing = clips.some((c) => c.status === "processing");
    if (!anyProcessing && clips.length > 0 && prev.some((c) => c.status === "processing")) {
      setLogLines((prev) => [...prev, { clipId: "done", text: "✓ All files processed", state: "done" }]);
      if (logCollapseTimerRef.current) clearTimeout(logCollapseTimerRef.current);
      logCollapseTimerRef.current = setTimeout(() => setLogVisible(false), 4000);
    }

    prevClipsRef.current = clips;
  }, [clips, hasProject]);

  useEffect(() => {
    function onClipsUpdate(e: CustomEvent<Clip[]>) { setClips(e.detail); }
    window.addEventListener("supercut:clips-update", onClipsUpdate as EventListener);
    return () => window.removeEventListener("supercut:clips-update", onClipsUpdate as EventListener);
  }, []);

  // ─── Scroll to bottom ─────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Pending message (from landing page) ──────────────────

  useEffect(() => {
    if (!activeProjectId || !pendingMessage || pendingSentRef.current) return;
    pendingSentRef.current = true;
    const msg = pendingMessage;
    setPendingMessage(null);
    setTimeout(() => {
      pendingSentRef.current = false;
      sendMessage(msg);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, pendingMessage]);

  // ─── Build uiContext per backend contract ─────────────────

  const buildUiContext = useCallback(() => {
    const p = page;
    const ctx: Record<string, unknown> = {};

    switch (p.type) {
      case "materials":
      case "material-detail":
        ctx.activeTab = "clips";
        if (p.type === "material-detail") ctx.expandedClipId = p.clipId;
        break;
      case "characters":
      case "character-detail":
        ctx.activeTab = "characters";
        if (p.type === "character-detail") ctx.selectedCharacterId = p.groupId;
        break;
      case "edits":
      case "edit-detail":
        ctx.activeTab = "edits";
        if (p.type === "edit-detail") {
          ctx.selectedEditId = p.editId;
          ctx.selectedEditTab = p.tab === "renders" ? "renders" : "spec";
        }
        break;
      default:
        ctx.activeTab = "clips";
    }

    return ctx;
  }, [page]);

  // ─── Send message ─────────────────────────────────────────

  async function sendMessage(text: string) {
    if (!text.trim() || streaming || !activeProjectId) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setToolActivity(null);
    setQuestion(null);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      let token = getAuthToken();

      let res = await fetch(`${API_BASE}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          projectId: activeProjectId,
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          uiContext: buildUiContext(),
        }),
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
            body: JSON.stringify({
              projectId: activeProjectId,
              messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
              uiContext: buildUiContext(),
            }),
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
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as Record<string, unknown>;
            handleSSEEvent(event, assistantId);
          } catch { /* ignore malformed SSE */ }
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
      setStreaming(false);
      setToolActivity(null);
      abortRef.current = null;
    }
  }

  // ─── SSE event router ─────────────────────────────────────

  function handleSSEEvent(event: Record<string, unknown>, assistantId: string) {
    switch (event.type) {
      case "text":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + (event.text as string) }
              : m
          )
        );
        break;

      case "tool_start":
        setToolActivity(event.name as string);
        break;

      case "tool_done":
        setToolActivity(null);
        handleToolDone(event.name as string);
        break;

      case "navigate":
        handleNavigateEvent(event);
        break;

      case "question":
        setQuestion({
          text: event.question as string,
          options: event.options as string[],
        });
        break;

      case "error":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + `\n\n⚠ ${event.message as string}` }
              : m
          )
        );
        break;

      case "done":
        // Stream complete — finalization handled in finally block
        break;
    }
  }

  // ─── Write tool side effects ──────────────────────────────

  function handleToolDone(toolName: string) {
    if (!activeProjectId) return;

    const refreshClips = () => {
      cachedRpcCall("clips.list", { projectId: activeProjectId }).catch(() => {});
    };
    const refreshEdits = () => {
      cachedRpcCall("edits.list", { projectId: activeProjectId }).catch(() => {});
    };
    const refreshCharacters = () => {
      cachedRpcCall("faces.list", { projectId: activeProjectId }).catch(() => {});
    };

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
    // Always refresh projects in case name/metadata changed
    refreshProjects();
  }

  // ─── Navigation events ────────────────────────────────────

  function handleNavigateEvent(event: Record<string, unknown>) {
    const view = event.view as string;
    const id = event.id as string | undefined;
    const tab = event.tab as string | undefined;
    if (!activeProjectId) return;

    switch (view) {
      case "clips":
      case "materials":
        navigate({ type: "materials", projectId: activeProjectId });
        break;
      case "clip":
        if (id) navigate({ type: "material-detail", projectId: activeProjectId, clipId: id });
        break;
      case "characters":
        navigate({ type: "characters", projectId: activeProjectId });
        break;
      case "character":
        if (id) navigate({ type: "character-detail", projectId: activeProjectId, groupId: id });
        break;
      case "edits":
        navigate({ type: "edits", projectId: activeProjectId });
        break;
      case "edit":
        if (id)
          navigate({
            type: "edit-detail",
            projectId: activeProjectId,
            editId: id,
            tab: tab === "renders" ? "renders" : "edl",
          });
        break;
    }
  }

  // ─── Question answer ──────────────────────────────────────

  function answerQuestion(option: string) {
    setQuestion(null);
    sendMessage(option);
  }

  // ─── Cancel stream ────────────────────────────────────────

  function cancelStream() {
    abortRef.current?.abort();
  }

  // ─── Handlers ─────────────────────────────────────────────

  function handleSend() {
    sendMessage(input);
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Log rail */}
      {logVisible && logLines.length > 0 && (
        <div
          className="px-[10%] py-2.5 border-b flex-shrink-0 max-h-[140px] overflow-y-auto"
          style={{
            background: "var(--color-bone-25)",
            borderColor: "var(--color-bone-50)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {logLines.map((line, i) => (
            <div
              key={i}
              className="text-[12px] py-0.5 flex items-center gap-1.5"
              style={{
                color:
                  line.state === "done"
                    ? "var(--color-success)"
                    : line.state === "error"
                    ? "var(--color-error)"
                    : "var(--color-text-muted)",
              }}
            >
              {line.state === "processing" && (
                <span className="inline-block w-2 h-2 rounded-full border border-current border-t-transparent animate-spin flex-shrink-0" />
              )}
              {line.text}
            </div>
          ))}
          <button
            onClick={() => setLogVisible(false)}
            className="text-[11px] mt-1 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            Collapse
          </button>
        </div>
      )}

      {/* Tool activity indicator */}
      {toolActivity && (
        <div
          className="flex items-center gap-2 px-[10%] py-2 border-b flex-shrink-0"
          style={{
            borderColor: "var(--color-bone-50)",
            background: "var(--color-bone-25)",
          }}
        >
          <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: "var(--color-navy-700)" }} />
          <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
            {toolActivity.replace(/_/g, " ")}…
          </span>
        </div>
      )}

      {/* Messages or empty state */}
      {!hasProject || !hasMessages ? (
        <ChatLanding
          hasProject={hasProject}
          input={input}
          onInputChange={setInput}
          onSend={handleSend}
          streaming={streaming}
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-[10%] py-4 flex flex-col gap-3 justify-end">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role === "user" ? "user" : "ai"} label={msg.role === "user" ? "You" : "Editor"}>
                {msg.content || (msg.streaming ? "…" : "")}
              </ChatBubble>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Question buttons */}
          {question && (
            <div className="flex flex-wrap gap-2 px-[10%] py-3 border-t flex-shrink-0" style={{ borderColor: "var(--color-bone-50)" }}>
              <div className="w-full text-[12px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                {question.text}
              </div>
              {question.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => answerQuestion(opt)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors"
                  style={{
                    borderColor: "var(--color-bone-50)",
                    color: "var(--color-navy-700)",
                    background: "white",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          {!question && (
            <ChatInputBar
              input={input}
              onInputChange={setInput}
              onSend={handleSend}
              onCancel={cancelStream}
              streaming={streaming}
              disabled={!hasProject}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Landing state ────────────────────────────────────────────

function ChatLanding({
  hasProject,
  input,
  onInputChange,
  onSend,
  streaming,
}: {
  hasProject: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col justify-center px-[10%] py-6">
      <div className="mb-5">
        <h2 className="text-[18px] font-medium mb-2" style={{ color: "var(--color-text)" }}>
          {hasProject ? "What are we working on?" : "What are we editing today?"}
        </h2>
        <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {hasProject
            ? "Ask about your footage, characters, or how to structure this edit."
            : "Select a project from the sidebar, or start a new one. I'll help with everything from ingest to final cut."}
        </p>
      </div>
      {hasProject && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
            placeholder="Describe your edit…"
            disabled={streaming}
            className="flex-1 px-3 py-2.5 rounded-lg text-[14px] outline-none border"
            style={{
              borderColor: "var(--color-bone-50)",
              background: "white",
              color: "var(--color-text)",
            }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || streaming}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ background: "var(--color-accent)", color: "white" }}
          >
            ↑
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Input bar ────────────────────────────────────────────────

function ChatInputBar({
  input,
  onInputChange,
  onSend,
  onCancel,
  streaming,
  disabled,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  streaming: boolean;
  disabled: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-[10%] py-3 border-t flex-shrink-0"
      style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-0)" }}
    >
      <input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !streaming) onSend(); }}
        placeholder="Ask about your footage…"
        disabled={disabled || streaming}
        className="flex-1 px-3 py-2.5 rounded-lg text-[14px] outline-none border"
        style={{
          borderColor: "var(--color-bone-50)",
          background: "white",
          color: "var(--color-text)",
        }}
      />
      {streaming ? (
        <button
          onClick={onCancel}
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer text-[14px]"
          style={{ background: "var(--color-error)", color: "white" }}
          title="Stop"
        >
          ■
        </button>
      ) : (
        <button
          onClick={onSend}
          disabled={!input.trim() || disabled}
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          ↑
        </button>
      )}
    </div>
  );
}
