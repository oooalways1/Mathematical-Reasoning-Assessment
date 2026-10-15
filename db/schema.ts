import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
}, table => [index("learning_attempts_assessment_idx").on(table.assessmentId, table.attemptedAt)]);
