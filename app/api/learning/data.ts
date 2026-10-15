import { db } from '../_lib';
import type { DiagnosisResult, ItemFeedback, LearningProgress, PracticeAttempt } from '@/lib/diagnosis-model';
import type { CoachingMessage } from '@/lib/feedback-types';
import { diagnosticCoaching, practiceCoaching, skillForFeedback, summarizeLearning } from '@/lib/adaptive-feedback';
import type { Grade } from '@/lib/diagnosis-blueprint';
type AssessmentRow = { id:string; studentId:string; grade:Grade; legacy:number; totalScore:number; maxScore:number; domains:string; answers:string; feedback:string|null; completedAt:string; submissionMethod:DiagnosisResult['submissionMethod']|null; keyVersion:string|null };

export async function readLearning(studentId: string, teacher: boolean) {
  const database = db();
  const [records, progress, attempts] = await Promise.all([
    database.prepare(`SELECT a.id, a.student_id AS studentId, COALESCE(a.grade,s.grade) AS grade, a.grade IS NULL AS legacy,
      a.total_score AS totalScore, a.max_score AS maxScore, a.domains, a.answers, a.feedback,
      a.completed_at AS completedAt, a.submission_method AS submissionMethod, a.key_version AS keyVersion
      FROM assessments a JOIN students s ON s.id=a.student_id WHERE a.student_id=? ORDER BY a.completed_at DESC, a.id DESC`).bind(studentId).all<AssessmentRow>(),
    database.prepare(`SELECT p.assessment_id AS assessmentId, p.question_id AS questionId, p.attempts, p.latest_answer AS latestAnswer,
      p.correct, p.completed_at AS completedAt, p.teacher_note AS teacherNote, p.updated_at AS updatedAt
      FROM learning_progress p JOIN assessments a ON a.id=p.assessment_id WHERE a.student_id=?`).bind(studentId).all<LearningProgress & { assessmentId: string }>(),
    database.prepare(`SELECT p.id, p.assessment_id AS assessmentId, p.question_id AS questionId, p.answer, p.correct, p.attempted_at AS attemptedAt, p.coaching
      FROM learning_attempts p JOIN assessments a ON a.id=p.assessment_id WHERE a.student_id=? ORDER BY p.attempted_at DESC, p.id DESC`).bind(studentId).all<Omit<PracticeAttempt, 'coaching'> & { assessmentId: string; coaching: string | null }>(),
  ]);
  const results = records.results.map((row, index) => {
    const items = progress.results.filter(item => item.assessmentId === row.id).map(item => ({ ...item, correct: Boolean(item.correct) }));
    const feedback = row.feedback ? JSON.parse(String(row.feedback)) as ItemFeedback[] : null;
    const history = attempts.results.filter(item => item.assessmentId === row.id).map(item => ({ ...item, correct: Boolean(item.correct), coaching: item.coaching ? JSON.parse(item.coaching) as CoachingMessage : null }));
    const previousRow = records.results.slice(index+1).find(previous => previous.grade === row.grade && previous.keyVersion === row.keyVersion && previous.feedback);
    const previousItems = previousRow ? JSON.parse(String(previousRow.feedback)) as ItemFeedback[] : [];
    const enriched = feedback?.map(item => {
      const skill = skillForFeedback(item), ownAttempts = history.filter(attempt => attempt.questionId === item.id);
      return { ...item, skill,
        coaching: item.coaching ?? (skill ? diagnosticCoaching(item, skill, {previous:previousItems.find(previous => previous.id === item.id),method:String(row.submissionMethod),seed:`${row.id}:${item.id}`}) : undefined),
        practiceCoaching: ownAttempts[0]?.coaching ?? practiceCoaching(item, ownAttempts, `${row.id}:${item.id}`),
        practice: teacher || items.some(p => p.questionId === item.id && p.attempts > 0) ? item.practice : { ...item.practice, accepted: [], explanation: '' } };
    }) ?? null;
    return { ...row, legacy: Boolean(row.legacy), submissionMethod:row.submissionMethod ?? 'manual', keyVersion:row.keyVersion ?? '', domains: JSON.parse(String(row.domains)), answers: JSON.parse(String(row.answers)), progress: items,
      attempts: history, feedback: enriched } satisfies DiagnosisResult;
  });
  return { results: results.map((result,index) => ({ ...result, coachingSummary: summarizeLearning(result, results.slice(index+1).find(previous => !previous.legacy && previous.grade === result.grade && previous.keyVersion === result.keyVersion && previous.maxScore === result.maxScore)) })) };
}
