import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";

export function ChatGreeting() {
  const { createProject, setActiveProject, setPendingMessage } = useApp();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [creating, setCreating] = useState(false);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? `Good morning, ${firstName}` :
    hour < 18 ? `Good afternoon, ${firstName}` :
                `Good evening, ${firstName}`;

  async function handleStart() {
    const trimmed = text.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const project = await createProject(trimmed.slice(0, 40));
      setPendingMessage(trimmed);
      setActiveProject(project.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="flex-1 flex flex-col justify-center overflow-hidden"
      style={{ padding: "0 18%" }}
    >
      <h1
        className="font-semibold leading-tight"
        style={{ fontSize: "32px", color: "var(--color-text)", marginBottom: "6px" }}
      >
        {greeting}
      </h1>
      <p
        style={{ fontSize: "18px", color: "var(--color-text-secondary)", marginBottom: "28px" }}
      >
        What are we editing today?
      </p>

      <div
        className="rounded-[10px] overflow-hidden"
        style={{
          background: "var(--color-bone-25)",
          border: "1px solid var(--color-bone-50)",
          padding: "16px",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleStart();
            }
          }}
          placeholder="Describe your project — footage type, story, characters…"
          rows={3}
          disabled={creating}
          className="w-full resize-none outline-none"
          style={{
            fontSize: "16px",
            color: "var(--color-text)",
            background: "transparent",
            fontFamily: "var(--font-sans)",
          }}
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleStart}
            disabled={!text.trim() || creating}
            className="cursor-pointer font-medium rounded-lg transition-colors"
            style={{
              fontSize: "16px",
              padding: "10px 20px",
              background: text.trim() && !creating ? "var(--color-accent)" : "var(--color-bone-100)",
              color: text.trim() && !creating ? "white" : "var(--color-text-muted)",
            }}
          >
            {creating ? "Creating…" : "Start →"}
          </button>
        </div>
      </div>
    </div>
  );
}
