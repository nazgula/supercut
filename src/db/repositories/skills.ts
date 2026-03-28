import { getDb, persistDb } from "../db";

export interface Skill {
  id: string;
  title: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToSkill(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    title: row.title as string,
    content: (row.content as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listSkills(): Promise<Skill[]> {
  const db = await getDb();
  const result = db.exec("SELECT * FROM skills ORDER BY created_at DESC");
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToSkill(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function insertSkill(title: string, content?: string): Promise<Skill> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.run("INSERT INTO skills (id, title, content, created_at, updated_at) VALUES (?,?,?,?,?)",
    [id, title, content ?? null, now, now]);
  persistDb(db);
  return { id, title, content: content ?? null, createdAt: now, updatedAt: now };
}

export async function updateSkill(id: string, fields: Partial<Pick<Skill, "title" | "content">>): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const values: (string | number | null | Uint8Array)[] = [now];
  if (fields.title !== undefined)   { sets.push("title = ?");   values.push(fields.title); }
  if (fields.content !== undefined) { sets.push("content = ?"); values.push(fields.content); }
  values.push(id);
  db.run(`UPDATE skills SET ${sets.join(", ")} WHERE id = ?`, values);
  persistDb(db);
}

export async function deleteSkill(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM skills WHERE id = ?", [id]);
  persistDb(db);
}

// ─── edit_skills join table ───────────────────────────────────

export async function getEditSkills(editId: string): Promise<Skill[]> {
  const db = await getDb();
  const result = db.exec(
    "SELECT s.* FROM skills s JOIN edit_skills es ON s.id = es.skill_id WHERE es.edit_id = ?",
    [editId]
  );
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((row) => rowToSkill(Object.fromEntries(columns.map((c, i) => [c, row[i]]))));
}

export async function setEditSkills(editId: string, skillIds: string[]): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM edit_skills WHERE edit_id = ?", [editId]);
  for (const skillId of skillIds) {
    db.run("INSERT INTO edit_skills (edit_id, skill_id) VALUES (?,?)", [editId, skillId]);
  }
  persistDb(db);
}
