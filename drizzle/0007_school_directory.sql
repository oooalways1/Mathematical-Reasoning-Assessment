CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, region TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CONSTRAINT schools_active_check CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS schools_name_region_idx ON schools(name,region);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS student_schools (student_id TEXT PRIMARY KEY NOT NULL REFERENCES students(id) ON DELETE CASCADE, school_id TEXT NOT NULL REFERENCES schools(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS student_schools_school_idx ON student_schools(school_id);
