import {criteriaFingerprint} from '../_comparison';
import {sameEvaluationCriteria} from '@/lib/evaluation-comparison';
import { db } from '../_lib';
import {ensureEvaluations} from '../_evaluations';
import type { DiagnosisResult, ItemFeedback, LearningProgress, PracticeAttempt } from '@/lib/diagnosis-model';
import type { CoachingMessage } from '@/lib/feedback-types';
import { diagnosticCoaching, practiceCoaching, skillForFeedback, summarizeLearning } from '@/lib/adaptive-feedback';
import type { Grade } from '@/lib/diagnosis-blueprint';
import {type Admin,schoolFilter,assessmentSchoolSql} from '../_tenancy';
type AssessmentRow = { criteriaDefinition?:string; comparisonKey?:string; evaluationId:string|null; evaluationTitle:string|null; evaluationCode:string|null; id:string; studentId:string; grade:Grade; legacy:number; totalScore:number; maxScore:number; domains:string; answers:string; feedback:string|null; completedAt:string; submissionMethod:DiagnosisResult['submissionMethod']|null; keyVersion:string|null };

export async function readLearning(studentId: string, teacher: boolean,admin?:Admin) {
  await ensureEvaluations();
  const database = db();
  const extras=await database.prepare('SELECT g.assessment_id,g.question_id,g.status,g.normalized_answer,o.practice,o.roadmap_note FROM grading_reviews g LEFT JOIN learning_overrides o ON o.assessment_id=g.assessment_id AND o.question_id=g.question_id JOIN assessments a ON a.id=g.assessment_id WHERE a.student_id=?').bind(studentId).all<{assessment_id:string;question_id:string;status:'correct'|'incorrect'|'review';normalized_answer:string|null;practice:string|null;roadmap_note:string|null}>();
  const materials=await database.prepare('SELECT o.* FROM learning_overrides o JOIN assessments a ON a.id=o.assessment_id WHERE a.student_id=?').bind(studentId).all<{assessment_id:string;question_id:string;practice:string|null;roadmap_note:string}>();
  const filter=admin?schoolFilter(admin,null,assessmentSchoolSql()):{sql:'1=1',values:[]};
  const [records, progress, attempts] = await Promise.all([
    database.prepare(`SELECT a.id, a.student_id AS studentId, COALESCE(a.grade,s.grade) AS grade, a.grade IS NULL AS legacy,
      a.total_score AS totalScore, a.max_score AS maxScore, a.domains, a.answers, a.feedback,
      a.completed_at AS completedAt, a.submission_method AS submissionMethod, a.key_version AS keyVersion, e.definition AS criteriaDefinition,e.form_id AS evaluationId,e.title AS evaluationTitle,e.code AS evaluationCode
      FROM assessments a LEFT JOIN evaluation_revisions e ON e.version=a.key_version JOIN students s ON s.id=a.student_id WHERE a.student_id=? AND ${filter.sql} ORDER BY a.completed_at DESC, a.id DESC`).bind(studentId,...filter.values).all<AssessmentRow>(),
    database.prepare(`SELECT p.assessment_id AS assessmentId, p.question_id AS questionId, p.attempts, p.latest_answer AS latestAnswer,
      p.correct, p.completed_at AS completedAt, p.teacher_note AS teacherNote, p.updated_at AS updatedAt
      FROM learning_progress p JOIN assessments a ON a.id=p.assessment_id WHERE a.student_id=?`).bind(studentId).all<LearningProgress & { assessmentId: string }>(),
    database.prepare(`SELECT p.id, p.assessment_id AS assessmentId, p.question_id AS questionId, p.answer, p.correct, p.attempted_at AS attemptedAt, p.coaching, json_extract(d.practice_json,'$.prompt') AS practicePrompt, json_extract(d.practice_json,'$.version') AS practiceVersion
      FROM learning_attempts p LEFT JOIN practice_attempt_details d ON d.attempt_id=p.id JOIN assessments a ON a.id=p.assessment_id WHERE a.student_id=? ORDER BY p.attempted_at DESC, p.id DESC`).bind(studentId).all<Omit<PracticeAttempt, 'coaching'> & { assessmentId: string; coaching: string | null }>(),
  ]);
  await Promise.all(records.results.map(async row=>{row.comparisonKey=await criteriaFingerprint(row.criteriaDefinition);}));
  const comparable=(a:AssessmentRow,b:AssessmentRow)=>a.grade===b.grade&&(a.comparisonKey&&b.comparisonKey?a.comparisonKey===b.comparisonKey:Boolean(a.keyVersion&&a.keyVersion===b.keyVersion));
  const results = records.results.map((row, index) => {
    const items = progress.results.filter(item => item.assessmentId === row.id).map(item => ({ ...item, correct: Boolean(item.correct) }));
    const feedback = row.feedback ? JSON.parse(String(row.feedback)) as ItemFeedback[] : null;
    const history = attempts.results.filter(item => item.assessmentId === row.id).map(item => ({ ...item, correct: Boolean(item.correct), coaching: item.coaching ? JSON.parse(item.coaching) as CoachingMessage : null }));
    const previousRow = records.results.slice(index+1).find(previous => comparable(previous,row) && previous.feedback);
    const previousItems = previousRow ? JSON.parse(String(previousRow.feedback)) as ItemFeedback[] : [];
    const enriched = feedback?.map(item => {
      const review=extras.results.find(v=>v.assessment_id===row.id&&v.question_id===item.id),material=materials.results.find(v=>v.assessment_id===row.id&&v.question_id===item.id);if(review)item={...item,verdict:review.status,normalized:review.normalized_answer,correct:review.status==='correct'};if(material)item={...item,...(material.practice?{practice:JSON.parse(material.practice)}:{}),...(material.roadmap_note?{teacherGuidance:material.roadmap_note}:{})};
      const skill = skillForFeedback(item), ownAttempts = history.filter(attempt => attempt.questionId === item.id);
      return { ...item, skill,
        coaching: item.coaching ?? (skill ? diagnosticCoaching(item, skill, {previous:previousItems.find(previous => previous.id === item.id),method:String(row.submissionMethod),seed:`${row.id}:${item.id}`}) : undefined),
        practiceCoaching: ownAttempts[0]?.coaching ?? practiceCoaching(item, ownAttempts, `${row.id}:${item.id}`),
        practice: teacher || items.some(p => p.questionId === item.id && p.attempts > 0) ? item.practice : { ...item.practice, accepted: [], explanation: '' } };
    }) ?? null;
    const {criteriaDefinition:_privateCriteria,...publicRow}=row;
    return { ...publicRow,pending:extras.results.filter(v=>v.assessment_id===row.id&&v.status==='review').length, legacy: Boolean(row.legacy), submissionMethod:row.submissionMethod ?? 'manual', keyVersion:row.keyVersion ?? '', domains: JSON.parse(String(row.domains)), answers: JSON.parse(String(row.answers)), progress: items,
      attempts: history, feedback: enriched } satisfies DiagnosisResult;
  });
  return { results: results.map((result,index) => ({ ...result, coachingSummary: summarizeLearning(result, results.slice(index+1).find(previous => !previous.legacy && !previous.pending && sameEvaluationCriteria(previous,result))) })) };
}
