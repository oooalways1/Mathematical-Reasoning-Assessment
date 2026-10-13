export const domains = ["수와 연산", "변화와 관계", "도형과 측정", "자료와 가능성"] as const;
export type Domain = (typeof domains)[number];

export const domainDescriptions: Record<Domain, string> = {
  "수와 연산": "수의 의미를 이해하고 계산하는 힘을 살펴요.",
  "변화와 관계": "규칙을 발견하고 수 사이의 관계를 알아봐요.",
  "도형과 측정": "도형의 성질을 이해하고 크기를 측정해요.",
  "자료와 가능성": "자료를 해석하고 일이 일어날 가능성을 생각해요.",
};

type Question = { id: string; domain: Domain; prompt: string; choices: string[]; answer: number; hint: string };

export const questions: Question[] = [
  { id: "q1", domain: "수와 연산", prompt: "48보다 10 큰 수는 무엇인가요?", choices: ["38", "58", "410", "50"], answer: 1, hint: "십의 자리에서 10만큼 커져요." },
  { id: "q2", domain: "수와 연산", prompt: "36을 4씩 묶으면 몇 묶음이 되나요?", choices: ["8묶음", "9묶음", "10묶음", "32묶음"], answer: 1, hint: "36 ÷ 4를 생각해 보세요." },
  { id: "q3", domain: "수와 연산", prompt: "1/2과 크기가 같은 분수는 무엇인가요?", choices: ["2/3", "3/6", "2/5", "1/3"], answer: 1, hint: "분자와 분모에 같은 수를 곱해 보세요." },
  { id: "q7", domain: "변화와 관계", prompt: "3, 6, 9, 12, (   )에 알맞은 수는?", choices: ["13", "14", "15", "16"], answer: 2, hint: "앞의 수에서 얼마씩 커지는지 찾아보세요." },
  { id: "q8", domain: "변화와 관계", prompt: "□ + 7 = 19일 때, □에 들어갈 수는?", choices: ["10", "11", "12", "13"], answer: 2, hint: "19에서 7을 거꾸로 빼 보세요." },
  { id: "q9", domain: "변화와 관계", prompt: "규칙에 따라 다음에 올 도형은? ○ △ ○ △ ○ (   )", choices: ["○", "△", "□", "◇"], answer: 1, hint: "두 도형이 번갈아 나오고 있어요." },
  { id: "q4", domain: "도형과 측정", prompt: "정사각형의 변은 모두 몇 개인가요?", choices: ["3개", "4개", "5개", "6개"], answer: 1, hint: "네모 모양의 선분을 세어 보세요." },
  { id: "q5", domain: "도형과 측정", prompt: "직각은 몇 도인가요?", choices: ["45도", "90도", "120도", "180도"], answer: 1, hint: "네모의 모서리에서 볼 수 있는 각이에요." },
  { id: "q6", domain: "도형과 측정", prompt: "길이가 3 m인 리본은 몇 cm인가요?", choices: ["30 cm", "300 cm", "3 cm", "3,000 cm"], answer: 1, hint: "1 m는 100 cm예요." },
  { id: "q10", domain: "자료와 가능성", prompt: "주머니에 같은 크기의 빨간 공 3개와 파란 공 1개가 있어요. 보지 않고 하나를 꺼낼 때 더 가능성이 큰 일은?", choices: ["파란 공이 나와요", "노란 공이 나와요", "빨간 공이 나와요", "두 색의 가능성이 같아요"], answer: 2, hint: "어떤 색의 공이 더 많이 들어 있는지 생각해 보세요." },
  { id: "q11", domain: "자료와 가능성", prompt: "좋아하는 과일을 조사했어요. 사과 4명, 배 2명, 포도 3명이라면, 한 명이 하나씩 골랐을 때 조사에 참여한 학생은 모두 몇 명인가요?", choices: ["8명", "9명", "10명", "11명"], answer: 1, hint: "각 과일을 고른 학생 수를 모두 더해요." },
  { id: "q12", domain: "자료와 가능성", prompt: "월요일 12권, 화요일 18권, 수요일 15권을 읽었어요. 가장 많이 읽은 날은?", choices: ["월요일", "화요일", "수요일", "모두 같아요"], answer: 1, hint: "세 수를 비교해 가장 큰 수를 찾아요." },
];

// Historical labels stay in the stored record. Only comparable domains are aliased.
export function domainScore(scores: Record<string, number>, domain: Domain): number | undefined {
  if (typeof scores[domain] === "number") return scores[domain];
  const previous = domain === "변화와 관계" ? "규칙과 변화" : domain === "도형과 측정" ? "도형과 공간" : undefined;
  return previous ? scores[previous] : undefined;
}

export function hasLegacyDomains(scores: Record<string, number>): boolean {
  return Object.hasOwn(scores, "자료와 문제해결");
}
