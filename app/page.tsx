"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowRight, BarChart3, BookOpenCheck, ClipboardList, Download, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, Plus, Search, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { domains, domainScore, hasLegacyDomains } from "@/lib/assessment";
import { GRADES, isGrade, type Grade } from "@/lib/diagnosis-blueprint";
import StudentPortal, { type PortalPage } from "./student-portal";
import type { StudentProfile } from '@/lib/diagnosis-model';
import AnswerKeyEditor from './answer-key-editor';
import LearningJourney from './learning-journey';

type Student = { id: string; name: string; grade: number; classroom: string; createdAt: string; latestScore?: number | null; assessmentCount?: number };
type Result = { id: string; studentId: string; totalScore: number; maxScore: number; domains: Record<string, number>; completedAt: string };
const initialStats = { students: 0, assessments: 0, average: 0, growth: 0 };

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
  const [page, setPage] = useState<PortalPage>("home");
  const [initialGrade, setInitialGrade] = useState<Grade>(1);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [error, setError] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: "", grade: "1", classroom: "" });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  function navigate(next: PortalPage) { setShowAdmin(false); setPage(next); setError(""); }
  function authenticated(student: StudentProfile) { setStudentProfile(student); setInitialGrade(student.grade); }
  async function studentLogout() {
    const response = await fetch('/api/student/session', { method: 'DELETE' });
    if (response.ok) { setStudentProfile(null); setInitialGrade(1); navigate('home'); }
  }
  useEffect(() => {
    let active = true;
    fetch('/api/student/session', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as { student: StudentProfile | null };
      if (active && data.student && isGrade(data.student.grade)) authenticated(data.student);
    }).catch(() => {}).finally(() => { if (active) setSessionLoading(false); });
    return () => { active = false; };
  }, []);
  async function loadAdmin() {
    setError("");
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (response.status === 401) { setAdmin(false); setStudents([]); setResults([]); setShowAdmin(false); setShowLogin(true); void checkTeacherAccount(); return; }
      if (!response.ok) throw new Error();
      const payload = await response.json() as { students: Student[]; assessments: Result[]; stats: typeof initialStats };
      setStudents(payload.students); setResults(payload.assessments); setStats(payload.stats);
    } catch { setError("관리 데이터를 불러오지 못했습니다."); }
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("teacher") === "1") {
      setShowLogin(true); void checkTeacherAccount();
      window.history.replaceState(null, "", "/");
    }
  }, []);
  useEffect(() => {
    if (showAdmin && admin) void loadAdmin();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdmin, admin]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [page, showAdmin]);

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
        return;
      }
      setAdmin(true); setShowLogin(false); setPin(""); setError(""); setShowAdmin(true);
    } catch { setLoginError("로그인할 수 없습니다. 다시 시도해 주세요."); }
    finally { setLoggingIn(false); }
  }

  async function logout() {
    try {
      const response = await fetch("/api/admin/session", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setAdmin(false); setStudents([]); setResults([]); setStats(initialStats); navigate("home");
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
      setAdminNotice(`${payload.student.name} 학생 정보를 등록했습니다. 학생은 이메일로 회원가입할 수 있습니다.`);
      setNewStudent({ name: "", grade: "1", classroom: "" }); setShowAddStudent(false); void loadAdmin();
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
    try {
      const response = await fetch("/api/admin/session", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const payload = await response.json() as { authenticated: boolean };
      if (payload.authenticated) { setAdmin(true); setShowLogin(false); setShowAdmin(true); }
    } catch { setLoginError("관리페이지 연결을 확인하지 못했습니다. 다시 열어 주세요."); }
  }

  function openAdmin() {
    if (admin) setShowAdmin(true);
    else { setPin(""); setLoginError(""); setShowLogin(true); void checkTeacherAccount(); }
  }

  return <main className="app-shell">
    <header className="site-header"><div className="container header-inner">
      <button onClick={() => navigate("home")} className="brand" aria-label="수리력 한걸음 홈"><span className="brand-icon"><BookOpenCheck size={25}/></span><span>수리력 한걸음</span></button>
      <nav className="portal-nav" aria-label="주 메뉴">{([["home", "홈"], ["results", "나의 학습"]] as const).map(([id, label]) => <button key={id} aria-current={!showAdmin && page === id ? "page" : undefined} onClick={() => navigate(id)}>{label}</button>)}</nav>
      <div className="header-account">{studentProfile ? <><span className="signed-student">{studentProfile.name} · {studentProfile.grade}학년</span><button className="header-login" onClick={() => void studentLogout()}>로그아웃</button></> : <><button className="header-login" aria-current={!showAdmin && page === "login" ? "page" : undefined} onClick={() => navigate("login")}>로그인</button><button className="button button-primary" aria-current={!showAdmin && page === "signup" ? "page" : undefined} onClick={() => navigate("signup")}>회원가입</button></>}</div>
    </div></header>

    {!showAdmin && <StudentPortal page={page} initialGrade={initialGrade} onNavigate={navigate} onGradeChange={setInitialGrade} onAuthenticated={authenticated} student={studentProfile} sessionLoading={sessionLoading}/>}
    {showAdmin && admin && <>{adminNotice && <p className="container admin-notice" role="status">{adminNotice}</p>}<AdminPanel students={students} results={results} stats={stats} error={error}
      onAdd={() => { setAddError(""); setShowAddStudent(true); }} onExport={exportCsv} onLogout={() => void logout()}
      onRefresh={() => void loadAdmin()}/></>}

    <footer className="site-footer"><div className="container">
      <div className="footer-info"><div className="footer-brand"><BookOpenCheck size={21}/><strong>수리력 한걸음</strong></div><p>수학을 이해하는 힘, 함께 자라요.</p><small>초등 1·2·3학년 · 학년별 총 20문항</small></div>
      <nav className="footer-nav" aria-label="교사 관리"><button className={`admin-tab ${showAdmin ? "active" : ""}`} onClick={openAdmin}><Settings2 size={19}/> 관리페이지</button></nav>
    </div></footer>

    {showLogin && <Modal title="교사 관리페이지" onClose={() => { setShowLogin(false); setPin(""); }}>
      <span className="modal-icon"><LockKeyhole size={27}/></span><h2>교사 관리페이지</h2>
      <p className="muted">관리자 비밀번호를 입력하면 대시보드로 들어갈 수 있어요.</p><form onSubmit={(event) => void login(event)} className="form-stack">
        <label htmlFor="teacher-pin">비밀번호<input id="teacher-pin" type="password" inputMode="numeric" required autoComplete="current-password" autoFocus value={pin} onChange={(event) => setPin(event.target.value)} placeholder="비밀번호 입력"/></label>
        <button className="button button-primary button-block" disabled={loggingIn}>{loggingIn ? "확인 중…" : "관리페이지 들어가기"} <ArrowRight size={19}/></button>
      </form>
      {loginError && <p role="alert" className="alert">{loginError}</p>}
    </Modal>}

    {showAddStudent && <Modal title="학생 정보 등록" onClose={() => setShowAddStudent(false)}>
      <span className="modal-icon"><GraduationCap size={28}/></span><h2>학생 정보 등록</h2><p className="muted">교사가 관리할 학생 정보를 등록해요. 학생은 이메일로 회원가입할 수 있습니다.</p>
      <form onSubmit={(event) => void addStudent(event)} className="form-stack">
        <label>학생 이름<input required maxLength={40} autoFocus value={newStudent.name} onChange={(event) => setNewStudent((student) => ({ ...student, name: event.target.value }))} placeholder="예: 김하늘"/></label>
        <div className="form-columns"><label>학년<select value={newStudent.grade} onChange={(event) => setNewStudent((student) => ({ ...student, grade: event.target.value }))}>{GRADES.map((grade) => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><label>반<input maxLength={30} value={newStudent.classroom} onChange={(event) => setNewStudent((student) => ({ ...student, classroom: event.target.value }))} placeholder="예: 2반"/></label></div>
        {addError && <p role="alert" className="alert">{addError}</p>}
        <div className="button-row align-end"><button type="button" className="button button-quiet" onClick={() => setShowAddStudent(false)}>취소</button><button className="button button-primary" disabled={adding}><Plus size={19}/>{adding ? "등록 중…" : "학생 정보 등록"}</button></div>
      </form>
    </Modal>}
  </main>;
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
  return <div className={`domain-bar tone-${index}`}><div className="domain-bar-label"><span>{domain}</span><strong>{value === undefined ? "진단 전" : `${value}%`}</strong></div><div className="domain-track"><div style={{ width: `${value ?? 0}%` …11333 tokens truncated…v></div>
        <div className="art-caption"><span className="caption-dot"/> 오늘의 작은 발견이 내일의 자신감으로</div>
      </div>
    </section>

    <section className="portal-menu" aria-labelledby="menu-title">
      <div className="section-heading"><div><p className="eyebrow">나의 수리력 한걸음</p><h2 id="menu-title">진단에서 다음 배움까지</h2></div><p className="section-note">진단 후 ‘나의 학습’에서 이어 가요.</p></div>
      <div className="learning-feature-grid">{[['진단', '우리 학년 20문항의 답을 입력하고 결과를 저장해요.', ClipboardList], ['분석', '내 답과 정답을 비교하고, 다시 배울 내용을 알아봐요.', ChartNoAxesCombined], ['학습 지원', '오답과 연결된 연습 문제를 풀고 풀이를 확인해요.', BookOpenCheck], ['학습 관리', '연습 기록과 성장 추이를 살펴보고 리포트를 만들어요.', TrendingUp]].map(([title,description,Icon], index) => { const FeatureIcon = Icon as typeof ClipboardList; return <article className={`panel learning-feature tone-${index}`} key={String(title)}><span className="domain-icon"><FeatureIcon size={26}/></span><h3>{String(title)}</h3><p>{String(description)}</p></article>; })}</div>
    </section>

    <section id="guide" className="portal-guide" aria-labelledby="guide-title">
      <div className="section-heading"><div><p className="eyebrow">진단 안내</p><h2 id="guide-title">어떤 배움을 살펴보나요?</h2></div></div>
      <p className="guide-description">수리력을 이루는 네 가지 영역이에요. 학년에 따라 진단에서 다루는 내용은 달라요.</p>
      <div className="domain-grid">{domains.map((domain, index) => { const Icon = domainIcons[index]; return <article key={domain} className={`domain-card tone-${index}`}><span className="domain-icon"><Icon size={26}/></span><h3>{domain}</h3><p>{domainDescriptions[domain]}</p></article>; })}</div>
    </section>

    <section className="how-to" aria-labelledby="how-title"><div><p className="eyebrow">이용 순서</p><h2 id="how-title">시작은 간단해요.</h2><p>차근차근, 나의 속도로 함께해요.</p></div><ol><li><span>01</span><div><h3>이메일로 회원가입</h3><p>이름과 학년을 입력하고 내 계정을 만들어요.</p></div></li><li><span>02</span><div><h3>우리 학년 진단하기</h3><p>검사지를 보며 총 {QUESTION_COUNT}문항의 답을 입력해요.</p></div></li><li><span>03</span><div><h3>나의 결과 살펴보기</h3><p>나의 강점을 찾고 다음 배움을 준비해요.</p></div></li></ol></section>
    <aside className="learning-note"><CircleHelp size={23}/><p>진단은 배움을 돕기 위한 첫걸음이에요.<br/>점수와 함께 풀이 과정을 살펴보며, 나에게 필요한 연습을 찾아보세요.</p></aside>
  </div>;
}

function AccountForm({ mode, onNavigate, onGradeChange, onAuthenticated }: Navigation & { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting) return;
    setSubmitting(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const grade = Number(form.get("grade"));
    const classroom = String(form.get("classroom") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirm") ?? "");
    if (signup && (!name || ![1, 2, 3].includes(grade))) { setError("이름과 학년을 입력해 주세요."); setSubmitting(false); return; }
    if (!email || !password) { setError("이메일과 비밀번호를 입력해 주세요."); setSubmitting(false); return; }
    if (signup && password.length < 6) { setError("비밀번호는 최소 6자리로 입력해 주세요."); setSubmitting(false); return; }
    if (signup && password !== confirmation) { setError("비밀번호가 서로 다릅니다."); setSubmitting(false); return; }
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, grade, classroom, email, password } : { email, password }) });
      const payload = await response.json() as { student?: StudentProfile; error?: string };
      if (!response.ok || !payload.student) throw new Error(payload.error || "계정 요청을 처리하지 못했습니다.");
      const studentGrade = Number(payload.student.grade);
      if ([1, 2, 3].includes(studentGrade)) onGradeChange?.(studentGrade as Grade);
      onAuthenticated?.(payload.student);
      setNotice(signup ? "회원가입이 완료됐어요. 진단을 시작해 주세요." : "로그인했어요. 진단을 시작해 주세요.");
      window.setTimeout(() => onNavigate("diagnosis"), 700);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "계정 요청을 처리하지 못했습니다."); }
    finally { setSubmitting(false); }
  }
  return <section className="container account-layout">
    <div className="account-story"><p className="eyebrow">수리력 한걸음 · 내 계정</p><h1>{signup ? <>나의 배움이<br/>시작되는 곳.</> : <>다시 만나서<br/>반가워요.</>}</h1><p>이메일 계정으로 진단에 참여하고,<br/>나의 성장 기록을 이어 갈 수 있어요.</p><div className="account-points"><span><Check size={19}/> 나의 학년에 맞는 진단</span><span><Check size={19}/> 나만의 결과와 학습 기록</span><span><Check size={19}/> 이메일로 간편하게 로그인</span></div><button className="text-button" onClick={() => onNavigate("home")}><ChevronLeft size={18}/> 홈으로 돌아가기</button></div>
    <div className="panel account-card">
      <nav className="account-tabs" aria-label="학생 계정 메뉴"><button aria-current={!signup ? "page" : undefined} className={!signup ? "active" : ""} onClick={() => onNavigate("login")}>로그인</button><button aria-current={signup ? "page" : undefined} className={signup ? "active" : ""} onClick={() => onNavigate("signup")}>회원가입</button></nav>
      <h2>{signup ? "학생 회원가입" : "학생 로그인"}</h2><p className="muted">{signup ? "이메일로 나만의 배움 공간을 만들어요." : "가입한 이메일과 비밀번호로 시작해요."}</p>
      <div id="account-readiness" className="readiness-note" role="status"><LockKeyhole size={19}/><p>{signup ? "새 이메일 계정을 만들어 시작해요." : "가입한 이메일 계정으로 로그인해요."}<br/><small>비밀번호는 안전한 인증 서비스로 보호합니다.</small></p></div>
      <form className="form-stack" onSubmit={handleSubmit} aria-describedby="account-readiness" autoComplete="off">
        {signup && <><label htmlFor="student-name">이름<input id="student-name" name="name" placeholder="이름을 입력해 주세요" maxLength={40}/></label><div className="form-columns"><label htmlFor="student-grade">학년<select id="student-grade" name="grade" defaultValue=""><option value="" disabled>학년 선택</option>{GRADES.map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><label htmlFor="student-classroom">반 <small className="optional-label">선택</small><input id="student-classroom" name="classroom" placeholder="예: 2반" maxLength={30}/></label></div></>}
        <label htmlFor="student-email">이메일<div className="input-with-icon"><Mail size={19}/><input id="student-email" name="email" type="email" placeholder="name@example.com" maxLength={254}/></div></label>
        <label htmlFor="student-password">비밀번호 {signup && <small>최소 6자리</small>}<div className="password-input"><input id="student-password" name="password" type={showPassword ? "text" : "password"} placeholder={signup ? "최소 6자리로 입력해 주세요" : "비밀번호를 입력해 주세요"} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 6 : undefined} maxLength={128}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></label>
        {signup && <label htmlFor="password-confirm">비밀번호 확인<input id="password-confirm" name="passwordConfirm" type="password" placeholder="비밀번호를 한 번 더 입력해 주세요" autoComplete="new-password" maxLength={128}/></label>}
        {error && <p className="alert" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
        <button type="submit" className="button button-primary button-block" disabled={submitting}>{submitting ? (signup ? "가입 처리 중…" : "로그인 중…") : (signup ? "회원가입" : "로그인")} <ArrowRight size={18}/></button>
      </form>
      <p className="account-switch">{signup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"} <button className="text-button" onClick={() => onNavigate(signup ? "login" : "signup")}>{signup ? "로그인" : "회원가입"}</button></p>
    </div>
  </section>;
}
