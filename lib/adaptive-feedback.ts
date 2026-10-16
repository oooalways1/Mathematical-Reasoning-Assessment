import { questionBlueprints } from './diagnosis-blueprint';
import { normalizeAnswer, type DiagnosisResult, type ItemFeedback, type PracticeAttempt } from './diagnosis-model';
import { caseById, FEEDBACK_VERSION } from './feedback-cases';
import { getSkillGuide } from './skill-guides';
import type { CoachingMessage, SkillGuide } from './feedback-types';

function variation(seed: string) {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) % 2;
}
export function renderCoaching(caseId: string, skill: SkillGuide, seed: string, evidence: string[] = []): CoachingMessage {
  const entry = caseById[caseId];
  if (!entry) throw new Error('Unknown feedback case');
  return { caseId, title: entry.title, message: `${entry.variants[variation(seed)]} ${skill.focus}`,
    nextStep: entry.level === 'start' ? skill.easier : entry.level === 'extend' ? skill.challenge : entry.level === 'review' ? skill.check : `${skill.steps[0]} → ${skill.steps[1]}`,
    evidence, level: entry.level, version: FEEDBACK_VERSION };
}
export function skillForFeedback(item: ItemFeedback): SkillGuide | undefined {
  if (item.custom) return undefined;
  if (item.skill) return item.skill;
  const blueprint = Object.values(questionBlueprints).flat().find(candidate => candidate.id === item.id);
  return blueprint ? getSkillGuide(blueprint) : undefined;
}
// Only one numeric value, optionally followed by a known unit, counts as a numeric answer.
// Expressions, lists, times and alternative answer strings are never reduced to a guessed number.
function numeric(value: string): number | null {
  const match = normalizeAnswer(value).match(/^(-?\d+(?:\.\d+)?)(?:cm|mm|km|m|kg|g|ml|l|센티미터|밀리미터|킬로미터|미터|킬로그램|그램|밀리리터|리터|개|명|일|분|시간|배)?$/);
  return match ? Number(match[1]) : null;
}
function numericMatch(given: string, expected: string[]) {
  const number = numeric(given);
  return number !== null && expected.some(answer => numeric(answer) === number);
}
function hasNumericUnit(value: string) {
  return /^-?\d+(?:\.\d+)?(?:cm|mm|km|m|kg|g|ml|l|센티미터|밀리미터|킬로미터|미터|킬로그램|그램|밀리리터|리터|개|명|일|분|시간|배)$/.test(normalizeAnswer(value));
}
function oneAway(given: string, expected: string[]) {
  const number = numeric(given);
  return number !== null && expected.some(answer => numeric(answer) !== null && Math.abs(number - numeric(answer)!) === 1);
}
export function diagnosticCoaching(item: ItemFeedback, skill: SkillGuide, options: { previous?: ItemFeedback; method?: string; seed: string }): CoachingMessage {
  const previous = options.previous;
  const evidence = [item.blank ? '이번 답안 미입력' : item.correct ? '제출 당시 정답표와 일치' : '제출 당시 정답표와 불일치'];
  if (previous) evidence.push(previous.blank ? '같은 학년·정답표의 이전 답안 미입력' : previous.correct ? '같은 학년·정답표의 이전 문항 정답' : '같은 학년·정답표의 이전 문항 오답');
  const blueprint = Object.values(questionBlueprints).flat().find(candidate => candidate.id === item.id);
  let id: string;
  if (item.correct) {
    const alternative = item.expected.findIndex(answer => normalizeAnswer(answer) === normalizeAnswer(item.given));
    id = previous && !previous.correct ? 'd-recovered' : previous?.correct ? 'd-stable-correct' : alternative > 0 ? 'd-alternative' : 'd-first-correct';
  } else if (item.blank) {
    id = options.method === 'scan' ? 'd-scan-blank' : previous?.blank ? 'd-repeat-blank' : 'd-blank';
  } else if (previous?.correct) id = 'd-review-again';
  else if (previous && !previous.correct && !previous.blank && normalizeAnswer(previous.given) === normalizeAnswer(item.given)) id = 'd-same-answer';
  else if (previous && !previous.correct && !previous.blank) id = 'd-retry-topic';
  else if (blueprint?.type !== 'choice' && numericMatch(item.given, item.expected)) id = 'd-format-review';
  else if (blueprint?.type !== 'choice' && oneAway(item.given, item.expected)) id = 'd-one-away';
  else id = blueprint?.type === 'choice' ? 'd-choice-review' : 'd-short-review';
  return renderCoaching(id, skill, options.seed, evidence);
}

