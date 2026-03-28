import { useState, useEffect } from "react";
import { rpcCall, RpcError } from "../../api/rpc";
import { cachedRpcCall } from "../../api/cachedRpc";
import { useApp } from "../../context/AppContext";

export interface Edit {
  id: string;
  title: string;
  prompt: string;
  renderPath: string | null;
  timeline: unknown[] | null;
  timelineModified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EditsPage({ projectId }: { projectId: string }) {
  const { navigate } = useApp();
  const [edits, setEdits] = useState<Edit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const data = await cachedRpcCall<{ edits: Edit[] }>("edits.list", { projectId });
      setEdits(data.edits);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const data = await rpcCall<{ edit: Edit }>("edits.create", { projectId, title, prompt: "" });
      setNewTitle("");
      setShowNewInput(false);
      await load();
      navigate({ type: "edit-detail", projectId, editId: data.edit.id, tab: "edl" });
    } catch (err) {
      if (err instanceof RpcError) console.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-[16px] font-medium" style={{ color: "var(--color-text)" }}>
          Edits
        </div>
        {!showNewInput && (
          <button
            onClick={() => setShowNewInput(true)}
            className="text-[11px] px-3 py-1.5 rounded-md cursor-pointer font-medium"
            style={{ background: "var(--color-accent)", color: "white" }}
          >
            + New Edit
          </button>
        )}
      </div>

      {/* New edit input */}
      {showNewInput && (
        <div
          className="flex gap-2 mb-4 p-3 rounded-lg border"
          style={{ background: "var(--color-bone-0)", borderColor: "var(--color-bone-50)" }}
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setShowNewInput(false); setNewTitle(""); }
            }}
            placeholder="Edit name…"
            className="flex-1 text-[12px] outline-none bg-transparent"
            style={{ color: "var(--color-text)" }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTitle.trim()}
            className="text-[11px] px-3 py-1 rounded-md cursor-pointer font-medium"
            style={{ background: "var(--color-accent)", color: "white" }}
          >
            {creating ? "…" : "Create"}
          </button>
          <button
            onClick={() => { setShowNewInput(false); setNewTitle(""); }}
            className="text-[11px] px-2 py-1 rounded-md cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          Loading…
        </div>
      ) : edits.length === 0 ? (
        <div className="text-[12px] text-center py-8" style={{ color: "var(--color-text-muted)" }}>
          No edits yet. Create your first edit above.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {edits.map((edit) => (
            <button
              key={edit.id}
              onClick={() =>
                navigate({ type: "edit-detail", projectId, editId: edit.id, tab: "edl" })
              }
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg border text-left cursor-pointer transition-colors"
              style={{
                background: "var(--color-bone-0)",
                borderColor: "var(--color-bone-50)",
              }}
            >
              <div className="flex-1 text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
                {edit.title}
              </div>
              <div className="text-[9px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                {edit.renderPath ? "1 render" : edit.timeline ? "EDL ready" : "No EDL"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
