# 학생 아이디 로그인과 교사 비밀번호 초기화

## 학생 이용

- 신규 가입은 이름, 학년, 반(선택), 아이디, 비밀번호로 진행합니다.
- 아이디는 영문으로 시작하는 영문·숫자·밑줄 4~20자리이며 대소문자를 구분하지 않습니다.
- 동일 아이디는 Firebase에서 중복 가입을 거절합니다.
- 비밀번호는 최소 6자리이며 D1에 저장하지 않습니다.
- 기존 이메일 계정은 로그인 화면의 아이디 칸에 이메일을 입력하면 계속 사용할 수 있습니다.

Firebase Authentication의 이메일/비밀번호 제공업체는 **켜 둡니다**. 앱 서버가
`math1234`를 `math1234@students.soori-270e0.invalid` 같은 내부 인증용 식별자로 변환합니다.
이 주소는 실제 메일함이 아니며, 학생은 주소를 입력하거나 기억할 필요가 없습니다.
도메인 구입도 필요 없습니다. Firebase 콘솔에는 이 내부 주소가 표시됩니다.
내부 주소에는 비밀번호 재설정·이메일 인증 메일을 보내지 않습니다.
내부 도메인은 출시 후 임의로 변경하면 기존 아이디를 찾을 수 없으므로 유지합니다.

현재 D1 스키마(0000~0006)를 그대로 사용합니다. 이번 변경으로 실행할 ALTER TABLE은 없습니다.

## 교사의 계정 관리

하단 관리페이지 → 학생 관리 → 해당 학생의 **로그인 관리**를 선택합니다.

- 현재 로그인 아이디를 확인할 수 있습니다.
- 새 비밀번호를 두 번 입력하고 관리자 비밀번호를 확인한 뒤 변경합니다.
- 기존 이메일 계정에 새 아이디를 지정할 수도 있습니다. Firebase UID와 학생 ID는
  유지하므로 기존 진단·학습 기록은 유지됩니다. 변경 후에는 새 아이디로 로그인합니다.
- 아이디만 바꾸는 경우에도 새 비밀번호를 함께 지정합니다.
- 새 아이디가 중복이면 Firebase가 변경을 거절합니다.
- 초기화 시 이전 앱 세션은 만료 처리됩니다. 실패한 요청도 학생을 로그아웃시킬 수 있으므로,
  오류가 났다면 현재 로그인 정보로 재로그인한 뒤 다시 진행합니다.
- 아직 가입하지 않은 학생 정보 행은 계정 초기화 대상이 아닙니다.

관리자용 Firebase 권한 설정이 없으면 초기화 기능은 설정 안내만 표시하며,
학생의 일반 아이디 가입·로그인은 웹 API 키만으로 작동합니다.

## Firebase 및 Cloudflare 설정 순서

1. Firebase `soori-270e0` → Authentication → 로그인 방법에서 이메일/비밀번호 사용을 유지합니다.
2. Cloudflare `math-literacy` → 설정 → 런타임 변수 및 시크릿에 기존
   `FIREBASE_API_KEY`, `SESSION_SECRET`, `TEACHER_PASSWORD`를 유지합니다. 모두 Secret으로 보관합니다.
3. 교사 초기화를 활성화하려면 Firebase 프로젝트 설정 → 서비스 계정 → Firebase Admin SDK에서
   서비스 계정 키를 생성합니다. 가능하면 Firebase Authentication 사용자 조회·수정에 필요한
   권한만 부여한 전용 서비스 계정을 사용합니다 (`firebaseauth.users.get`, `firebaseauth.users.update`).
   개인 키 생성은 프로젝트 소유자가 직접 진행합니다.
4. 내려받은 JSON 파일 내용을 Cloudflare의 **새 Secret** `FIREBASE_SERVICE_ACCOUNT_JSON` 값으로 넣습니다.
   프로덕션을 선택하고 저장·배포합니다. 빌드용 변수에 넣는 것으로는 실행 중 사용할 수 없습니다.
5. JSON 개인 키는 채팅이나 GitHub에 올리지 않습니다. 학생에게도 전달하지 않습니다.
6. GitHub `main` 커밋의 Cloudflare 자동 배포 성공을 확인합니다.
7. 새 아이디 가입·로그인, 중복 가입 거절, 교사 로그인 관리에서 현재 아이디 조회와 비밀번호 변경을 확인합니다.

Firebase 콘솔의 일반 '비밀번호 재설정 이메일' 기능은 실제 이메일 주소 계정용입니다.
이메일 없는 학생의 초기화에는 위 관리자 기능/관리자 API를 사용합니다.

## 구현과 운영 확인 범위

- Firebase 관리자 호출은 Cloudflare 서버에서 Web Crypto로 서명한 OAuth 요청으로 처리합니다.
- 관리자 비밀번호 재확인과 교사 세션 확인을 모두 통과해야 계정 수정이 가능합니다.
- 조회/초기화 응답은 캐시되지 않으며, 학생 응답에 Firebase 개인 키나 토큰을 포함하지 않습니다.
- 가입·로그인 시도 제한은 같은 학교 IP의 학생 300명 사용을 고려하여 IP와 계정 단위로 구분합니다.
- DB의 `admin_attempts`에는 인증 시도 제한과 최대 2시간의 학생 세션 취소 기록을 저장합니다.
- 운영 관리자 키가 등록되기 전에는 실제 Firebase 비밀번호 초기화의 성공 여부를 확인할 수 없습니다.

공식 문서:
- https://firebase.google.com/docs/reference/rest/auth/
- https://firebase.google.com/docs/auth/admin/manage-users
- https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update
- https://developers.cloudflare.com/workers/configuration/secrets/
