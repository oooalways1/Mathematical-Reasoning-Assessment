CREATE TABLE IF NOT EXISTS administrator_access(admin_id TEXT PRIMARY KEY REFERENCES administrators(id),mode TEXT NOT NULL CHECK(mode IN ('school','class')));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS administrator_classes(admin_id TEXT NOT NULL REFERENCES administrators(id),school_id TEXT NOT NULL REFERENCES schools(id),grade INTEGER NOT NULL CHECK(grade BETWEEN 1 AND 3),classroom TEXT NOT NULL,PRIMARY KEY(admin_id,school_id,grade,classroom));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS teacher_applications(id TEXT PRIMARY KEY,admin_id TEXT NOT NULL UNIQUE REFERENCES administrators(id),name TEXT NOT NULL,school_id TEXT NOT NULL REFERENCES schools(id),requested_scope TEXT NOT NULL CHECK(requested_scope IN ('school','class')),grade INTEGER,classroom TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),reason TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,decision_marker TEXT,reviewed_by TEXT,created_at TEXT NOT NULL,reviewed_at TEXT);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS teacher_application_status ON teacher_applications(status,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS assessment_files(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL REFERENCES assessments(id),student_id TEXT NOT NULL REFERENCES students(id),object_key TEXT NOT NULL UNIQUE,name TEXT NOT NULL,content_type TEXT NOT NULL,size INTEGER NOT NULL CHECK(size>0),status TEXT NOT NULL CHECK(status IN ('uploading','ready')),uploader_id TEXT NOT NULL,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assessment_files_assessment ON assessment_files(assessment_id,created_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS assessment_files_student ON assessment_files(student_id);
