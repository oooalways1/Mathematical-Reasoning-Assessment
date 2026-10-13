# 수리력 한걸음

초등학생의 수리력을 진단하고 학생별 결과를 기록하는 수학과 웹앱입니다.

- 웹앱: https://numeracy-diagnosis.smokypixie.chatgpt.site
- GitHub: https://github.com/oooalways1/Mathematical-Reasoning-Assessment

## 학생 사용

1. 선생님에게 웹앱 주소와 개인 참여코드를 받습니다.
2. 웹앱의 참여코드 입력란에 16자리 코드를 입력합니다. 하이픈과 공백은 생략할 수 있습니다.
3. 12문항을 풀고 결과를 제출합니다. 서버가 채점하고 학생별로 저장합니다.
4. 결과 확인 후 **완료하고 접속 종료**를 누릅니다.

학생에게 ChatGPT 계정은 필요하지 않습니다. 참여코드는 해당 학생에게만 전달합니다.
학생 세션은 2시간 유지되며 본인 진단에만 접근할 수 있습니다.

## 교사 사용

1. 웹앱 맨 아래 **관리페이지**를 클릭합니다.
2. 배포 환경에 등록된 교사 ChatGPT 계정으로 로그인합니다.
3. 관리자 비밀번호를 입력합니다.
4. **학생 관리 → 학생 추가**에서 학생을 등록하면 개인 참여코드가 발급됩니다.
5. 참여코드를 복사하거나 CSV로 내려받아 학생별로 배부합니다.
6. **진단 기록**에서 학생별 이력과 영역별 점수를 확인합니다.

공개 방문자에게 전체 학생 명단과 점수는 제공하지 않습니다.
교사 데이터 API는 허용된 교사 계정과 관리자 세션을 함께 확인합니다.
이전 진단은 기존 영역 명칭으로 보존하며, 신규 진단은 다음 네 영역을 사용합니다.

## 진단 영역

| 영역 | 문항 수 |
|---|---:|
| 수와 연산 | 3 |
| 변화와 관계 | 3 |
| 도형과 측정 | 3 |
| 자료와 가능성 | 3 |

총 12문항의 기초 진단입니다. 표준화 검사나 학년별 성취도 검사가 아니며 수업 관찰과 함께 활용합니다.

## 기술 구성

- React / TypeScript / Vinext
- Cloudflare Workers에서 실행되는 API
- Cloudflare D1 / Drizzle: 학생, 참여코드, 진단 결과 저장
- Sites: 호스팅과 배포, 교사 ChatGPT 로그인

Firebase와 Supabase 연동은 사용하지 않습니다. GitHub에는 소스와 DB 스키마만 저장합니다.
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
