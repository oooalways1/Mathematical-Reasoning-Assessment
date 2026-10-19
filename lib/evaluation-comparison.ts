import type { DiagnosisResult } from './diagnosis-model';

/** Only server-issued fingerprints of frozen criteria may cross version boundaries. */
export function sameEvaluationCriteria(a: DiagnosisResult, b: DiagnosisResult) {
  return a.grade === b.grade && a.maxScore === b.maxScore && (
    a.comparisonKey && b.comparisonKey
      ? a.comparisonKey === b.comparisonKey
      : Boolean(a.keyVersion && a.keyVersion === b.keyVersion)
  );
}
