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
}, (table) => [index("assessments_student_completed_idx").on(table.studentId, table.completedAt)]);

export const diagnosisKeys = sqliteTable("diagnosis_keys", {
  grade: integer("grade").primaryKey(),
  answers: text("answers").notNull(),
  version: text("version").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
