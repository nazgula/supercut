-- SuperCut local SQLite schema
-- Mirrors the backend PostgreSQL schema for offline/local storage
-- NOTE: When moving to Electron, replace sql.js with better-sqlite3

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  script      TEXT,
  post_processing INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clips (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  filename    TEXT NOT NULL DEFAULT '',
  filepath    TEXT,
  duration    REAL,
  status      TEXT NOT NULL DEFAULT 'processing', -- processing | ready | error
  media_type  TEXT NOT NULL DEFAULT 'video',       -- video | image | audio
  source      TEXT NOT NULL DEFAULT 'upload',      -- upload | generated
  error_message TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clips_project_id ON clips(project_id);

CREATE TABLE IF NOT EXISTS shots (
  id          TEXT PRIMARY KEY,
  clip_id     TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  start_time  REAL NOT NULL DEFAULT 0,
  end_time    REAL NOT NULL DEFAULT 0,
  transcript  TEXT, -- JSON
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shots_clip_id ON shots(clip_id);

CREATE TABLE IF NOT EXISTS edits (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title            TEXT NOT NULL DEFAULT '',
  prompt           TEXT,
  timeline         TEXT, -- JSON array
  audio            TEXT, -- JSON
  render_path      TEXT,
  timeline_modified INTEGER NOT NULL DEFAULT 0,
  script           TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edits_project_id ON edits(project_id);

CREATE TABLE IF NOT EXISTS renders (
  id           TEXT PRIMARY KEY,
  edit_id      TEXT NOT NULL REFERENCES edits(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'rendering', -- rendering | done | error
  video_url    TEXT,
  error_message TEXT,
  created_at   TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_renders_edit_id ON renders(edit_id);

CREATE TABLE IF NOT EXISTS characters (
  id                   TEXT PRIMARY KEY,
  clip_id              TEXT REFERENCES clips(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL DEFAULT '',
  nickname             TEXT,
  description          TEXT,
  appearance           TEXT,
  first_appearance_time REAL,
  frame_url            TEXT,
  sheet_url            TEXT,
  created_at           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_characters_clip_id ON characters(clip_id);

CREATE TABLE IF NOT EXISTS face_detections (
  id                 TEXT PRIMARY KEY,
  clip_id            TEXT NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
  project_id         TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  group_id           TEXT, -- character cluster id
  face_image_path    TEXT,
  frame_image_path   TEXT,
  embedding          TEXT, -- JSON array (512-d)
  bbox               TEXT, -- JSON [x1,y1,x2,y2]
  frame_time         REAL,
  quality_score      REAL,
  det_score          REAL,
  pose               TEXT, -- JSON {yaw, pitch, roll}
  frame_width        INTEGER,
  frame_height       INTEGER,
  created_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_face_detections_clip_id    ON face_detections(clip_id);
CREATE INDEX IF NOT EXISTS idx_face_detections_project_id ON face_detections(project_id);
CREATE INDEX IF NOT EXISTS idx_face_detections_group_id   ON face_detections(group_id);

CREATE TABLE IF NOT EXISTS skills (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  content    TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS edit_skills (
  edit_id  TEXT NOT NULL REFERENCES edits(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (edit_id, skill_id)
);
