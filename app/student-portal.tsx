"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Calculator, ChartNoAxesCombined, Check, ChevronLeft, CircleHelp, ClipboardList, Eye, EyeOff, GraduationCap, LockKeyhole, UserRound, Shapes, TrendingUp } from "lucide-react";
import { domains, domainDescriptions } from "@/lib/assessment";
import { GRADES, type Grade } from "@/lib/diagnosis-blueprint";
import type { StudentProfile } from '@/lib/diagnosis-model';
import { normalizeUsername, USERNAME_PATTERN, USERNAME_GUIDE } from '@/lib/student-login';
import SchoolSelect from './school-select';
import Diagnosis from './diagnosis';
import MyResults from './my-results';

export type PortalPage = "home" | "signup" | "login" | "diagnosis" | "results";
type Navigation = { onNavigate: (page: PortalPage) => void; onGradeChange?: (grade: Grade) => void; onAuthenticated?: (student: StudentProfile) => void };
const domainIcons = [Calculator, TrendingUp, Shapes, ChartNoAxesCombined];

export default function StudentPortal({ page, initialGrade, onNavigate, onGradeChange, onAuthenticated, student, sessionLoading }: Navigation & { page: PortalPage; initialGrade: Grade; student: StudentProfile | null; sessionLoading: boolean }) {
  return <>
    <div className="preview-banner"><span/>수리력 진단 <span className="preview-separator">·</span> 나만의 아이디로 시작해요.</div>
    {page === "home" && <Landing onNavigate={onNavigate} student={student} sessionLoading={sessionLoading}/>}
    {(page === "signup" || page === "login") && <AccountForm key={page} mode={page} onNavigate={onNavigate} onGradeChange={onGradeChange} onAuthenticated={onAuthenticated}/>}
    {page === "diagnosis" && <Diagnosis key={student?.id ?? initialGrade} student={student} sessionLoading={sessionLoading} initialGrade={initialGrade} onNavigate={onNavigate}/>}
    {page === "results" && <MyResults student={student} onNavigate={onNavigate}/>}
  </>;
}

function Landing({ onNavigate, student, sessionLoading }: Navigation & { student: StudentProfile | null; sessionLoading: boolean }) {
  return <div className="container home-simple">
    <section className="home-start" aria-labelledby="home-title">
      <div className="home-welcome">
        <p className="hero-pill"><GraduationCap size={17}/> 초등 1·2·3학년 수리력 진단</p>
        <h1 id="home-title">{student ? <>{student.name}님,<br/>오늘도 <em>한 걸음!</em></> : <>나의 수학 실력,<br/><em>어디까지 자랐을까?</em></>}</h1>
        <p className="home-description">답안을 입력하면 결과를 바로 확인하고,<br/>나에게 필요한 연습을 이어 갈 수 있어요.</p>
        {student ? <p className="home-profile">{student.schoolName ?? '학교 미지정'} · {student.grade}학년 {student.classroom}</p> : <p className="home-signup">처음 왔나요? <button className="text-button" onClick={()=>onNavigate('signup')}>회원가입하기 <ArrowRight size={16}/></button></p>}
        <div className="hero-facts"><span><ClipboardList size={16}/> 학년별 평가</span><span><Check size={16}/> 직접 입력 또는 파일 업로드</span></div>
      </div>
      <div className="home-actions" aria-label="바로 시작하기">
        <button className="home-action home-action-primary" disabled={sessionLoading} onClick={()=>onNavigate(student ? 'diagnosis' : 'login')}>
          <span className="home-action-icon"><ClipboardList size={28}/></span>
          <span className="home-action-copy"><small>검사지를 준비했나요?</small><strong>{sessionLoading ? '계정 확인 중…' : '진단 시작하기'}</strong><span>{student ? '우리 학년 답안을 입력해요.' : '로그인하고 답안을 입력해요.'}</span></span>
          <ArrowRight size={25}/>
        </button>
        <button className="home-action" disabled={sessionLoading} onClick={()=>onNavigate('results')}>
          <span className="home-action-icon"><ChartNoAxesCombined size={27}/></span>
          <span className="home-action-copy"><small>진단을 마쳤나요?</small><strong>결과 확인 · 복습하기</strong><span>틀린 문제를 살펴보고 연습해요.</span></span>
          <ArrowRight size={24}/>
        </button>
      </div>
    </section>
    <section className="home-flow" aria-labelledby="home-flow-title">
      <h2 id="home-flow-title">이렇게 이용해요</h2>
      <ol><li><span>1</span><div><strong>학교 선택 · 회원가입</strong><p>내 학교와 학년을 등록해요.</p></div></li><li><span>2</span><div><strong>진단 답안 제출</strong><p>선택한 검사지의 답을 입력해요.</p></div></li><li><span>3</span><div><strong>결과 확인 · 맞춤 복습</strong><p>부족한 내용을 알고 연습해요.</p></div></li></ol>
    </section>
    <details className="home-guide" id="guide">
      <summary><span><CircleHelp size={19}/> 어떤 내용을 진단하나요?</span><span className="home-guide-toggle" aria-hidden="true">+</span></summary>
      <p className="guide-description">수와 연산, 변화와 관계, 도형과 측정, 자료와 가능성을 살펴요. 학년에 따라 다루는 내용은 달라요.</p>
      <div className="domain-grid">{domains.map((domain,index)=>{const Icon=domainIcons[index];return <article className={`domain-card tone-${index}`} key={domain}><span className="domain-icon"><Icon size={23}/></span><h3>{domain}</h3><p>{domainDescriptions[domain]}</p></article>;})}</div>
      <p className="home-guide-note">진단은 다음 배움을 찾는 첫걸음이에요. 결과와 함께 풀이 과정을 살펴보세요.</p>
    </details>
  </div>;
}

