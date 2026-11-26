export const teacherSchema=[
 `CREATE TABLE IF NOT EXISTS administrator_access(admin_id TEXT PRIMARY KEY REFERENCES administrators(id),mode TEXT NOT NULL CHECK(mode IN ('school','class')))`,
 `CREATE TABLE IF NOT EXISTS administrator_classes(admin_id TEXT NOT NULL REFERENCES administrators(id),school_id TEXT NOT NULL REFERENCES schools(id),grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 3),classroom TEXT NOT NULL,PRIMARY KEY(admin_id,school_id,grade,classroom))`,
 `CREATE TABLE IF NOT EXISTS teacher_applications(id TEXT PRIMARY KEY,admin_id TEXT NOT NULL UNIQUE REFERENCES administrators(id),name TEXT NOT NULL,school_id TEXT NOT NULL REFERENCES schools(id),requested_scope TEXT NOT NULL CHECK(requested_scope IN ('school','class')),grade INTEGER,classroom TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),reason TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,decision_marker TEXT,reviewed_by TEXT,created_at TEXT NOT NULL,reviewed_at TEXT)`,
 `CREATE INDEX IF NOT EXISTS teacher_application_status ON teacher_applications(status,created_at)`
];