// attempts are newest first. A feedback message is based solely on recorded outcomes.
export function practiceCoaching(item: ItemFeedback, attempts: PracticeAttempt[], seed: string): CoachingMessage | undefined {
  const skill = skillForFeedback(item);
  if (!skill) return;
  const latest = attempts[0];
  if (!latest) return renderCoaching('p-ready', skill, seed, ['이 연습의 저장된 시도 없음']);
  const prior = attempts.slice(1), evidence = [`이 연습의 저장된 시도 ${attempts.length}회`, latest.correct ? '최근 연습 정답' : '최근 연습 오답'];
  let id: string;
  if (latest.correct) {
    id = attempts.length >= 3 && attempts.slice(0,3).every(attempt => attempt.correct) ? 'p-explain'
      : prior[0]?.correct ? 'p-correct-streak' : prior.length ? 'p-recovered' : 'p-first-correct';
  } else if (prior.some(attempt => attempt.correct)) { id = 'p-review-after-success'; evidence.push('이 연습의 이전 정답 기록 있음'); }
  else if (attempts.length >= 4 && attempts.slice(0,4).every(attempt => !attempt.correct)) { id = 'p-four-wrong'; evidence.push('최근 네 번 연속 오답'); }
  else {
    const answer = normalizeAnswer(latest.answer);
    const choice = /[①②③④]/.test(item.practice.prompt);
    const expected = item.practice.accepted.map(normalizeAnswer);
    const expression = item.practice.prompt.match(/(\d+)\s*([+\-])\s*(\d+)/);
    const opposite = expression ? expression[2] === '+' ? Number(expression[1])-Number(expression[3]) : Number(expression[1])+Number(expression[3]) : null;
    const reversed = expected.some(value => /^\d{2}$/.test(value) && value[0] !== value[1] && answer === value[1]+value[0]);
    if ((answer === '>' && expected.includes('<')) || (answer === '<' && expected.includes('>'))) id = 'p-comparison';
    else if (opposite !== null && numeric(latest.answer) === opposite) id = 'p-operation';
    else if (!choice && reversed) id = 'p-place-order';
    else if (numericMatch(latest.answer, item.practice.accepted)) id = !choice && hasNumericUnit(answer) && expected.some(hasNumericUnit) ? 'p-unit' : 'p-format';
    else if (!choice && oneAway(latest.answer, item.practice.accepted)) id = 'p-one-away';
    else if (prior[0] && normalizeAnswer(prior[0].answer) === answer) { id = 'p-same-wrong'; evidence.push('최근 두 번 같은 답 입력'); }
    else if (/[=,;]|\d\s*[+×÷]\s*\d/.test(latest.answer)) id = 'p-format';
    else id = prior.length ? 'p-different-wrong' : 'p-first-wrong';
  }
  return renderCoaching(id, skill, `${seed}:${attempts.length}`, evidence);
}