function AccountForm({ mode, onNavigate, onGradeChange, onAuthenticated }: Navigation & { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  const [schoolId,setSchoolId] = useState("");
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
    const username = normalizeUsername(form.get("username"));
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirm") ?? "");
    if (signup && !schoolId) { setError("목록에서 초등학교를 선택해 주세요."); setSubmitting(false); return; }
    if (signup && (!name || ![1, 2, 3].includes(grade))) { setError("이름과 학년을 입력해 주세요."); setSubmitting(false); return; }
    if (!username || !password) { setError("아이디와 비밀번호를 입력해 주세요."); setSubmitting(false); return; }
    if (signup && !USERNAME_PATTERN.test(username)) { setError(`아이디는 ${USERNAME_GUIDE}로 입력해 주세요.`); setSubmitting(false); return; }
    if (signup && password.length < 6) { setError("비밀번호는 최소 6자리로 입력해 주세요."); setSubmitting(false); return; }
    if (signup && password !== confirmation) { setError("비밀번호가 서로 다릅니다."); setSubmitting(false); return; }
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, grade, classroom, username, password, schoolId } : { username, password }) });
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
    <div className="account-story"><p className="eyebrow">수리력 한걸음 · 내 계정</p><h1>{signup ? <>나의 배움이<br/>시작되는 곳.</> : <>다시 만나서<br/>반가워요.</>}</h1><p>나만의 아이디로 진단에 참여하고,<br/>나의 성장 기록을 이어 갈 수 있어요.</p><div className="account-points"><span><Check size={19}/> 나의 학년에 맞는 진단</span><span><Check size={19}/> 나만의 결과와 학습 기록</span><span><Check size={19}/> 아이디로 간편하게 로그인</span></div><button className="text-button" onClick={() => onNavigate("home")}><ChevronLeft size={18}/> 홈으로 돌아가기</button></div>
    <div className="panel account-card">
      <nav className="account-tabs" aria-label="학생 계정 메뉴"><button aria-current={!signup ? "page" : undefined} className={!signup ? "active" : ""} onClick={() => onNavigate("login")}>로그인</button><button aria-current={signup ? "page" : undefined} className={signup ? "active" : ""} onClick={() => onNavigate("signup")}>회원가입</button></nav>
      <h2>{signup ? "학생 회원가입" : "학생 로그인"}</h2><p className="muted">{signup ? "기억하기 쉬운 나만의 아이디를 만들어요." : "가입한 아이디와 비밀번호로 시작해요."}</p>
      <div id="account-readiness" className="readiness-note" role="status"><LockKeyhole size={19}/><p>{signup ? "아이디와 비밀번호를 기억해 주세요." : "내 아이디로 로그인해요."}<br/><small>비밀번호를 잊었다면 선생님께 문의해 주세요.</small></p></div>
      <form className="form-stack" onSubmit={handleSubmit} aria-describedby="account-readiness" autoComplete="off">
        {signup && <><SchoolSelect value={schoolId} onChange={setSchoolId}/><label htmlFor="student-name">이름<input id="student-name" name="name" placeholder="이름을 입력해 주세요" maxLength={40}/></label><div className="form-columns"><label htmlFor="student-grade">학년<select id="student-grade" name="grade" defaultValue=""><option value="" disabled>학년 선택</option>{GRADES.map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><label htmlFor="student-classroom">반 <small className="optional-label">선택</small><input id="student-classroom" name="classroom" placeholder="예: 2반" maxLength={30}/></label></div></>}
        <label htmlFor="student-username">아이디<div className="input-with-icon"><UserRound size={19}/><input id="student-username" name="username" type="text" placeholder={signup ? "예: math1234" : "아이디를 입력해 주세요"} maxLength={signup ? 20 : 254} autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" aria-describedby="username-help" required/></div><small id="username-help">{signup ? `${USERNAME_GUIDE} · 대소문자는 구분하지 않아요.` : "이전에 이메일로 가입했다면 이메일을 입력해 주세요."}</small></label>
        <label htmlFor="student-password">비밀번호 {signup && <small>최소 6자리</small>}<div className="password-input"><input id="student-password" name="password" type={showPassword ? "text" : "password"} placeholder={signup ? "최소 6자리로 입력해 주세요" : "비밀번호를 입력해 주세요"} autoComplete={signup ? "new-password" : "current-password"} minLength={signup ? 6 : undefined} maxLength={128}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></label>
        {signup && <label htmlFor="password-confirm">비밀번호 확인<input id="password-confirm" name="passwordConfirm" type="password" placeholder="비밀번호를 한 번 더 입력해 주세요" autoComplete="new-password" maxLength={128}/></label>}
        {error && <p className="alert" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
        <button type="submit" className="button button-primary button-block" disabled={submitting}>{submitting ? (signup ? "가입 처리 중…" : "로그인 중…") : (signup ? "회원가입" : "로그인")} <ArrowRight size={18}/></button>
      </form>
      <p className="account-switch">{signup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"} <button className="text-button" onClick={() => onNavigate(signup ? "login" : "signup")}>{signup ? "로그인" : "회원가입"}</button></p>
    </div>
  </section>;
}
