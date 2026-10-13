"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowRight, BarChart3, BookOpenCheck, Calculator, Check, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Download, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, Plus, Search, Settings2, ShieldCheck, Shapes, TrendingUp, Users, X } from "lucide-react";
import { domains, domainDescriptions, domainScore, hasLegacyDomains, questions } from "@/lib/assessment";

type Student = { id: string; name: string; grade: number; classroom: string; createdAt: string; accessCode?: string; latestScore?: number | null; assessmentCount?: number };
type Result = { id: string; studentId: string; totalScore: number; maxScore: number; domains: Record<string, number>; completedAt: string };
type Screen = "home" | "diagnosis" | "result" | "admin";
const initialStats = { students: 0, assessments: 0, average: 0, growth: 0 };
const domainIcons = [Calculator, TrendingUp, Shapes, BarChart3];
const formattedCode = (code?: string) => code?.match(/.{1,4}/g)?.join("-") ?? "";

function downloadCsv(rows: unknown[][], filename: string) {
  const csvCell = (value: unknown) => {
    const text = String(value);
    const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  const content = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [step, setStep] = useState(0);
  const [savedResult, setSavedResult] = useState<Result | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [newStudent, setNewStudent] = useState({ name: "", grade: "3", classroom: "" });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [role, setRole] = useState<"guest" | "student" | "teacher">("guest");
  const [participationCode, setParticipationCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [teacherAccount, setTeacherAccount] = useState<boolean | null>(null);

  async function loadStudents() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/students", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { students: Student[]; role: "guest" | "student" | "teacher"; stats?: typeof initialStats };
      setStudents(payload.students);
      setRole(payload.role); setAdmin(payload.role === "teacher");
      setStats(payload.stats ?? { ...initialStats, students: payload.students.length });
    } catch { setError("학생 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요."); }
    finally { setLoading(false); }
  }

  async function loadAdmin() {
    setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (response.status === 401) { setAdmin(false); setRole("guest"); setStudents([]); setResults([]); setScreen("home"); setShowLogin(true); void checkTeacherAccount(); return; }
      if (!response.ok) throw new Error();
      const payload = await response.json() as { students: Student[]; assessments: Result[]; stats: typeof initialStats };
      setStudents(payload.students); setResults(payload.assessments); setStats(payload.stats);
    } catch { setError("관리 데이터를 불러오지 못했습니다."); }
  }

  useEffect(() => { void loadStudents(); }, []);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("teacher") === "1") {
      setShowLogin(true); void checkTeacherAccount();
      window.history.replaceState(null, "", "/");
    }
  }, []);
  useEffect(() => {
    if (screen === "admin" && admin) void loadAdmin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, admin]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [screen]);

  const currentQuestion = questions[step];
  const answeredCount = Object.keys(answers).length;
  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.grade} ${student.classroom}`.toLowerCase().includes(searchTerm.toLowerCase()));

  function startDiagnosis(student: Student) {
    setSelected(student); setAnswers({}); setStep(0); setSavedResult(null); setError(""); setScreen("diagnosis");
  }

  async function finishDiagnosis() {
    if (!selected || submitting) return;
    setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/assessments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selected.id, answers }),
      });
      const payload = await response.json() as { result?: Result; error?: string };
      if (!response.ok || !payload.result) throw new Error(payload.error || "결과를 저장하지 못했습니다.");
      setSavedResult(payload.result); setScreen("result"); void loadStudents();
    } catch (e) { setError(e instanceof Error ? e.message : "결과를 저장하지 못했습니다."); }
    finally { setSubmitting(false); }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loggingIn) return;
    setLoginError(""); setLoggingIn(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pin }),
      });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        setLoginError(payload.error || "비밀번호를 확인해 주세요.");
        if (response.status === 403) setTeacherAccount(false);
        return;
      }
      setAdmin(true); setRole("teacher"); setShowLogin(false); setPin(""); setError(""); setScreen("admin");
    } catch { setLoginError("로그인할 수 없습니다. 다시 시도해 주세요."); }
    finally { setLoggingIn(false); }
  }

  async function logout() {
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setAdmin(false); setRole("guest"); setStudents([]); setResults([]); setSelected(null); setSavedResult(null); setStats(initialStats); setScreen("home");
      window.location.assign("/teacher?signout=1");
    } catch { setError("로그아웃하지 못했습니다. 다시 시도해 주세요."); }
  }

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding) return;
    setAdding(true); setAddError("");
    try {
      const response = await fetch("/api/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newStudent, grade: Number(newStudent.grade) }),
      });
      const payload = await response.json() as { student?: Student; error?: string };
      if (!response.ok || !payload.student) throw new Error(payload.error || "학생을 등록하지 못했습니다.");
      setStudents((current) => [payload.student!, ...current]);
      setNewStudent({ name: "", grade: "3", classroom: "" }); setShowAddStudent(false); void loadAdmin();
    } catch (e) { setAddError(e instanceof Error ? e.message : "학생 등록에 실패했습니다."); }
    finally { setAdding(false); }
  }

  function exportCsv() {
    const includeLegacy = results.some((result) => hasLegacyDomains(result.domains));
    const rows = [
      ["이름", "학년", "반", "진단일", "점수", ...domains, ...(includeLegacy ? ["이전 영역: 자료와 문제해결"] : [])],
      ...students.map((student) => {
        const assessment = results.find((item) => item.studentId === student.id);
        return [
          student.name, `${student.grade}학년`, student.classroom,
          assessment ? new Date(assessment.completedAt).toLocaleDateString("ko-KR") : "진단 전",
          assessment ? `${assessment.totalScore}/${assessment.maxScore}` : "",
          ...domains.map((domain) => assessment ? domainScore(assessment.domains, domain) ?? "" : ""),
          ...(includeLegacy ? [assessment?.domains["자료와 문제해결"] ?? ""] : []),
        ];
      }),
    ];
    downloadCsv(rows, "수리력_진단_기록.csv");
  }

  async function checkTeacherAccount() {
    setTeacherAccount(null);
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { teacherAccount: boolean; authenticated: boolean };
      setTeacherAccount(payload.teacherAccount);
      if (payload.authenticated) { setAdmin(true); setRole("teacher"); setShowLogin(false); setScreen("admin"); }
    } catch { setLoginError("교사 계정을 확인하지 못했습니다. 다시 열어 주세요."); }
  }

  async function joinDiagnosis(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (joining) return;
    setJoining(true); setJoinError("");
    try {
      const response = await fetch("/api/student/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: participationCode }) });
      const payload = await response.json() as { student?: Student; error?: string };
      if (!response.ok || !payload.student) throw new Error(payload.error || "참여코드를 확인해 주세요.");
      setRole("student"); setStudents([payload.student]); setParticipationCode(""); startDiagnosis(payload.student);
    } catch (error) { setJoinError(error instanceof Error ? error.message : "접속하지 못했습니다."); }
    finally { setJoining(false); }
  }

  async function leaveStudent() {
    try {
      const response = await fetch("/api/student/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setRole("guest"); setStudents([]); setSelected(null); setSavedResult(null); setAnswers({}); setScreen("home");
    } catch { setError("종료하지 못했습니다. 다시 시도해 주세요."); }
  }

  function openAdmin() {
    if (admin) setScreen("admin");
    else { setPin(""); setLoginError(""); setShowLogin(true); void checkTeacherAccount(); }
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div className="container header-inner">
          <button onClick={() => setScreen("home")} className="brand" aria-label="수리력 한걸음 홈">
            <span className="brand-icon"><BookOpenCheck size={25}/></span>
            <span>수리력 한걸음</span>
          </button>
          {screen === "home" ? <nav aria-label="주 메뉴" className="header-nav">
            <a href="#guide">진단 안내</a><a href="#students">{role === "teacher" ? "학생 목록" : "진단 시작"}</a>
          </nav> : <button className="button button-quiet" onClick={() => setScreen("home")}><ChevronLeft size={18}/> 진단 홈</button>}
        </div>
      </header>

      {screen === "home" && <div className="container home-content">
        <section className="hero" aria-labelledby="home-title">
          <div className="hero-icon"><BookOpenCheck size={40} strokeWidth={1.8}/></div>
          <p className="eyebrow">수학을 이해하는 힘, 함께 자라요</p>
          <h1 id="home-title">초등학생 수리력 진단 시스템</h1>
          <p className="hero-description">네 가지 수학 영역을 차근차근 살펴보고,<br className="desktop-break"/> 학생 한 명 한 명의 다음 배움을 함께 찾아갑니다.</p>
        </section>

        <section id="guide" className="domain-section" aria-labelledby="domain-title">
          <div className="section-heading">
            <div><p className="eyebrow">수리력 진단 영역</p><h2 id="domain-title">네 가지 영역으로 살펴봐요</h2></div>
            <span className="section-note">영역별 3문항 · 총 12문항</span>
          </div>
          <div className="domain-grid">
            {domains.map((domain, index) => {
              const Icon = domainIcons[index];
              return <article key={domain} className={`domain-card tone-${index}`}>
                <span className="domain-icon"><Icon size={28} strokeWidth={1.8}/></span>
                <h3>{domain}</h3><p>{domainDescriptions[domain]}</p>
              </article>;
            })}
          </div>
        </section>

        <section className="start-card" aria-labelledby="start-title">
          <div className="start-symbol"><GraduationCap size={30}/></div>
          <h2 id="start-title">우리의 배움, 한 걸음부터</h2>
          <p>선생님이 알려주신 참여코드로 시작하세요.<br/>완료한 결과는 나의 성장 기록으로 남아요.</p>
          <a className="button button-primary button-large" href="#students">진단 시작하기 <ArrowRight size={21}/></a>
          <span className="start-note"><Check size={16}/> 진단 완료 후 결과 자동 저장</span>
        </section>

        <div className="home-stats" aria-label="진단 현황">
          <div><strong>{role === "teacher" ? stats.students : 12}<small>{role === "teacher" ? "명" : "문항"}</small></strong><span>{role === "teacher" ? "등록 학생" : "차근차근 풀어요"}</span></div>
          <div><strong>{role === "teacher" ? stats.assessments : "개인별"}<small>{role === "teacher" ? "회" : ""}</small></strong><span>{role === "teacher" ? "누적 진단" : "결과 자동 저장"}</span></div>
          <div><strong>4<small>개 영역</small></strong><span>수와 연산 · 변화와 관계 · 도형과 측정 · 자료와 가능성</span></div>
        </div>

        <section id="students" className="student-section" aria-labelledby="students-title">
          <div className="section-heading">
            <div><p className="eyebrow">함께 성장하는 우리 반</p><h2 id="students-title">{role === "teacher" ? "학생을 선택해 주세요" : role === "student" ? "나의 진단" : "참여코드를 입력해 주세요"}</h2></div>
            {role === "teacher" && <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="이름이나 학급으로 검색"/>}
            {role === "student" && <button className="button button-outline" onClick={() => void leaveStudent()}><LogOut size={18}/> 내 접속 종료</button>}
          </div>
          {error && <p role="alert" className="alert">{error}</p>}
          {role === "guest" && !loading ? <div className="panel join-panel">
            <span className="modal-icon"><GraduationCap size={28}/></span>
            <p>선생님이 나누어 주신 나만의 참여코드 16자리를 입력해요.</p>
            <form onSubmit={(event) => void joinDiagnosis(event)} className="join-form">
              <label className="sr-only" htmlFor="participation-code">학생 참여코드</label>
              <input id="participation-code" required maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false} value={participationCode} onChange={(event) => setParticipationCode(event.target.value)} placeholder="예: A1B2-C3D4-E5F6-7890"/>
              <button className="button button-primary" disabled={joining}>{joining ? "확인 중…" : "진단 시작"} <ArrowRight size={18}/></button>
            </form>
            {joinError && <p className="alert" role="alert">{joinError}</p>}
            <small>참여코드가 없으면 선생님께 요청해 주세요. 다른 친구의 코드는 사용하지 않아요.</small>
          </div> : <div className="panel roster-panel">
            <div className="roster-row table-heading"><span>학생</span><span className="desktop-cell">학년·반</span><span className="desktop-cell">진단 기록</span><span>최근 점수</span><span className="sr-only">진단 시작</span></div>
            {loading ? <div className="empty-state" role="status">학생 정보를 불러오는 중이에요…</div> :
              filteredStudents.length === 0 ? <div className="empty-state">
                <span className="empty-icon"><GraduationCap size={30}/></span>
                <h3>{students.length ? "검색 결과가 없어요" : "아직 등록된 학생이 없어요"}</h3>
                <p>{students.length ? "다른 이름이나 학급으로 검색해 주세요." : "페이지 맨 아래 관리페이지에서 학생을 등록해 주세요."}</p>
              </div> : filteredStudents.map((student) => <div key={student.id} className="roster-row">
                <div className="student-name"><span className="avatar">{student.name.slice(-1)}</span><div><strong>{student.name}</strong><small className="mobile-cell">{student.grade}학년 {student.classroom}</small></div></div>
                <span className="desktop-cell muted">{student.grade}학년 {student.classroom}</span>
                <span className="desktop-cell muted">{student.assessmentCount ? `${student.assessmentCount}회` : "진단 전"}</span>
                <span className={student.latestScore == null ? "muted" : "score-text"}>{student.latestScore == null ? "진단 전" : `${student.latestScore}점`}</span>
                <button className="button button-soft" onClick={() => startDiagnosis(student)}>진단 <ArrowRight size={17}/></button>
              </div>)}
          </div>}
        </section>

        <aside className="usage-note"><CircleHelp size={23}/><div><h3>진단 결과는 이렇게 활용해요</h3><p>점수와 함께 학생의 풀이 과정을 살펴보세요. 수업 관찰을 더하면 다음 학습에 필요한 도움을 찾을 수 있어요.</p></div></aside>
      </div>}

      {screen === "diagnosis" && currentQuestion && <section className="container narrow-content">
        <button className="back-button" onClick={() => setScreen("home")} disabled={submitting}><ChevronLeft size={19}/> 진단 홈으로</button>
        <div className="panel assessment-panel">
          <div className="question-meta"><span className="badge">{selected?.name} · {selected?.grade}학년</span><span className="muted">{step + 1} / {questions.length} 문항</span></div>
          <div className="progress-track" role="progressbar" aria-label="진단 진행률" aria-valuenow={step + 1} aria-valuemin={0} aria-valuemax={questions.length}><div style={{ width: `${(step + 1) / questions.length * 100}%` }}/></div>
          <p className="eyebrow question-domain">{currentQuestion.domain}</p>
          <h1 className="question-title">{currentQuestion.prompt}</h1>
          <div className="answer-list" role="group" aria-label="답변 선택">
            {currentQuestion.choices.map((choice, index) => <button key={choice} disabled={submitting} aria-pressed={answers[currentQuestion.id] === index}
              onClick={() => setAnswers((previous) => ({ ...previous, [currentQuestion.id]: index }))}
              className={`answer-option ${answers[currentQuestion.id] === index ? "selected" : ""}`}>
              <span className="answer-letter">{String.fromCharCode(65 + index)}</span><span>{choice}</span>
              {answers[currentQuestion.id] === index && <Check className="answer-check" size={22}/>}
            </button>)}
          </div>
          {answers[currentQuestion.id] !== undefined && <p className="hint"><span>생각 열기</span> {currentQuestion.hint}</p>}
          {error && <p role="alert" className="alert">{error}</p>}
          <div className="question-actions">
            <button className="button button-quiet" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || submitting}><ChevronLeft size={18}/> 이전</button>
            {step < questions.length - 1 ?
              <button className="button button-primary" disabled={answers[currentQuestion.id] === undefined} onClick={() => setStep((value) => value + 1)}>다음 문항 <ChevronRight size={19}/></button> :
              <button className="button button-primary" disabled={answeredCount !== questions.length || submitting} onClick={() => void finishDiagnosis()}>{submitting ? "결과 저장 중…" : "진단 결과 보기"} <ArrowRight size={19}/></button>}
          </div>
          <p className="form-note">{answeredCount} / {questions.length}개 답변 완료 · 제출하면 진단 기록이 저장됩니다.</p>
        </div>
      </section>}

      {screen === "result" && savedResult && <section className="container narrow-content">
        <button className="back-button" onClick={() => setScreen("home")}><ChevronLeft size={19}/> 진단 홈으로</button>
        <div className="panel assessment-panel">
          <div className="result-heading"><div><span className="badge"><Check size={16}/> 진단 완료 · {selected?.name}</span><h1>수리력 진단 결과</h1><p className="muted">영역별 강점과 다음 연습 방향을 살펴보세요.</p></div><div className="score-circle"><strong>{savedResult.totalScore}<small>점</small></strong><span>100점 만점</span></div></div>
          <div className="domain-bars">{domains.map((domain, index) => <DomainBar key={domain} domain={domain} value={savedResult.domains[domain]} index={index}/>)}</div>
          <div className="result-notes"><div><h3>함께 살펴볼 점</h3><p>정답과 오답을 함께 보며 어떤 생각으로 문제를 풀었는지 이야기해 보세요.</p></div><div><h3>다음 활동 제안</h3><p>틀린 문항은 힌트를 활용해 다시 설명하고, 구체물을 사용하며 개념을 연결해 주세요.</p></div></div>
          <div className="button-row"><button className="button button-outline" onClick={() => selected && startDiagnosis(selected)}>다시 진단하기</button>{role === "student" ? <button className="button button-primary" onClick={() => void leaveStudent()}>완료하고 접속 종료 <LogOut size={18}/></button> : <button className="button button-primary" onClick={() => setScreen("home")}>진단 홈으로 <ArrowRight size={18}/></button>}</div>
        </div>
      </section>}

      {screen === "admin" && admin && <AdminPanel students={students} results={results} stats={stats} error={error}
        onAdd={() => { setAddError(""); setShowAddStudent(true); }} onExport={exportCsv} onLogout={() => void logout()}
        onRefresh={() => void loadAdmin()} onDiagnose={startDiagnosis}/>}

      <footer className="site-footer">
        <div className="container">
          <div className="footer-info"><div className="footer-brand"><BookOpenCheck size={21}/><strong>수리력 한걸음</strong></div><p>수학적 사고의 성장을 함께 기록합니다.</p><small>진단 결과는 수업 관찰과 함께 활용하는 학습 지원 자료입니다.</small></div>
          <nav className="footer-nav" aria-label="교사 관리"><button className={`admin-tab ${screen === "admin" ? "active" : ""}`} onClick={openAdmin}><Settings2 size={19}/> 관리페이지</button></nav>
        </div>
      </footer>

      {showLogin && <Modal title="교사 관리페이지" onClose={() => { setShowLogin(false); setPin(""); }}>
        <span className="modal-icon"><LockKeyhole size={27}/></span><h2 id="modal-title">교사 관리페이지</h2>
        {teacherAccount === null ? <p className="muted" role="status">교사 계정을 확인하고 있어요.</p> : !teacherAccount ? <div className="form-stack"><p className="muted">등록된 교사 ChatGPT 계정으로 로그인한 다음 관리자 비밀번호를 입력해 주세요.</p><a href="/teacher" target="_top" className="button button-primary">교사 계정으로 로그인 <ArrowRight size={19}/></a><a href="/teacher?signout=1" target="_top" className="text-button">현재 계정에서 로그아웃</a></div> : <><p className="muted">비밀번호를 입력하고 학생과 진단 기록을 관리하세요.</p><form onSubmit={(event) => void login(event)} className="form-stack">
          <label htmlFor="teacher-pin">비밀번호<input id="teacher-pin" type="password" inputMode="numeric" required autoComplete="current-password" autoFocus value={pin} onChange={(event) => setPin(event.target.value)} placeholder="비밀번호 입력"/></label>
          <button className="button button-primary button-block" disabled={loggingIn}>{loggingIn ? "확인 중…" : "관리페이지 들어가기"} <ArrowRight size={19}/></button>
        </form></>}
        {loginError && <p role="alert" className="alert">{loginError}</p>}
      </Modal>}

      {showAddStudent && <Modal title="학생 등록" onClose={() => setShowAddStudent(false)}>
        <span className="modal-icon"><GraduationCap size={28}/></span><h2 id="modal-title">학생 등록</h2><p className="muted">진단할 학생의 기본 정보를 입력해 주세요.</p>
        <form onSubmit={(event) => void addStudent(event)} className="form-stack">
          <label>학생 이름<input required maxLength={40} autoFocus value={newStudent.name} onChange={(event) => setNewStudent((student) => ({ ...student, name: event.target.value }))} placeholder="예: 김하늘"/></label>
          <div className="form-columns"><label>학년<select value={newStudent.grade} onChange={(event) => setNewStudent((student) => ({ ...student, grade: event.target.value }))}>{[1,2,3,4,5,6].map((grade) => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><label>반<input maxLength={30} value={newStudent.classroom} onChange={(event) => setNewStudent((student) => ({ ...student, classroom: event.target.value }))} placeholder="예: 2반"/></label></div>
          {addError && <p role="alert" className="alert">{addError}</p>}
          <div className="button-row align-end"><button type="button" className="button button-quiet" onClick={() => setShowAddStudent(false)}>취소</button><button className="button button-primary" disabled={adding}><Plus size={19}/>{adding ? "등록 중…" : "학생 등록"}</button></div>
        </form>
      </Modal>}
    </main>
  );
}

function SearchInput({ value, onChange, placeholder = "학생 검색" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="search-field"><Search size={20}/><span className="sr-only">{placeholder}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder}/></label>;
}

function Modal({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose} onClick={(event) => {
    if (event.target === event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }
  }}><button type="button" className="modal-close" onClick={onClose} aria-label="닫기"><X size={23}/></button>{children}</dialog>;
}

function DomainBar({ domain, value, index }: { domain: string; value?: number; index: number }) {
  return <div className={`domain-bar tone-${index}`}><div className="domain-bar-label"><span>{domain}</span><strong>{value === undefined ? "진단 전" : `${value}%`}</strong></div><div className="domain-track"><div style={{ width: `${value ?? 0}%` }}/></div></div>;
}

function StatCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="panel stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value}</strong><p>{note}</p></div>;
}

function AdminPanel({ students, results, stats, error, onAdd, onExport, onLogout, onRefresh, onDiagnose }: {
  students: Student[]; results: Result[]; stats: typeof initialStats; error: string;
  onAdd: () => void; onExport: () => void; onLogout: () => void; onRefresh: () => void; onDiagnose: (student: Student) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"overview" | "students" | "records">("overview");
  const [selectedId, setSelectedId] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  function exportCodes() {
    downloadCsv([["이름", "학년", "반", "학생 참여코드"], ...matched.map((student) => [student.name, student.grade, student.classroom, formattedCode(student.accessCode)])], "학생_참여코드.csv");
  }
  async function copyCode(code: string) {
    try { await navigator.clipboard.writeText(formattedCode(code)); setCopyStatus("참여코드를 복사했습니다."); }
    catch { setCopyStatus("참여코드 글자를 선택해 직접 복사해 주세요."); }
  }
  const matched = students.filter((student) => `${student.name} ${student.classroom} ${student.grade}`.includes(query));
  const visibleResults = selectedId ? results.filter((result) => result.studentId === selectedId) : results;
  const hasLegacy = results.some((result) => hasLegacyDomains(result.domains));
  const areaAverage = domains.map((domain) => {
    const scores = results.map((result) => domainScore(result.domains, domain)).filter((value): value is number => value !== undefined);
    return { domain, value: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : undefined };
  });

  return <div className="container admin-content">
    <div className="section-heading admin-heading">
      <div><p className="eyebrow"><LayoutDashboard size={18}/> 교사를 위한 공간</p><h1>관리 대시보드</h1><p className="muted">학생 정보와 차곡차곡 쌓인 진단 결과를 살펴보세요.</p></div>
      <div className="button-row"><button className="button button-outline" onClick={onRefresh}>새로고침</button><button className="button button-outline" onClick={onLogout}><LogOut size={18}/> 로그아웃</button></div>
    </div>
    {error && <p role="alert" className="alert">{error}</p>}
    <nav className="admin-tabs" aria-label="관리 메뉴">{([["overview", "한눈에 보기"], ["students", "학생 관리"], ["records", "진단 기록"]] as const).map(([id, label]) =>
      <button key={id} aria-current={tab === id ? "page" : undefined} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}</button>)}</nav>

    {tab === "overview" && <>
      <div className="stat-grid"><StatCard icon={<Users size={24}/>} label="등록 학생" value={`${stats.students}명`} note="전체 학급"/><StatCard icon={<ClipboardList size={24}/>} label="누적 진단" value={`${stats.assessments}회`} note="저장된 진단 기록"/><StatCard icon={<Activity size={24}/>} label="평균 점수" value={`${stats.average}점`} note="누적 진단 기준"/></div>
      <div className="dashboard-grid">
        <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>영역별 학급 평균</h2><p>누적 진단 결과 기준</p></div><BarChart3 size={24}/></div><div className="domain-bars">{areaAverage.map(({ domain, value }, index) => <DomainBar key={domain} domain={domain} value={value} index={index}/>)}</div>{hasLegacy && <p className="form-note legacy-note">자료와 가능성은 새 영역으로 실시한 진단만 반영합니다. 이전 영역의 점수는 진단 기록에서 확인하세요.</p>}</section>
        <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>최근 진단 기록</h2><p>최근 결과부터 표시해요</p></div><button className="text-button" onClick={() => setTab("records")}>전체 보기 <ArrowRight size={17}/></button></div>
          {results.length ? <div className="recent-list">{results.slice(0, 5).map((result) => {
            const student = students.find((item) => item.id === result.studentId);
            return <div key={result.id}><div><strong>{student?.name ?? "학생"}</strong><p>{student?.grade}학년 · {new Date(result.completedAt).toLocaleDateString("ko-KR")}</p></div><span className="badge">{result.totalScore}점</span></div>;
          })}</div> : <div className="empty-state"><ClipboardList size={30}/><p>아직 진단 기록이 없어요.</p></div>}
        </section>
      </div>
      <section className="admin-callout"><div><h2>학생의 다음 배움을 준비해요</h2><p>학생을 등록하고, 진단을 시작해 보세요.</p></div><button className="button button-primary" onClick={() => setTab("students")}>학생 관리 <ArrowRight size={19}/></button></section>
    </>}

    {tab === "students" && <section className="panel">
      <div className="panel-toolbar"><div><h2>학생 목록</h2><p className="muted">참여코드는 해당 학생에게만 알려 주세요.</p></div><div className="toolbar-controls"><SearchInput value={query} onChange={setQuery}/><button className="button button-outline" onClick={exportCodes}><Download size={18}/> 참여코드</button><button className="button button-primary" onClick={onAdd}><Plus size={19}/> 학생 추가</button></div></div>
      {copyStatus && <p className="copy-status" role="status">{copyStatus}</p>}
      <div className="table-scroll"><table className="data-table"><thead><tr><th>이름</th><th>학년·반</th><th>참여코드</th><th>진단 횟수</th><th><span className="sr-only">진단</span></th></tr></thead><tbody>
        {matched.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td><td>{student.grade}학년 {student.classroom}</td><td><code className="access-code">{formattedCode(student.accessCode)}</code>{student.accessCode && <button className="text-button code-copy" onClick={() => void copyCode(student.accessCode!)}>복사</button>}</td><td>{student.assessmentCount ?? 0}회</td><td><button className="button button-soft" onClick={() => onDiagnose(student)}>진단 시작 <ArrowRight size={17}/></button></td></tr>)}
      </tbody></table></div>
      {!matched.length && <div className="empty-state"><Users size={32}/><h3>{students.length ? "검색 결과가 없어요" : "첫 학생을 등록해 주세요"}</h3><p>{students.length ? "다른 이름으로 검색해 주세요." : "위의 학생 추가 버튼으로 시작할 수 있어요."}</p></div>}
    </section>}

    {tab === "records" && <section className="panel">
      <div className="panel-toolbar"><div><h2>진단 기록</h2><p className="muted">학생별 결과를 조회하고 내려받아요.</p></div><div className="toolbar-controls"><select aria-label="학생 선택" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">전체 학생</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.grade}학년 {student.classroom}</option>)}</select><button className="button button-outline" onClick={onExport}><Download size={19}/> CSV 다운로드</button></div></div>
      <div className="table-scroll"><table className="data-table records-table"><thead><tr><th>학생</th><th>진단일</th><th>영역별 점수</th><th>총점</th></tr></thead><tbody>
        {visibleResults.map((result) => {
          const student = students.find((item) => item.id === result.studentId);
          const legacy = hasLegacyDomains(result.domains);
          return <tr key={result.id}><td><strong>{student?.name ?? "학생"}</strong><small>{student?.grade}학년 {student?.classroom}</small></td><td>{new Date(result.completedAt).toLocaleDateString("ko-KR")}<small>{new Date(result.completedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</small></td><td><div className="record-domains">{(legacy ? Object.entries(result.domains) : domains.map((domain) => [domain, result.domains[domain]] as const)).map(([domain, score]) => <span key={domain}>{domain}<b>{score}%</b></span>)}</div>{legacy && <small>이전 영역 기준 진단</small>}</td><td><strong className="score-text">{result.totalScore}점</strong></td></tr>;
        })}
      </tbody></table></div>
      {!visibleResults.length && <div className="empty-state"><ClipboardList size={32}/><p>조회할 진단 기록이 없어요.</p></div>}
    </section>}
    <p className="admin-session-note"><ShieldCheck size={18}/> 공용 기기에서는 사용 후 로그아웃해 주세요.</p>
  </div>;
}