export function summarizeLearning(result: DiagnosisResult, previous?: DiagnosisResult): CoachingMessage | undefined {
  if (!result.feedback?.length) return;
  const wrong = result.feedback.filter(item => !item.correct), blanks = wrong.filter(item => item.blank).length;
  const completed = wrong.filter(item => result.progress?.some(progress => progress.questionId === item.id && progress.completedAt)).length;
  const practiced = wrong.filter(item => result.progress?.some(progress => progress.questionId === item.id && progress.attempts > 0)).length;
  const areas = Object.entries(result.domains).sort((a,b) => a[1]-b[1]);
  const target = wrong.find(item => item.domain === areas[0]?.[0]) ?? wrong[0] ?? result.feedback[0];
  const skill = skillForFeedback(target);
  if (!skill) return;
  const comparable = previous && !previous.legacy && previous.grade === result.grade && previous.keyVersion === result.keyVersion && previous.maxScore === result.maxScore;
  const evidence = [`진단 ${result.feedback.length}문항 중 정답 ${result.feedback.length-wrong.length}개`, `미입력 ${blanks}개`, `추천 복습 ${wrong.length}개 중 ${completed}개 완료`];
  let caseId: string, title: string, message: string, nextStep: string, level: CoachingMessage['level'];
  if (blanks === result.feedback.length) {
    caseId='s-all-blank'; title='첫 문항부터 함께 시작해요'; message='이번 제출에는 모든 답이 비어 있어요. 원본 답안과 입력 여부를 확인한 뒤 한 문항씩 시작해 보세요.'; nextStep=skill.easier; level='start';
  } else if (wrong.length && completed === wrong.length) {
    caseId='s-review-complete'; title='추천 복습을 모두 마쳤어요'; message='틀리거나 비워 둔 문항과 연결된 연습을 모두 한 번 이상 맞혔어요. 원래 검사지도 다시 풀어 설명해 보세요.'; nextStep=skill.challenge; level='extend';
  } else if (!wrong.length) {
    caseId='s-all-correct'; title='이번 진단을 모두 해결했어요'; message='이번 진단의 답이 모두 정답표와 맞아요. 풀이를 다른 방법으로 설명하며 배움을 넓혀 보세요.'; nextStep=skill.challenge; level='extend';
  } else if (blanks >= 5) {
    caseId='s-many-blanks'; title='빈 답안부터 천천히 살펴봐요'; message=`답이 비어 있는 문항이 ${blanks}개예요. 입력 누락인지 먼저 확인하고, 시작할 수 있는 문항 한 개부터 풀어 보세요.`; nextStep=skill.easier; level='start';
  } else if (comparable && result.totalScore > previous.totalScore) {
    caseId='s-score-up'; title='같은 기준에서 달라진 결과를 살펴봐요'; message=`같은 학년·정답표의 이전 진단보다 ${result.totalScore-previous.totalScore}점 높아요. 새로 해결한 풀이를 기억하고 남은 복습을 이어 가세요.`; nextStep=skill.check; level='practice'; evidence.push('같은 학년·정답표·만점인 이전 진단과 비교');
  } else if (comparable && result.totalScore < previous.totalScore) {
    caseId='s-score-review'; title='지난 풀이와 나란히 비교해요'; message=`같은 기준의 이전 진단보다 ${previous.totalScore-result.totalScore}점 낮아요. 이전에 맞힌 문항과 이번 답의 차이를 살펴보세요.`; nextStep=skill.check; level='review'; evidence.push('같은 학년·정답표·만점인 이전 진단과 비교');
  } else if (practiced && completed < wrong.length) {
    caseId='s-practice-progress'; title='연습 기록을 이어 가고 있어요'; message=`추천 복습 중 ${practiced}개를 시도했고 ${completed}개를 한 번 이상 맞혔어요. 아직 해결하지 않은 연습 한 개를 골라 다음 단계로 가 보세요.`; nextStep=skill.easier; level='practice';
  } else {
    caseId='s-next-step'; title='오늘의 다음 배움'; message=`이번 진단에서 다시 살펴볼 문항은 ${wrong.length}개예요. ${target.domain}의 「${skill.label}」부터 연습해 보세요.`; nextStep=skill.steps[0]; level='start';
  }
  return {caseId,title,message,nextStep,evidence,level,version:FEEDBACK_VERSION};
}
