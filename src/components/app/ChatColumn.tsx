import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import { API_BASE, getAuthToken } from "../../api/rpc";
import { ChatBubble } from "../ui/ChatBubble";
import type { Clip } from "../workspace/MaterialsPage";

// ─── Types ────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// Log line derived from clip polling state
interface LogLine {
  clipId: string;
  text: string;
  state: "processing" | "done" | "error";
}

// ─── ChatColumn ───────────────────────────────────────────────

export function ChatColumn() {
  const { page, activeProjectId, navigate } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [logVisible, setLogVisible] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevClipsRef = useRef<Clip[]>([]);
  const logCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasProject = activeProjectId != null;
  const hasMessages = messages.length > 0;

  // Update log lines when clips change (polling-derived)
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
        newLines.push({
          clipId: clip.id,
          text: `✗ ${clip.filename} — ${clip.errorMessage ?? "error"}`,
          state: "error",
        });
      }
    }

    if (newLines.length > 0) {
      setLogLines((prev) => [...prev, ...newLines]);
      setLogVisible(true);
    }

    const anyProcessing = clips.some((c) => c.status === "processing");
    if (!anyProcessing && clips.length > 0 && prev.some((c) => c.status === "processing")) {
      setLogLines((prev) => [...prev, { clipId: "done", text: "✓ All files processed", state: "done" }]);
      // Auto-collapse after 4s
      if (logCollapseTimerRef.current) clearTimeout(logCollapseTimerRef.current);
      logCollapseTimerRef.current = setTimeout(() => setLogVisible(false), 4000);
    }

    prevClipsRef.current = clips;
  }, [clips, hasProject]);

  // Expose clip setter for MaterialsPage polling (via context or direct prop — here via window event)
  useEffect(() => {
    function onClipsUpdate(e: CustomEvent<Clip[]>) {
      setClips(e.detail);
    }
    window.addEventListener("supercut:clips-update", onClipsUpdate as EventListener);
    return () => window.removeEventListener("supercut:clips-update", onClipsUpdate as EventListener);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildUiContext = useCallback(() => {
    const p = page;
    return {
      page: p.type,
      ...(p.type !== "landing" ? { projectId: p.projectId } : {}),
      ...("clipId" in p ? { clipId: p.clipId } : {}),
      ...("groupId" in p ? { groupId: p.groupId } : {}),
      ...("editId" in p ? { editId: p.editId, editTab: p.tab } : {}),
    };
  }, [page]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming || !activeProjectId) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE}/chat/stream`, {
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
      });

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
            if (event.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (event.text as string) }
                    : m
                )
              );
            } else if (event.type === "navigate") {
              handleNavigateEvent(event);
            }
          } catch { /* ignore malformed SSE */ }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Sorry, something went wrong. Please try again.", streaming: false }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      setStreaming(false);
    }
  }

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
      case "characters":
        navigate({ type: "characters", projectId: activeProjectId });
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
            tab: (tab === "renders" ? "renders" : "edl"),
          });
        break;
      case "character":
        if (id) navigate({ type: "character-detail", projectId: activeProjectId, groupId: id });
        break;
      case "clip":
        if (id) navigate({ type: "material-detail", projectId: activeProjectId, clipId: id });
        break;
    }
  }

  return (
    <div
      className="flex flex-col flex-shrink-0 border-l"
      style={{
        width: "40%",
        background: "var(--color-bone-0)",
        borderColor: "var(--color-bone-50)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: "var(--color-bone-50)" }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
          style={{ background: "var(--color-accent)", color: "white" }}
        >
          E
        </div>
        <span className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
          Editor Assistant
        </span>
      </div>

      {/* Log rail */}
      {logVisible && logLines.length > 0 && (
        <div
          className="px-4 py-2.5 border-b flex-shrink-0 max-h-[140px] overflow-y-auto"
          style={{
            background: "var(--color-bone-25)",
            borderColor: "var(--color-bone-50)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {logLines.map((line, i) => (
            <div
              key={i}
              className="text-[10px] py-0.5 flex items-center gap-1.5"
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
            className="text-[9px] mt-1 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            Collapse
          </button>
        </div>
      )}

      {/* Messages or landing */}
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
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 justify-end">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role === "user" ? "user" : "ai"} label={msg.role === "user" ? "You" : "Editor Assistant"}>
                {msg.content || (msg.streaming ? "…" : "")}
              </ChatBubble>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <ChatInputBar
            input={input}
            onInputChange={setInput}
            onSend={handleSend}
            streaming={streaming}
            disabled={!hasProject}
          />
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
    <div className="flex-1 flex flex-col justify-center p-6">
      <div className="mb-5">
        <h2 className="text-[18px] font-medium mb-2" style={{ color: "var(--color-text)" }}>
          {hasProject ? "What are we working on?" : "What are we editing today?"}
        </h2>
        <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
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
            className="flex-1 px-3 py-2.5 rounded-lg text-[12px] outline-none border"
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
  streaming,
  disabled,
}: {
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  streaming: boolean;
  disabled: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
      style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-0)" }}
    >
      <input
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
        placeholder="Ask about your footage…"
        disabled={disabled || streaming}
        className="flex-1 px-3 py-2.5 rounded-lg text-[12px] outline-none border"
        style={{
          borderColor: "var(--color-bone-50)",
          background: "white",
          color: "var(--color-text)",
        }}
      />
      <button
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer text-[13px]"
        style={{ background: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-bone-50)" }}
        title="Voice input (coming soon)"
        disabled
      >
        🎤
      </button>
      <button
        onClick={onSend}
        disabled={!input.trim() || streaming || disabled}
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
        style={{ background: "var(--color-accent)", color: "white" }}
      >
        ↑
      </button>
    </div>
  );
}
