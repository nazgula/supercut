import { useState, useEffect, useRef } from "react";
import { rpcCall } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";

interface ScriptPageProps {
  projectId: string;
}

export function ScriptPage({ projectId }: ScriptPageProps) {
  const [script, setScript] = useState("");
  const [savedScript, setSavedScript] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    cachedRpcCall<{ script: string }>("projects.getScript", { projectId })
      .then((data) => {
        if (cancelled) return;
        const text = data.script ?? "";
        setScript(text);
        setSavedScript(text);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const isDirty = script !== savedScript;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      await rpcCall("projects.updateScript", { projectId, script });
      setSavedScript(script);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const textExtensions = ["txt", "fountain", "fdx"];

    if (!ext || !textExtensions.includes(ext)) {
      setSaveStatus("error");
      return;
    }

    try {
      const text = await file.text();
      setScript(text);
      // Auto-save
      setSaving(true);
      await rpcCall("projects.updateScript", { projectId, script: text });
      setSavedScript(text);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-[14px] text-center py-12" style={{ color: "var(--color-text-muted)" }}>
        Loading script…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-medium" style={{ color: "var(--color-text)" }}>
            Script
          </h2>
          {saveStatus === "saved" && (
            <span className="text-[12px]" style={{ color: "var(--color-success)" }}>Saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-[12px]" style={{ color: "var(--color-error)" }}>Failed to save</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Upload script file */}
          <label
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer border transition-colors"
            style={{
              borderColor: "var(--color-bone-50)",
              color: "var(--color-navy-700)",
              background: "white",
            }}
          >
            Upload file
            <input
              type="file"
              accept=".txt,.fountain,.fdx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors"
            style={{
              background: isDirty && !saving ? "var(--color-accent)" : "var(--color-bone-50)",
              color: isDirty && !saving ? "white" : "var(--color-text-muted)",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Script editor */}
      {!script && !isDirty ? (
        <div
          className="flex-1 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl"
          style={{ borderColor: "var(--color-bone-50)" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFileUpload(file);
          }}
        >
          <div className="text-[20px] mb-3" style={{ color: "var(--color-text-muted)" }}>📄</div>
          <div className="text-[14px] mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
            No script yet
          </div>
          <div className="text-[12px] mb-4" style={{ color: "var(--color-text-muted)" }}>
            Upload a script file (.txt, .fountain, .fdx) or paste text below
          </div>
          <button
            onClick={() => {
              setScript(" ");
              setTimeout(() => {
                textareaRef.current?.focus();
                textareaRef.current?.setSelectionRange(0, 0);
                setScript("");
              }, 0);
            }}
            className="px-4 py-2 rounded-lg text-[12px] font-medium cursor-pointer border"
            style={{ borderColor: "var(--color-bone-50)", color: "var(--color-navy-700)" }}
          >
            Start writing
          </button>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
              e.preventDefault();
              if (isDirty) handleSave();
            }
          }}
          className="flex-1 w-full p-4 rounded-xl border resize-none outline-none"
          style={{
            borderColor: "var(--color-bone-50)",
            background: "white",
            color: "var(--color-text)",
            fontSize: "14px",
            lineHeight: "1.8",
            fontFamily: "var(--font-mono)",
          }}
          placeholder="Paste or write your script here…"
        />
      )}
    </div>
  );
}
