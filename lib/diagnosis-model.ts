import { questionBlueprints, POINTS_PER_QUESTION, type Grade } from './diagnosis-blueprint';
import type { CoachingMessage, SkillGuide } from './feedback-types';

export type StudentProfile = { id: string; name: string; grade: Grade; classroom: string; schoolId?: string | null; schoolName?: string | null; schoolRegion?: string | null };
export type Practice = { prompt: string; accepted: string[]; hint: string; explanation: string; version: number; enabled?: boolean };
export type ItemFeedback = { verdict?:import("./grading").Verdict; normalized?:string|null; id: string; number: number; domain: string; topic: string; given: string; expected: string[]; correct: boolean; blank: boolean; guidance: string; practice: Practice; skill?: SkillGuide; coaching?: CoachingMessage; practiceCoaching?: CoachingMessage; teacherGuidance?: string; custom?: boolean };
export type LearningProgress = { questionId: string; attempts: number; latestAnswer: string; correct: boolean; completedAt: string | null; teacherNote: string; updatedAt: string };
export type PracticeAttempt = { practicePrompt?:string|null;practiceVersion?:number|null; id: string; questionId: string; answer: string; correct: boolean; attemptedAt: string; coaching?: CoachingMessage | null };
export type DiagnosisResult = { pending?:number; comparisonKey?:string; evaluationId?: string | null; evaluationTitle?: string | null; evaluationCode?: string | null; id: string; studentId: string; grade: Grade; totalScore: number; maxScore: number; domains: Record<string, number>; completedAt: string; submissionMethod: 'manual' | 'scan'; keyVersion: string; feedback?: ItemFeedback[] | null; progress?: LearningProgress[]; attempts?: PracticeAttempt[]; legacy?: boolean; answers?: Record<string, unknown>; coachingSummary?: CoachingMessage };
export type AnswerKey = Record<string, string[]>;
export function normalizeAnswer(value: string) {
  return value.normalize('NFKC').trim().toLowerCase().replace(/\s/g, '');
}
export function choiceAnswer(value: string) {
  const normalized = normalizeAnswer(value).replace(/^\(([1-4])\)$/, '$1');
  return /^[1-4]$/.test(normalized) ? normalized : null;
}
export function scoreDiagnosis(grade: Grade, answers: Record<string, string>, key: AnswerKey) {
  const correct: Record<string, boolean> = {};
  const byDomain: Record<string, { correct: number; count: number }> = {};
  let count = 0;
  for (const item of questionBlueprints[grade]) {
    const answer = item.type === 'choice' ? choiceAnswer(answers[item.id] ?? '') : normalizeAnswer(answers[item.id] ?? '');
    const matched = !!answer && key[item.id].some(candidate => (item.type === 'choice' ? choiceAnswer(candidate) : normalizeAnswer(candidate)) === answer);
    correct[item.id] = matched;
    count += Number(matched);
    const area = byDomain[item.domain] ??= { correct: 0, count: 0 };
    area.count++; area.correct += Number(matched);
  }
  return { totalScore: count * POINTS_PER_QUESTION, maxScore: 100, correct, domains: Object.fromEntries(Object.entries(byDomain).map(([domain, value]) => [domain, Math.round(value.correct / value.count * 100)])) };
}
