import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const students = sqliteTable("students", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  grade: integer("grade").notNull(),
  classroom: text("classroom").notNull().default(""),
  accessCode: text("access_code"),
  firebaseUid: text("firebase_uid"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("students_access_code_idx").on(table.accessCode), uniqueIndex("students_firebase_uid_idx").on(table.firebaseUid)]);

export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  totalScore: integer("total_score").notNull(),
  maxScore: integer("max_score").notNull().default(100),
  domains: text("domains").notNull(),
  answers: text("answers").notNull(),
  completedAt: text("completed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  grade: integer("grade"),
  submissionMethod: text("submission_method"),
  keyVersion: text("key_version"),
  feedback: text("feedback"),
}, (table) => [index("assessments_student_completed_idx").on(table.studentId, table.completedAt)]);

export const diagnosisKeys = sqliteTable("diagnosis_keys", {
  grade: integer("grade").primaryKey(),
  answers: text("answers").notNull(),
  version: text("version").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const learningProgress = sqliteTable("learning_progress", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  attempts: integer("attempts").notNull().default(0),
  latestAnswer: text("latest_answer").notNull().default(""),
  correct: integer("correct", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  teacherNote: text("teacher_note").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
}, table => [uniqueIndex("learning_assessment_question_idx").on(table.assessmentId, table.questionId)]);

export const adminAttempts = sqliteTable("admin_attempts", {
  bucket: text("bucket").primaryKey(),
  attempts: integer("attempts").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const learningAttempts = sqliteTable("learning_attempts", {
  id: text("id").primaryKey(),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  answer: text("answer").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  attemptedAt: text("attempted_at").notNull(),
  coaching: text("coaching"),
}, table => [index("learning_attempts_assessment_idx").on(table.assessmentId, table.attemptedAt)]);

export const schools = sqliteTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region").notNull().default(""),
  active: integer("active", {mode:"boolean"}).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [uniqueIndex("schools_name_region_idx").on(table.name,table.region),check("schools_active_check",sql`${table.active} IN (0,1)`)]);

export const studentSchools = sqliteTable("student_schools", {
  studentId: text("student_id").primaryKey().references(()=>students.id,{onDelete:"cascade"}),
  schoolId: text("school_id").notNull().references(()=>schools.id),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("student_schools_school_idx").on(table.schoolId)]);

export const evaluationForms = sqliteTable('evaluation_forms',{
  id:text('id').primaryKey(),title:text('title').notNull(),code:text('code').notNull(),grade:integer('grade').notNull(),status:text('status').notNull(),version:text('version').notNull(),definition:text('definition').notNull(),updatedAt:text('updated_at').notNull(),
},table=>[uniqueIndex('evaluation_grade_code_idx').on(table.grade,table.code),check('evaluation_forms_status_check',sql`${table.status} IN ('draft','active','archived')`)]);
export const evaluationRevisions = sqliteTable('evaluation_revisions',{
  version:text('version').primaryKey(),formId:text('form_id').notNull().references(()=>evaluationForms.id),title:text('title').notNull(),code:text('code').notNull(),grade:integer('grade').notNull(),definition:text('definition').notNull(),createdAt:text('created_at').notNull(),
},table=>[index('evaluation_revision_form_idx').on(table.formId)]);
