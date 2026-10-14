import type { Domain } from "./assessment";

export const GRADES = [1, 2, 3] as const;
export type Grade = (typeof GRADES)[number];
export const QUESTION_COUNT = 20;
export const POINTS_PER_QUESTION = 5;
export type QuestionBlueprint = {
  id: string;
  number: number;
  sourceNumber: number;
  sourceGrade: number;
  domain: Domain;
  topic: string;
  type: "short" | "choice";
};

// Read-only transcription of the supplied composition workbook, 2026-10-14.
// These are item specifications, not complete question stems or answer keys.
// Grade 2 uses row order; its appended anchors retain their grade 1 source numbers.
export const questionBlueprints: Record<Grade, QuestionBlueprint[]> = {
  "1": [
    {
      "id": "g1-q1",
      "number": 1,
      "sourceNumber": 1,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "9 이하의 사물의 개수를 세어 수로 나타내기",
      "type": "short"
    },
    {
      "id": "g1-q2",
      "number": 2,
      "sourceNumber": 2,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "9까지 수의 순서에서 빈칸에 알맞은 수 찾기",
      "type": "short"
    },
    {
      "id": "g1-q3",
      "number": 3,
      "sourceNumber": 3,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "생활 주변의 물건에서 같은 모양 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q4",
      "number": 4,
      "sourceNumber": 4,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 가지 모양의 특징을 보고 알맞은 생활 속 물건 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q5",
      "number": 5,
      "sourceNumber": 5,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 가지 모양의 특징을 알고 쌓기 어려운 모양 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q6",
      "number": 6,
      "sourceNumber": 6,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "주어진 여러 가지 모양을 이용하여 만들 수 있는 모양 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q7",
      "number": 7,
      "sourceNumber": 7,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "그림의 덧셈 상황을 알맞은 식으로 나타내기",
      "type": "choice"
    },
    {
      "id": "g1-q8",
      "number": 8,
      "sourceNumber": 8,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "9 이하의 수를 두 수로 가르기",
      "type": "choice"
    },
    {
      "id": "g1-q9",
      "number": 9,
      "sourceNumber": 9,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "합이 9 이하인 한 자리 수의 덧셈 계산하기",
      "type": "short"
    },
    {
      "id": "g1-q10",
      "number": 10,
      "sourceNumber": 10,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "9 이하의 수 범위에서 한 자리 수의 뺄셈 계산하기",
      "type": "short"
    },
    {
      "id": "g1-q11",
      "number": 11,
      "sourceNumber": 11,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "0이 포함된 간단한 덧셈 또는 뺄셈 계산하기",
      "type": "choice"
    },
    {
      "id": "g1-q12",
      "number": 12,
      "sourceNumber": 12,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 물건의 길이를 비교하여 가장 긴 물건 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q13",
      "number": 13,
      "sourceNumber": 13,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "물건의 무게를 비교하여 더 무거운 물건 찾기",
      "type": "short"
    },
    {
      "id": "g1-q14",
      "number": 14,
      "sourceNumber": 14,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 물건의 넓이를 비교하여 가장 넓은 물건 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q15",
      "number": 15,
      "sourceNumber": 15,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 컵의 들이를 비교하여 가장 많이 담을 수 있는 컵 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q16",
      "number": 16,
      "sourceNumber": 16,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "10개씩 묶음으로 나타낸 그림을 보고 수로 나타내기",
      "type": "choice"
    },
    {
      "id": "g1-q17",
      "number": 17,
      "sourceNumber": 17,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "50까지 수의 순서에서 빈칸에 알맞은 수 찾기",
      "type": "short"
    },
    {
      "id": "g1-q18",
      "number": 18,
      "sourceNumber": 18,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "50까지의 수의 크기를 비교하여 가장 작은 수 찾기",
      "type": "choice"
    },
    {
      "id": "g1-q19",
      "number": 19,
      "sourceNumber": 19,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "19 이하의 수를 두 수로 가르기",
      "type": "choice"
    },
    {
      "id": "g1-q20",
      "number": 20,
      "sourceNumber": 20,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "두 수를 모아 19 이하의 하나의 수로 나타내기",
      "type": "choice"
    }
  ],
  "2": [
    {
      "id": "g2-q1",
      "number": 1,
      "sourceNumber": 1,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "99까지의 수를 세고 쓰기",
      "type": "choice"
    },
    {
      "id": "g2-q2",
      "number": 2,
      "sourceNumber": 2,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "두 수의 크기를 비교하여 부등호로 나타내기",
      "type": "short"
    },
    {
      "id": "g2-q3",
      "number": 3,
      "sourceNumber": 3,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "10이 되는 덧셈식을 만들고 덧셈하기",
      "type": "short"
    },
    {
      "id": "g2-q4",
      "number": 4,
      "sourceNumber": 4,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "세 수의 뺄셈을 하는 상황을 이해하고 세 수의 뺄셈하기",
      "type": "choice"
    },
    {
      "id": "g2-q5",
      "number": 5,
      "sourceNumber": 5,
      "sourceGrade": 2,
      "domain": "도형과 측정",
      "topic": "그림을 살펴보고 □, △ ,○ 모양 찾기",
      "type": "choice"
    },
    {
      "id": "g2-q6",
      "number": 6,
      "sourceNumber": 6,
      "sourceGrade": 2,
      "domain": "도형과 측정",
      "topic": "본뜨기 활동에서 □, △ ,○ 모양 추측하기",
      "type": "short"
    },
    {
      "id": "g2-q7",
      "number": 7,
      "sourceNumber": 7,
      "sourceGrade": 2,
      "domain": "도형과 측정",
      "topic": "시계를 보고 몇 시 30분 읽기",
      "type": "choice"
    },
    {
      "id": "g2-q8",
      "number": 8,
      "sourceNumber": 8,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "(몇)+(몇)=(십몇)의 계산 원리를 이해하고 계산하기",
      "type": "short"
    },
    {
      "id": "g2-q9",
      "number": 9,
      "sourceNumber": 9,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "(십몇)-(몇)=(몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g2-q10",
      "number": 10,
      "sourceNumber": 10,
      "sourceGrade": 2,
      "domain": "변화와 관계",
      "topic": "무늬의 배열에서 규칙을 찾아 다음의 모양 추론하기",
      "type": "choice"
    },
    {
      "id": "g2-q11",
      "number": 11,
      "sourceNumber": 11,
      "sourceGrade": 2,
      "domain": "변화와 관계",
      "topic": "수의 배열에서 규칙을 찾아 다음의 수 추론하기",
      "type": "choice"
    },
    {
      "id": "g2-q12",
      "number": 12,
      "sourceNumber": 12,
      "sourceGrade": 2,
      "domain": "변화와 관계",
      "topic": "수 배열표에서 규칙을 찾아 빈칸의 수 추론하기",
      "type": "choice"
    },
    {
      "id": "g2-q13",
      "number": 13,
      "sourceNumber": 13,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "받아올림이 없는 (몇십몇)+(몇십몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g2-q14",
      "number": 14,
      "sourceNumber": 14,
      "sourceGrade": 2,
      "domain": "수와 연산",
      "topic": "받아내림이 없는 (몇십몇)-(몇십몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g2-q15",
      "number": 15,
      "sourceNumber": 2,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "9까지 수의 순서에서 빈칸에 알맞은 수 찾기",
      "type": "short"
    },
    {
      "id": "g2-q16",
      "number": 16,
      "sourceNumber": 5,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 가지 모양의 특징을 알고 쌓기 어려운 모양 찾기",
      "type": "choice"
    },
    {
      "id": "g2-q17",
      "number": 17,
      "sourceNumber": 7,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "그림의 덧셈 상황을 알맞은 식으로 나타내기",
      "type": "choice"
    },
    {
      "id": "g2-q18",
      "number": 18,
      "sourceNumber": 13,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "물건의 무게를 비교하여 더 무거운 물건 찾기",
      "type": "short"
    },
    {
      "id": "g2-q19",
      "number": 19,
      "sourceNumber": 14,
      "sourceGrade": 1,
      "domain": "도형과 측정",
      "topic": "여러 물건의 넓이를 비교하여 가장 넓은 물건 찾기",
      "type": "choice"
    },
    {
      "id": "g2-q20",
      "number": 20,
      "sourceNumber": 18,
      "sourceGrade": 1,
      "domain": "수와 연산",
      "topic": "50까지의 수의 크기를 비교하여 가장 작은 수 찾기",
      "type": "choice"
    }
  ],
  "3": [
    {
      "id": "g3-q1",
      "number": 1,
      "sourceNumber": 1,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "(몇)+(몇)=(십몇)의 계산 원리를 이해하고 계산하기",
      "type": "short"
    },
    {
      "id": "g3-q2",
      "number": 2,
      "sourceNumber": 2,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "(십몇)-(몇)=(몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g3-q3",
      "number": 3,
      "sourceNumber": 3,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "받아올림이 없는 (몇십몇)+(몇십몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g3-q4",
      "number": 4,
      "sourceNumber": 4,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "받아내림이 없는 (몇십몇)-(몇십몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g3-q5",
      "number": 5,
      "sourceNumber": 5,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "그림을 살펴보고 □, △ ,○ 모양 찾기",
      "type": "choice"
    },
    {
      "id": "g3-q6",
      "number": 6,
      "sourceNumber": 6,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "본뜨기 활동에서 □, △ ,○ 모양 추측하기",
      "type": "short"
    },
    {
      "id": "g3-q7",
      "number": 7,
      "sourceNumber": 7,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "각 자리 숫자가 나타내는 수 찾기",
      "type": "choice"
    },
    {
      "id": "g3-q8",
      "number": 8,
      "sourceNumber": 8,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "칠교판에서 사각형 모양 조각 찾기",
      "type": "choice"
    },
    {
      "id": "g3-q9",
      "number": 9,
      "sourceNumber": 9,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "받아올림이 있는 (몇십몇)+(몇십몇)의 계산 원리를 이해하고 계산하기",
      "type": "choice"
    },
    {
      "id": "g3-q10",
      "number": 10,
      "sourceNumber": 10,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "받아내림이 있는 (몇십몇)-(몇십몇)의 계산 원리를 이해하고 계산하기",
      "type": "short"
    },
    {
      "id": "g3-q11",
      "number": 11,
      "sourceNumber": 11,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "그림을 보고 색연필의 길이 측정하기",
      "type": "choice"
    },
    {
      "id": "g3-q12",
      "number": 12,
      "sourceNumber": 12,
      "sourceGrade": 3,
      "domain": "자료와 가능성",
      "topic": "분류된 결과를 보고 분류 기준 찾기",
      "type": "choice"
    },
    {
      "id": "g3-q13",
      "number": 13,
      "sourceNumber": 13,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "‘몇씩 몇 묶음’을 ‘몇의 몇 배’로 나타내기",
      "type": "choice"
    },
    {
      "id": "g3-q14",
      "number": 14,
      "sourceNumber": 14,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "두 수의 크기를 비교하여 부등호로 나타내기",
      "type": "short"
    },
    {
      "id": "g3-q15",
      "number": 15,
      "sourceNumber": 15,
      "sourceGrade": 3,
      "domain": "수와 연산",
      "topic": "곱셈구구를 이용하여 문제 해결하기",
      "type": "choice"
    },
    {
      "id": "g3-q16",
      "number": 16,
      "sourceNumber": 16,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "두 길이의 차 구하기",
      "type": "choice"
    },
    {
      "id": "g3-q17",
      "number": 17,
      "sourceNumber": 17,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "시간 띠를 보고 걸린 시간 구하기",
      "type": "choice"
    },
    {
      "id": "g3-q18",
      "number": 18,
      "sourceNumber": 18,
      "sourceGrade": 3,
      "domain": "도형과 측정",
      "topic": "달력의 구성 요소와 규칙성을 이해하고 추론하기",
      "type": "choice"
    },
    {
      "id": "g3-q19",
      "number": 19,
      "sourceNumber": 19,
      "sourceGrade": 3,
      "domain": "자료와 가능성",
      "topic": "자료를 조사하여 표로 나타내기",
      "type": "short"
    },
    {
      "id": "g3-q20",
      "number": 20,
      "sourceNumber": 20,
      "sourceGrade": 3,
      "domain": "변화와 관계",
      "topic": "곱셈표에서 규칙을 찾아 추론하기",
      "type": "short"
    }
  ]
};

export function isGrade(value: number): value is Grade {
  return GRADES.some((grade) => grade === value);
}

