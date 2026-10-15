import { db } from '../_lib';
import type { ItemFeedback, LearningProgress, PracticeAttempt } from '@/lib/diagnosis-model';

export async function readLearning(studentId: string, teacher: boolean) {
  const database = db();
  const [records, progress, attempts] = await Promise.all([
    database.prepare(`SELECT a.id, a.student_id AS studentId, COALESCE(a.grade,s.grade) AS grade, a.grade IS NULL AS legacy,
      a.total_score AS totalScore, a.max_score AS maxScore, a.domains, a.answers, a.feedback,
      a.completed_at AS completedAt, a.submission_method AS submissionMethod, a.key_version AS keyVersion
      FROM assessments a JOIN students s ON s.id=a.student_id WHERE a.student_id=? ORDER BY a.completed_at DESC, a.id DESC`).bind(studentId).all<Record<string, unknown>>(),
    database.prepare(`SELECT p.assessment_id AS assessmentId, p.question_id AS questionId, p.attempts, p.latest_answer AS latestAnswer,
      p.correct, p.completed_at AS completedAt, p.teacher_note AS teacherNote, p.updated_at AS updatedAt
      FROM learning_progress p JOIN assessments a ON a.id=p.assessment_id WHERE a.student_id=?`).bind(studentId).all<LearningProgress & { assessmentId: string }>(),
    database.prepare(`SELECT p.id, p.assessment_id AS assessmentId, p.question_id AS questionId, p.answer, p.correct, p.attempted_at AS attemptedAt
      FROM learning_attempts p JOIN assessments a ON a.id=p.assessment_id WHERE a.student_id=? ORDER BY p.attempted_at DESC`).bind(studentId).all<PracticeAttempt & { assessmentId: string }>(),
  ]);
  return { results: records.results.map(row => {
    const items = progress.results.filter(item => item.assessmentId === row.id).map(item => ({ ...item, correct: Boolean(item.correct) }));
    const feedback = row.feedback ? JSON.parse(String(row.feedback)) as ItemFeedback[] : null;
    return { ...row, legacy: Boolean(row.legacy), domains: JSON.parse(String(row.domains)), answers: JSON.parse(String(row.answers)), progress: items,
      attempts: attempts.results.filter(item => item.assessmentId === row.id).map(item => ({ ...item, correct: Boolean(item.correct) })),
      feedback: feedback?.map(item => ({ ...item, practice: teacher || items.some(p => p.questionId === item.id && p.attempts > 0) ? item.practice : { ...item.practice, accepted: [], explanation: '' } })) ?? null };
  }) };
}
