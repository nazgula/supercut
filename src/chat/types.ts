// ─── Chat message ─────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
}

// ─── Clarifying question from the agent ───────────────────────

export interface ChatQuestion {
  text: string;
  options: string[];
}

// ─── SSE event shapes emitted by POST /chat/stream ────────────

export type SSEEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; name: string }
  | { type: "tool_done"; name: string }
  | { type: "navigate"; view: string; id?: string; tab?: string }
  | { type: "question"; question: string; options: string[] }
  | { type: "error"; message: string }
  | { type: "done" };

// ─── UI context sent to backend on each turn ──────────────────

export interface ChatUIContext {
  activeTab: string;
  selectedCharacterId?: string | null;
  selectedEditId?: string | null;
  selectedEditTab?: string | null;
  expandedClipId?: string | null;
}

// ─── Project status derived from API data ─────────────────────

export type ProjectStatus = "idle" | "ingesting" | "rendering" | "error";

export interface ProjectSummary {
  clipCount: number;
  clipsByStatus: { ready: number; processing: number; error: number };
  characterCount: number;
  editCount: number;
  status: ProjectStatus;
}

// ─── Helper: parse first sentence as project name ─────────────

export function extractProjectName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "Untitled Project";

  // Split on sentence-ending punctuation or newline
  const firstSentence = trimmed.split(/[.!?\n]/)[0].trim();
  if (!firstSentence) return "Untitled Project";

  // Capitalize first letter, cap at 50 chars
  const name = firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1);
  return name.length > 50 ? name.slice(0, 47) + "…" : name;
}

// ─── Helper: parse SSE line ───────────────────────────────────

export function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;
  const raw = line.slice(6).trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SSEEvent;
  } catch {
    return null;
  }
}

// ─── Sliding window ──────────────────────────────────────────

const MAX_MESSAGES_TO_SEND = 20;

export function slidingWindow(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  // Filter out system messages — they're frontend-generated, not for the backend
  const conversational = messages.filter((m) => m.role !== "system");
  return conversational.slice(-MAX_MESSAGES_TO_SEND).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
