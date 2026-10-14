# 수리력 한걸음

초등 1·2·3학년의 수리력을 살펴보는 학년별 20문항 진단 웹앱입니다.

- 웹앱: https://numeracy-diagnosis.smokypixie.chatgpt.site
- GitHub: https://github.com/oooalways1/Mathematical-Reasoning-Assessment

## 현재 프론트엔드

이번 수정은 로컬 미리보기입니다. 학생용 최종 운영 배포는 진행하지 않았습니다.

- 홈: 회원가입, 진단하기, 나의 결과를 선택하는 첫 화면입니다.
- 회원가입·로그인: Firebase Email/Password 인증을 통해 실제 계정을 만들고 로그인합니다. 학생 프로필과 Firebase UID는 D1에 연결합니다.
- 진단하기: 1·2·3학년을 선택하고 각 20문항의 답안 화면을 미리 볼 수 있습니다. 선택형 번호와 단답형 입력, 문항 이동, 답안 확인이 가능합니다.
- 나의 결과: 인증과 신규 진단 저장을 연결하기 전의 안내 화면입니다. 예시 점수나 가짜 저장 기록을 표시하지 않습니다.

제공된 문항 구성표의 출제 요소와 유형을 `lib/diagnosis-blueprint.ts`에 반영했습니다. 실제 문제 지문·그림·보기는 구성표에 없으므로, 현재는 검사지와 함께 사용하는 **답안 입력 화면**입니다. 미리보기 답은 컴포넌트 메모리에만 보관하고 화면을 나가면 지워집니다.
원본 번호·정답 확인 사항은 `docs/question-source.md`를 참고하세요.

## 교사 사용

1. 웹앱 맨 아래 **관리페이지**를 클릭합니다.
2. 배포 환경에 등록된 교사 ChatGPT 계정으로 로그인합니다.
3. 관리자 비밀번호를 입력합니다.
4. **학생 관리 → 학생 추가**에서 1~3학년 학생 정보를 등록합니다. 이 기능은 교사의 학생 명부 등록이며, 이메일 계정 생성이 아닙니다.
5. **진단 기록**에서 기존 이력과 영역별 점수를 확인합니다.

학생의 참여코드 입력, 코드 다운로드·복사 UI는 이메일 회원가입 화면으로 전환했습니다. 기존 데이터베이스와 인증·채점 API는 유지하며, 신규 20문항 화면의 제출·채점은 정식 오픈 작업에서 연결합니다.

공개 방문자에게 전체 학생 명단과 점수는 제공하지 않습니다.
교사 데이터 API는 허용된 교사 계정과 관리자 세션을 함께 확인합니다.
이전 진단은 기존 영역 명칭으로 보존하며, 신규 진단은 다음 네 영역을 사용합니다.

## 진단 영역

수와 연산 · 변화와 관계 · 도형과 측정 · 자료와 가능성.

학년별 총 20문항이며, 학년에 따라 다루는 영역이 다릅니다. 화면에는 영역별 문항 수를 표시하지 않습니다.

## 기술 구성

- React / TypeScript / Vinext
- Cloudflare Workers에서 실행되는 API
- Cloudflare D1 / Drizzle: 학생, 참여코드, 진단 결과 저장
- Sites: 호스팅과 배포, 교사 ChatGPT 로그인

Firebase 이메일 인증은 `/api/auth/signup`·`/api/auth/login`에서 처리합니다. Cloudflare 환경변수 `FIREBASE_API_KEY`에 Firebase 웹 API 키를 넣고, Firebase Authentication에서 Email/Password 제공업체를 켜야 합니다. 비밀번호는 사이트 DB에 저장하지 않고 Firebase로 전달하며, 학생 프로필과 Firebase UID만 D1에 연결합니다. GitHub에는 소스와 DB 스키마만 저장합니다.
실제 학생 데이터, 비밀번호, 세션 서명 비밀키는 GitHub에 포함하지 않습니다.

## 개발 환경

Node.js 22.13 이상이 필요합니다.

```sh
npm run install:ci
npx tsc --noEmit --incremental false
npm run build
```

로컬 DB는 처음 한 번 다음 순서로 초기화합니다. 이미 적용한 마이그레이션은 다시 실행하지 않습니다.

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_lucky_silver_centurion.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_overrated_miracleman.sql
npm start -- --port 4173
```

로컬 기본 주소는 http://127.0.0.1:4173 입니다.
로컬 운영본 미리보기는 Sites의 ChatGPT 인증 헤더를 제공하지 않으므로 교사 인증은 배포 환경에서 사용합니다.

## 배포 설정

Sites의 런타임 환경 변수에 다음 키를 등록합니다. 값을 소스에 쓰지 않습니다.

| 키 | 용도 |
|---|---|
| TEACHER_EMAIL | 허용할 교사 ChatGPT 계정 이메일 |
| TEACHER_PASSWORD | 관리자 비밀번호 |
| SESSION_SECRET | 무작위로 생성한 32바이트 이상의 세션 서명 비밀키 |

DB 바인딩은 `DB`이며 `.openai/hosting.json`에서 선언합니다.
Sites 워크플로로 소스를 동기화하고 빌드 결과를 배포합니다.
학생용 사이트는 Sites 접근 설정을 `public`으로 구성합니다.
GitHub 저장소는 소스 보관용이며, GitHub에 올리는 것만으로 사이트가 자동 재배포되지는 않습니다.
학생 저장 기능이 있으므로 GitHub Pages 같은 정적 호스팅만으로는 전체 앱을 실행할 수 없습니다.

