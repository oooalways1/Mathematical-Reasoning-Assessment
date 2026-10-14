import { questionBlueprints, POINTS_PER_QUESTION, type Grade } from './diagnosis-blueprint';

export type StudentProfile = { id: string; name: string; grade: Grade; classroom: string };
export type DiagnosisResult = { id: string; studentId: string; grade: Grade; totalScore: number; maxScore: number; domains: Record<string, number>; completedAt: string; submissionMethod: 'manual' | 'scan'; keyVersion: string };
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
