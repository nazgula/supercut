import { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useChatStream } from "../../chat/useChatStream";
import { extractProjectName } from "../../chat/types";
import { ChatBubble } from "../ui/ChatBubble";
import { ProjectStatusCard } from "./ProjectStatusCard";
import type { Clip } from "../workspace/MaterialsPage";

// ─── Log line (clip processing updates from polling) ──────────

interface LogLine {
  clipId: string;
  text: string;
  state: "processing" | "done" | "error";
}

// ─── ChatColumn ───────────────────────────────────────────────
//
// Always mounted. Renders three states:
//   1. Landing (no project) — greeting + textarea (centered)
//   2. Project, no messages — "What are we working on?" prompt (centered)
//   3. Project with messages — scrollable messages + input at bottom

export function ChatColumn() {
  const { page, activeProjectId, navigate, refreshProjects, createProject, setActiveProject, setPendingMessage } = useApp();
  const { user } = useAuth();

  const chat = useChatStream({ activeProjectId, page, navigate, refreshProjects });

  const isLanding = page.type === "landing";
  const hasProject = activeProjectId != null;
  const hasMessages = chat.messages.length > 0;

  // ─── Log rail state (clip processing) ─────────────────────

  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [logVisible, setLogVisible] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const prevClipsRef = useRef<Clip[]>([]);
  const logCollapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // ─── Scroll to bottom on new messages ─────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  // ─── Pending message (from landing textarea) ──────────────

  const pendingSentRef = useRef(false);
  const { pendingMessage } = useApp();

  useEffect(() => {
    if (!activeProjectId || !pendingMessage || pendingSentRef.current) return;
    pendingSentRef.current = true;
    const msg = pendingMessage;
    setPendingMessage(null);
    setTimeout(() => {
      pendingSentRef.current = false;
      chat.send(msg);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, pendingMessage]);

  // ─── Landing: new project from textarea ───────────────────

  const [landingText, setLandingText] = useState("");
  const [creating, setCreating] = useState(false);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` :
    hour < 18 ? `Good afternoon, ${firstName}` :
                `Good evening, ${firstName}`;

  async function handleLandingSubmit() {
    const trimmed = landingText.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const projectName = extractProjectName(trimmed);
      const project = await createProject(projectName);
      setPendingMessage(trimmed);
      setActiveProject(project.id);
      setLandingText("");
    } finally {
      setCreating(false);
    }
  }

  // ─── Chat input state ────────────────────────────────────

  const [chatInput, setChatInput] = useState("");

  function handleChatSend() {
    if (!chatInput.trim()) return;
    chat.send(chatInput);
    setChatInput("");
  }

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ─── Landing state: greeting + textarea (centered) ─── */}
      {isLanding && (
        <div className="flex-1 flex flex-col justify-center overflow-hidden" style={{ padding: "0 18%" }}>
          <h1
            className="font-semibold leading-tight"
            style={{ fontSize: "32px", color: "var(--color-text)", marginBottom: "6px" }}
          >
            {greeting}
          </h1>
          <p style={{ fontSize: "18px", color: "var(--color-text-secondary)", marginBottom: "28px" }}>
            What are we editing today?
          </p>
          <div
            className="rounded-[10px] overflow-hidden"
            style={{ background: "var(--color-bone-25)", border: "1px solid var(--color-bone-50)", padding: "16px" }}
          >
            <textarea
              value={landingText}
              onChange={(e) => setLandingText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleLandingSubmit();
                }
              }}
              placeholder="Describe your project — footage type, story, characters…"
              rows={3}
              disabled={creating}
              className="w-full resize-none outline-none"
              style={{ fontSize: "16px", color: "var(--color-text)", background: "transparent", fontFamily: "var(--font-sans)" }}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleLandingSubmit}
                disabled={!landingText.trim() || creating}
                className="cursor-pointer font-medium rounded-lg transition-colors"
                style={{
                  fontSize: "16px",
                  padding: "10px 20px",
                  background: landingText.trim() && !creating ? "var(--color-accent)" : "var(--color-bone-100)",
                  color: landingText.trim() && !creating ? "white" : "var(--color-text-muted)",
                }}
              >
                {creating ? "Creating…" : "Start →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Project state: chat flow (status card + messages + input) ─── */}
      {!isLanding && hasProject && (
        <>
          {/* Log rail */}
          {logVisible && logLines.length > 0 && (
            <div
              className="px-[10%] py-2.5 border-b flex-shrink-0 max-h-[140px] overflow-y-auto"
              style={{ background: "var(--color-bone-25)", borderColor: "var(--color-bone-50)", fontFamily: "var(--font-mono)" }}
            >
              {logLines.map((line, i) => (
                <div
                  key={i}
                  className="text-[12px] py-0.5 flex items-center gap-1.5"
                  style={{
                    color: line.state === "done" ? "var(--color-success)" : line.state === "error" ? "var(--color-error)" : "var(--color-text-muted)",
                  }}
                >
                  {line.state === "processing" && (
                    <span className="inline-block w-2 h-2 rounded-full border border-current border-t-transparent animate-spin flex-shrink-0" />
                  )}
                  {line.text}
                </div>
              ))}
              <button onClick={() => setLogVisible(false)} className="text-[11px] mt-1 cursor-pointer" style={{ color: "var(--color-text-muted)" }}>
                Collapse
              </button>
            </div>
          )}

          {/* Tool activity */}
          {chat.toolActivity && (
            <div
              className="flex items-center gap-2 px-[10%] py-2 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-25)" }}
            >
              <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" style={{ color: "var(--color-navy-700)" }} />
              <span className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>
                {chat.toolActivity.replace(/_/g, " ")}…
              </span>
            </div>
          )}

          {/* Messages — status card is the first bubble in the flow */}
          <div className="flex-1 overflow-y-auto px-[10%] py-4 flex flex-col gap-3 justify-end">
            {/* Status card — styled like an AI bubble */}
            <div className="max-w-[85%] mr-auto bg-surface-2 border border-border rounded-md rounded-bl-[4px] px-4 py-3">
              <div className="text-[12px] font-mono uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                Editor
              </div>
              <ProjectStatusCard projectId={activeProjectId!} />
            </div>

            {/* Conversation messages */}
            {chat.messages.map((msg) => (
              <ChatBubble key={msg.id} role={msg.role === "user" ? "user" : "ai"} label={msg.role === "user" ? "You" : "Editor"}>
                {msg.content || (msg.streaming ? "…" : "")}
              </ChatBubble>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Question buttons */}
          {chat.question && (
            <div className="flex flex-wrap gap-2 px-[10%] py-3 border-t flex-shrink-0" style={{ borderColor: "var(--color-bone-50)" }}>
              <div className="w-full text-[12px] mb-1" style={{ color: "var(--color-text-secondary)" }}>
                {chat.question.text}
              </div>
              {chat.question.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => chat.answerQuestion(opt)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors"
                  style={{ borderColor: "var(--color-bone-50)", color: "var(--color-navy-700)", background: "white" }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          {!chat.question && (
            <div
              className="flex items-center gap-2 px-[10%] py-3 border-t flex-shrink-0"
              style={{ borderColor: "var(--color-bone-50)", background: "var(--color-bone-0)" }}
            >
              <input
                autoFocus={!hasMessages}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !chat.isStreaming) handleChatSend(); }}
                placeholder="Ask about your footage…"
                disabled={chat.isStreaming}
                className="flex-1 px-3 py-2.5 rounded-lg text-[14px] outline-none border"
                style={{ borderColor: "var(--color-bone-50)", background: "white", color: "var(--color-text)" }}
              />
              {chat.isStreaming ? (
                <button
                  onClick={chat.cancel}
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer text-[14px]"
                  style={{ background: "var(--color-error)", color: "white" }}
                  title="Stop"
                >
                  ■
                </button>
              ) : (
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim()}
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
                  style={{ background: "var(--color-accent)", color: "white" }}
                >
                  ↑
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
