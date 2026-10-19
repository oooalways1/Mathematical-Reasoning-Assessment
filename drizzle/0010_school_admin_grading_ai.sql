CREATE TABLE IF NOT EXISTS administrators(id TEXT PRIMARY KEY,firebase_uid TEXT NOT NULL UNIQUE,login_id TEXT NOT NULL UNIQUE,role TEXT NOT NULL CHECK(role IN ('super','school')),active INTEGER NOT NULL DEFAULT 1,session_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS administrator_schools(admin_id TEXT NOT NULL REFERENCES administrators(id),school_id TEXT NOT NULL REFERENCES schools(id),PRIMARY KEY(admin_id,school_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS app_settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_log(id TEXT PRIMARY KEY,actor_id TEXT NOT NULL,action TEXT NOT NULL,school_id TEXT,target_id TEXT NOT NULL,details TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_school_date ON audit_log(school_id,created_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS assessment_schools(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),school_id TEXT REFERENCES schools(id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS grading_reviews(assessment_id TEXT NOT NULL REFERENCES assessments(id),question_id TEXT NOT NULL,raw_answer TEXT NOT NULL,normalized_answer TEXT,status TEXT NOT NULL CHECK(status IN ('correct','incorrect','review')),reason TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(assessment_id,question_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS grading_history(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL,question_id TEXT NOT NULL,actor_id TEXT NOT NULL,before_value TEXT NOT NULL,after_value TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS grading_state(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_feedback(assessment_id TEXT PRIMARY KEY REFERENCES assessments(id),status TEXT NOT NULL,content TEXT,model TEXT NOT NULL,teacher_content TEXT,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ai_requests(id TEXT PRIMARY KEY,assessment_id TEXT NOT NULL,student_id TEXT NOT NULL,day TEXT NOT NULL,status TEXT NOT NULL,reserved_neurons INTEGER NOT NULL,created_at TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ai_request_day ON ai_requests(day,student_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS learning_overrides(assessment_id TEXT NOT NULL,question_id TEXT NOT NULL,practice TEXT,roadmap_note TEXT NOT NULL DEFAULT '',revision INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(assessment_id,question_id));
--> statement-breakpoint
ALTER TABLE evaluation_forms ADD COLUMN school_id TEXT REFERENCES schools(id);
--> statement-breakpoint
DROP INDEX IF EXISTS evaluation_grade_code_idx;
--> statement-breakpoint
CREATE UNIQUE INDEX evaluation_school_grade_code_idx ON evaluation_forms(COALESCE(school_id,''),grade,code);
--> statement-breakpoint
INSERT OR IGNORE INTO assessment_schools(assessment_id,school_id) SELECT a.id,ss.school_id FROM assessments a LEFT JOIN student_schools ss ON ss.student_id=a.student_id;
--> statement-breakpoint
INSERT OR IGNORE INTO app_settings(key,value) VALUES('assessment_school_snapshot_done','1');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_attempt_details(attempt_id TEXT PRIMARY KEY REFERENCES learning_attempts(id),practice_json TEXT NOT NULL);

--> statement-breakpoint
INSERT OR IGNORE INTO evaluation_forms(id,title,code,grade,status,version,definition,updated_at,school_id)
SELECT 'school-'||s.id||'-'||f.id,f.title,f.code,f.grade,f.status,'school-'||s.id||'-'||f.version,f.definition,f.updated_at,s.id
FROM evaluation_forms f CROSS JOIN schools s WHERE f.school_id IS NULL AND f.status='active' AND s.active=1
AND NOT EXISTS(SELECT 1 FROM evaluation_trash t WHERE t.form_id=f.id)
AND NOT EXISTS(SELECT 1 FROM app_settings WHERE key='school_evaluation_copy_done');
--> statement-breakpoint
INSERT OR IGNORE INTO evaluation_revisions(version,form_id,title,code,grade,definition,created_at)
SELECT version,id,title,code,grade,definition,updated_at FROM evaluation_forms WHERE school_id IS NOT NULL
AND NOT EXISTS(SELECT 1 FROM app_settings WHERE key='school_evaluation_copy_done');
--> statement-breakpoint
INSERT OR IGNORE INTO app_settings(key,value) VALUES('school_evaluation_copy_done','1');
