import { getDb, persistDb } from "../db";

export interface Render {
  id: string;
  editId: string;
  status: "rendering" | "done" | "error";
  videoUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

function rowToRender(row: Record<string, unknown>): Render {
  return {
    id: row.id as string,
    editId: row.edit_id as string,
    status: row.status as Render["status"],
    videoUrl: (row.video_url as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export async function listRenders(editId: string): Promise<Render[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM renders WHERE edit_id = ? ORDER BY created_at DESC", [editId]);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToRender(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function insertRender(editId: string): Promise<Render> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO renders (id, edit_id, status, video_url, error_message, created_at, completed_at) VALUES (?,?,'rendering',NULL,NULL,?,NULL)",
    [id, editId, now]
  );
  persistDb(db);
  return { id, editId, status: "rendering", videoUrl: null, errorMessage: null, createdAt: now, completedAt: null };
}

export async function updateRender(id: string, fields: Partial<Pick<Render, "status" | "videoUrl" | "errorMessage" | "completedAt">>): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const values: (string | number | null | Uint8Array)[] = [];

  if (fields.status !== undefined)       { sets.push("status = ?");        values.push(fields.status); }
  if (fields.videoUrl !== undefined)     { sets.push("video_url = ?");     values.push(fields.videoUrl); }
  if (fields.errorMessage !== undefined) { sets.push("error_message = ?"); values.push(fields.errorMessage); }
  if (fields.completedAt !== undefined)  { sets.push("completed_at = ?");  values.push(fields.completedAt); }

  if (!sets.length) return;
  values.push(id);
  db.run(`UPDATE renders SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteRender(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM renders WHERE id = ?", [id]);
  persistDb(db);
}
