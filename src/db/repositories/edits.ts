import { v4 as uuidv4 } from "uuid";
import { getDb, persistDb } from "../db";

export interface Edit {
  id: string;
  projectId: string;
  title: string;
  prompt: string | null;
  timeline: unknown[] | null;
  audio: unknown | null;
  renderPath: string | null;
  timelineModified: boolean;
  script: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToEdit(row: Record<string, unknown>): Edit {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    prompt: (row.prompt as string | null) ?? null,
    timeline: row.timeline ? JSON.parse(row.timeline as string) : null,
    audio: row.audio ? JSON.parse(row.audio as string) : null,
    renderPath: (row.render_path as string | null) ?? null,
    timelineModified: row.timeline_modified === 1,
    script: (row.script as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listEdits(projectId: string): Promise<Edit[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM edits WHERE project_id = ? ORDER BY created_at DESC", [projectId]);
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToEdit(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function getEdit(id: string): Promise<Edit | null> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM edits WHERE id = ?", [id]);
  if (!result.length || !result[0].values.length) return null;
  const { columns, values } = result[0];
  return rowToEdit(Object.fromEntries(columns.map((c, i) => [c, values[0][i]])));
}

export async function insertEdit(data: Pick<Edit, "projectId" | "title"> & Partial<Edit>): Promise<Edit> {
  const db = await getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO edits (id, project_id, title, prompt, timeline, audio, render_path, timeline_modified, script, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,0,?,?,?)`,
    [id, data.projectId, data.title, data.prompt ?? null, null, null, null, data.script ?? null, now, now]
  );
  persistDb(db);
  const edit = await getEdit(id);
  if (!edit) throw new Error(`insertEdit: failed to read back inserted edit ${id}`);
  return edit;
}

export async function updateEdit(id: string, fields: Partial<Omit<Edit, "id" | "projectId" | "createdAt">>): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const values: unknown[] = [now];

  if (fields.title !== undefined)           { sets.push("title = ?");             values.push(fields.title); }
  if (fields.prompt !== undefined)          { sets.push("prompt = ?");            values.push(fields.prompt); }
  if (fields.timeline !== undefined)        { sets.push("timeline = ?");          values.push(fields.timeline ? JSON.stringify(fields.timeline) : null); }
  if (fields.audio !== undefined)           { sets.push("audio = ?");             values.push(fields.audio ? JSON.stringify(fields.audio) : null); }
  if (fields.renderPath !== undefined)      { sets.push("render_path = ?");       values.push(fields.renderPath); }
  if (fields.timelineModified !== undefined){ sets.push("timeline_modified = ?"); values.push(fields.timelineModified ? 1 : 0); }
  if (fields.script !== undefined)          { sets.push("script = ?");            values.push(fields.script); }

  values.push(id);
  db.run(`UPDATE edits SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteEdit(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM edits WHERE id = ?", [id]);
  persistDb(db);
}
