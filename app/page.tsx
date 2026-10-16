"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Activity, ArrowRight, BarChart3, BookOpenCheck, ClipboardList, Download, GraduationCap, LayoutDashboard, LockKeyhole, LogOut, Plus, Search, Settings2, ShieldCheck, Users, X } from "lucide-react";
import { domains, domainScore, hasLegacyDomains } from "@/lib/assessment";
import { GRADES, isGrade, type Grade } from "@/lib/diagnosis-blueprint";
import StudentPortal, { type PortalPage } from "./student-portal";
import type { StudentProfile } from '@/lib/diagnosis-model';
import AnswerKeyEditor from './answer-key-editor';
import LearningJourney from './learning-journey';
import FeedbackLibrary from './feedback-library';
import StudentAccountEditor from './student-account-editor';
import SchoolSelect from './school-select';
import SchoolManager, { StudentSchoolEditor } from './school-manager';

type Student = { id: string; name: string; grade: number; classroom: string; schoolId?: string | null; schoolName?: string | null; schoolRegion?: string | null; createdAt: string; latestScore?: number | null; assessmentCount?: number };
type Result = { keyVersion?:string|null; evaluationId?:string|null; evaluationTitle?:string|null; evaluationCode?:string|null; id: string; studentId: string; totalScore: number; maxScore: number; domains: Record<string, number>; completedAt: string };
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
  const [newStudent, setNewStudent] = useState({ name: "", grade: "1", classroom: "", schoolId: "" });
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
      setAdminNotice(`${payload.student.name} 학생 정보를 등록했습니다. 학생은 아이디로 회원가입할 수 있습니다.`);
      setNewStudent({ name: "", grade: "1", classroom: "", schoolId: "" }); setShowAddStudent(false); void loadAdmin();
    } catch (e) { setAddError(e instanceof Error ? e.message : "학생 등록에 실패했습니다."); }
    finally { setAdding(false); }
  }

  function exportCsv() {
    const includeLegacy=results.some(result=>hasLegacyDomains(result.domains));
    const rows:unknown[][]=[["이름","학교","지역","학년","반","평가명","유형","정답표 버전","진단일","점수",...domains,...(includeLegacy?["이전 영역: 자료와 문제해결"]:[])]];
    for(const student of students){
      const own=results.filter(result=>result.studentId===student.id);
      for(const assessment of own.length?own:[null])rows.push([student.name,student.schoolName??"학교 미지정",student.schoolRegion??"",student.grade,student.classroom,assessment?.evaluationTitle??"이전 평가",assessment?.evaluationCode??"유형 미지정",assessment?.keyVersion??"",assessment?new Date(assessment.completedAt).toLocaleString("ko-KR"):"진단 전",assessment?`${assessment.totalScore}/${assessment.maxScore}`:"",...domains.map(domain=>assessment?domainScore(assessment.domains,domain)??"":""),
        ...(includeLegacy?[assessment?.domains["자료와 문제해결"]??""]:[])]);
    }
    downloadCsv(rows,"수리력_전체_평가_기록.csv");
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
      <nav classN…1958 tokens truncated…r=>r.evaluationId).map(r=>[r.evaluationId!,{id:r.evaluationId!,name:(r.evaluationTitle??'평가')+' · '+r.evaluationCode}])).values());
  const visibleResults=results.filter(result=>(!selectedId||result.studentId===selectedId)&&(!evaluationFilter||result.evaluationId===evaluationFilter));
    const hasLegacy = results.some((result) => hasLegacyDomains(result.domains));
  const areaAverage = domains.map((domain) => {
    const scores = results.map((result) => domainScore(result.domains, domain)).filter((value): value is number => value !== undefined);
    return { domain, value: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : undefined };
  });

  if (detail) return <div className="container admin-content"><div className="button-row"><button className="button button-outline student-back" onClick={() => setDetail(null)}>← 대시보드로 돌아가기</button><button className="button button-outline student-back" onClick={onLogout}><LogOut size={18}/> 관리 종료</button></div><LearningJourney key={`${detail.student.id}-${detail.resultId ?? ''}`} student={detail.student} teacher initialResultId={detail.resultId}/><p className="admin-session-note"><ShieldCheck size={18}/> 공용 기기에서는 사용 후 관리 종료를 눌러 주세요.</p></div>;

  return <div className="container admin-content">
    <div className="section-heading admin-heading">
      <div><p className="eyebrow"><LayoutDashboard size={18}/> 교사를 위한 공간</p><h1>관리 대시보드</h1><p className="muted">학생별 답안·오답·진단 이력·연습 기록을 살펴보세요.</p></div>
      <div className="button-row"><button className="button button-outline" onClick={onRefresh}>새로고침</button><button className="button button-outline" onClick={onLogout}><LogOut size={18}/> 로그아웃</button></div>
    </div>
    {error && <p role="alert" className="alert">{error}</p>}
    <nav className="admin-tabs" aria-label="관리 메뉴">{([["overview", "한눈에 보기"], ["students", "학생 관리"], ["schools", "학교 관리"], ["records", "진단 기록"], ["keys", "정답 설정"], ["feedback", "피드백 자료"]] as const).map(([id, label]) =>
      <button key={id} aria-current={!detail && tab === id ? "page" : undefined} className={!detail && tab === id ? "active" : ""} onClick={() => { setTab(id); setDetail(null); }}>{label}</button>)}</nav>

    {!detail && tab === "overview" && <>
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

    {!detail && tab === "students" && <section className="panel">
      <div className="panel-toolbar"><div><h2>학생 목록</h2><p className="muted">학교별 학생 정보와 학년을 확인하고, 기존 학생의 학교를 배정하세요.</p></div><div className="toolbar-controls"><select aria-label="학교별 학생 조회" value={schoolFilter} onChange={event=>setSchoolFilter(event.target.value)}><option value="">전체 학교</option><option value="unassigned">학교 미지정</option>{schoolOptions.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><SearchInput value={query} onChange={setQuery}/><button className="button button-primary" onClick={onAdd}><Plus size={19}/> 학생 추가</button></div></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>이름</th><th>초등학교</th><th>학년·반</th><th>진단 횟수</th><th><span className="sr-only">진단</span></th></tr></thead><tbody>
        {matched.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td><td>{student.schoolName ?? "학교 미지정"}<small>{student.schoolRegion}</small></td><td>{student.grade}학년 {student.classroom}</td><td>{student.assessmentCount ?? 0}회</td><td><div className="button-row"><button className="button button-soft" onClick={() => setDetail({ student })}>학생 상세 <ArrowRight size={17}/></button><button className="button button-outline" onClick={() => setSchoolStudent(student)}>학교 배정</button><button className="button button-outline" onClick={() => setAccountStudent(student)}>로그인 관리</button></div></td></tr>)}
      </tbody></table></div>
      {!matched.length && <div className="empty-state"><Users size={32}/><h3>{students.length ? "검색 결과가 없어요" : "첫 학생을 등록해 주세요"}</h3><p>{students.length ? "다른 이름으로 검색해 주세요." : "위의 학생 추가 버튼으로 시작할 수 있어요."}</p></div>}
    </section>}

    {!detail && tab === "records" && <section className="panel">
      <div className="panel-toolbar"><div><h2>진단 기록</h2><p className="muted">학생별 결과를 조회하고 내려받아요.</p></div><div className="toolbar-controls"><select aria-label="학생 선택" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">전체 학생</option>{students.map((student) => <option key={student.id} value={student.id}>{student.schoolName ?? "학교 미지정"} · {student.name} · {student.grade}학년 {student.classroom}</option>)}</select><select aria-label="평가별 기록 조회" value={evaluationFilter} onChange={e=>setEvaluationFilter(e.target.value)}><option value="">전체 평가</option>{evaluationOptions.map(form=><option key={form.id} value={form.id}>{form.name}</option>)}</select><button className="button button-outline" onClick={onExport}><Download size={19}/> CSV 다운로드</button></div></div>
      <div className="table-scroll"><table className="data-table records-table"><thead><tr><th>학생</th><th>진단일</th><th>영역별 점수</th><th>총점</th></tr></thead><tbody>
        {visibleResults.map((result) => {
          const student = students.find((item) => item.id === result.studentId);
          const legacy = hasLegacyDomains(result.domains);
          return <tr key={result.id}><td><strong>{student?.name ?? "학생"}</strong><small>{student?.schoolName ?? "학교 미지정"} · {student?.schoolRegion} · {student?.grade}학년 {student?.classroom}</small></td><td><strong>{result.evaluationTitle ?? "이전 평가"} · {result.evaluationCode ?? "유형 미지정"}</strong>{new Date(result.completedAt).toLocaleDateString("ko-KR")}<small>{new Date(result.completedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</small></td><td><div className="record-domains">{(legacy ? Object.entries(result.domains) : Object.entries(result.domains)).map(([domain, score]) => <span key={domain}>{domain}<b>{score}%</b></span>)}</div>{legacy && <small>이전 영역 기준 진단</small>}</td><td><strong className="score-text">{result.totalScore}/{result.maxScore}점</strong>{student && <button className="text-button" onClick={() => setDetail({ student, resultId: result.id })}>답안·분석 보기</button>}</td></tr>;
        })}
      </tbody></table></div>
      {!visibleResults.length && <div className="empty-state"><ClipboardList size={32}/><p>조회할 진단 기록이 없어요.</p></div>}
    </section>}
    {!detail && tab === 'schools' && <SchoolManager onChanged={onRefresh}/>}
    {schoolStudent && <Modal title="학생 학교 배정" onClose={()=>setSchoolStudent(null)}><StudentSchoolEditor student={schoolStudent} onSaved={()=>{setSchoolStudent(null);onRefresh();}}/></Modal>}
    {!detail && tab === 'keys' && <AnswerKeyEditor/>}
    {!detail && tab === 'feedback' && <FeedbackLibrary/>}
    {accountStudent && <Modal title="학생 로그인 관리" onClose={() => setAccountStudent(null)}><StudentAccountEditor key={accountStudent.id} student={accountStudent}/></Modal>}
    <p className="admin-session-note"><ShieldCheck size={18}/> 공용 기기에서는 사용 후 로그아웃해 주세요.</p>
  </div>;
}
