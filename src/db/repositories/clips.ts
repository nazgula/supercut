import { v4 as uuidv4 } from "uuid";
import { getDb, persistDb } from "../db";

export interface Clip {
  id: string;
  projectId: string;
  title: string;
  description: string;
  filename: string;
  filepath: string | null;
  duration: number | null;
  status: "processing" | "ready" | "error";
  mediaType: "video" | "image" | "audio";
  source: "upload" | "generated";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToClip(row: Record<string, unknown>): Clip {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    description: row.description as string,
    filename: row.filename as string,
    filepath: (row.filepath as string | null) ?? null,
    duration: (row.duration as number | null) ?? null,
    status: row.status as Clip["status"],
    mediaType: row.media_type as Clip["mediaType"],
    source: row.source as Clip["source"],
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listClips(projectId: string): Promise<Clip[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM clips WHERE project_id = ? ORDER BY created_at ASC", [projectId]);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToClip(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function getClip(id: string): Promise<Clip | null> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM clips WHERE id = ?", [id]);
  if (!result.length || !result[0].values.length) return null;
  const { columns, values } = result[0];
  return rowToClip(Object.fromEntries(columns.map((c, i) => [c, values[0][i]])));
}

export async function insertClip(data: Pick<Clip, "projectId" | "title" | "filename" | "mediaType"> & Partial<Clip>): Promise<Clip> {
  const db = await getDb();
  const id = data.id ?? uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO clips (id, project_id, title, description, filename, filepath, duration, status, media_type, source, error_message, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, data.projectId, data.title, data.description ?? "", data.filename, data.filepath ?? null,
     data.duration ?? null, data.status ?? "processing", data.mediaType, data.source ?? "upload",
     data.errorMessage ?? null, now, now]
  );
  persistDb(db);
  const clip = await getClip(id);
  if (!clip) throw new Error(`insertClip: failed to read back inserted clip ${id}`);
  return clip;
}

export async function updateClip(id: string, fields: Partial<Omit<Clip, "id" | "projectId" | "createdAt">>): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (fields.title !== undefined)        { sets.push("title = ?");         values.push(fields.title); }
  if (fields.description !== undefined)  { sets.push("description = ?");   values.push(fields.description); }
  if (fields.filepath !== undefined)     { sets.push("filepath = ?");      values.push(fields.filepath); }
  if (fields.duration !== undefined)     { sets.push("duration = ?");      values.push(fields.duration); }
  if (fields.status !== undefined)       { sets.push("status = ?");        values.push(fields.status); }
  if (fields.errorMessage !== undefined) { sets.push("error_message = ?"); values.push(fields.errorMessage); }

  values.push(id);
  db.run(`UPDATE clips SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteClip(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM clips WHERE id = ?", [id]);
  persistDb(db);
}
