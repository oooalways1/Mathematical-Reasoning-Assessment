"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, BookOpenCheck, Calculator, ChartNoAxesCombined, Check, ChevronLeft, CircleHelp, ClipboardList, Eye, EyeOff, GraduationCap, LockKeyhole, UserRound, Shapes, Sparkles, TrendingUp } from "lucide-react";
import { domains, domainDescriptions } from "@/lib/assessment";
import { GRADES, QUESTION_COUNT, type Grade } from "@/lib/diagnosis-blueprint";
import type { StudentProfile } from '@/lib/diagnosis-model';
import { normalizeUsername, USERNAME_PATTERN, USERNAME_GUIDE } from '@/lib/student-login';
import Diagnosis from './diagnosis';
import MyResults from './my-results';

export type PortalPage = "home" | "signup" | "login" | "diagnosis" | "results";
type Navigation = { onNavigate: (page: PortalPage) => void; onGradeChange?: (grade: Grade) => void; onAuthenticated?: (student: StudentProfile) => void };
const domainIcons = [Calculator, TrendingUp, Shapes, ChartNoAxesCombined];

export default function StudentPortal({ page, initialGrade, onNavigate, onGradeChange, onAuthenticated, student, sessionLoading }: Navigation & { page: PortalPage; initialGrade: Grade; student: StudentProfile | null; sessionLoading: boolean }) {
  return <>
    <div className="preview-banner"><span/>수리력 진단 <span className="preview-separator">·</span> 나만의 아이디로 시작해요.</div>
    {page === "home" && <Landing onNavigate={onNavigate}/>}
    {(page === "signup" || page === "login") && <AccountForm key={page} mode={page} onNavigate={onNavigate} onGradeChange={onGradeChange} onAuthenticated={onAuthenticated}/>}
    {page === "diagnosis" && <Diagnosis key={student?.id ?? initialGrade} student={student} sessionLoading={sessionLoading} initialGrade={initialGrade} onNavigate={onNavigate}/>}
    {page === "results" && <MyResults student={student} onNavigate={onNavigate}/>}
  </>;
}

function Landing({ onNavigate }: Navigation) {
  return <div className="container portal-home">
    <section className="landing-hero" aria-labelledby="home-title">
      <div className="landing-copy">
        <p className="hero-pill"><Sparkles size={16}/> 초등 1·2·3학년 수리력 진단</p>
        <h1 id="home-title">수학을 이해하는 힘,<br/><em>한 걸음씩</em> 자라요.</h1>
        <p className="landing-description">내가 잘하는 것과 더 배워 갈 것을 알아보는 시간.<br className="desktop-break"/>나에게 맞는 배움의 시작을 함께 찾아요.</p>
        <div className="button-row hero-actions"><button className="button button-primary button-large" onClick={() => onNavigate("diagnosis")}>진단 시작하기 <ArrowRight size={21}/></button><button className="button button-outline button-large" onClick={() => onNavigate("signup")}>회원가입</button></div>
        <div className="hero-facts"><span><ClipboardList size={17}/> 총 {QUESTION_COUNT}문항</span><span><GraduationCap size={18}/> 학년별 진단</span><span><Check size={17}/> 선택형 · 단답형</span></div>
      </div>
      <div className="math-art" aria-hidden="true">
        <div className="art-orbit"/><span className="art-spark spark-a">✦</span><span className="art-spark spark-b">+</span>
        <div className="math-tile tile-numbers"><small>숫자와 친해지는 시간</small><div><span>1</span><span>2</span><span>3</span></div></div>
        <div className="math-tile tile-shapes"><span className="art-square"/><span className="art-circle"/><span className="art-triangle"/></div>
        <div className="art-notebook"><span className="notebook-label"><BookOpenCheck size={18}/> 나의 수학 한걸음</span><div className="notebook-lines"><i/><i/><i/></div><div className="notebook-bottom"><span>생각하고, 발견하고, 자라요</span><span className="notebook-check"><Check size={21}/></span></div></div>
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

    <section className="how-to" aria-labelledby="how-title"><div><p className="eyebrow">이용 순서</p><h2 id="how-title">시작은 간단해요.</h2><p>차근차근, 나의 속도로 함께해요.</p></div><ol><li><span>01</span><div><h3>아이디로 회원가입</h3><p>이름과 학년을 입력하고 내 아이디를 만들어요.</p></div></li><li><span>02</span><div><h3>우리 학년 진단하기</h3><p>검사지를 보며 총 {QUESTION_COUNT}문항의 답을 입력해요.</p></div></li><li><span>03</span><div><h3>나의 결과 살펴보기</h3><p>나의 강점을 찾고 다음 배움을 준비해요.</p></div></li></ol></section>
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
    const username = normalizeUsername(form.get("username"));
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("passwordConfirm") ?? "");
    if (signup && (!name || ![1, 2, 3].includes(grade))) { setError("이름과 학년을 입력해 주세요."); setSubmitting(false); return; }
    if (!username || !password) { setError("아이디와 비밀번호를 입력해 주세요."); setSubmitting(false); return; }
    if (signup && !USERNAME_PATTERN.test(username)) { setError(`아이디는 ${USERNAME_GUIDE}로 입력해 주세요.`); setSubmitting(false); return; }
    if (signup && password.length < 6) { setError("비밀번호는 최소 6자리로 입력해 주세요."); setSubmitting(false); return; }
    if (signup && password !== confirmation) { setError("비밀번호가 서로 다릅니다."); setSubmitting(false); return; }
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, grade, classroom, username, password } : { username, password }) });
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
        {signup && <><label htmlFor="student-name">이름<input id="student-name" name="name" placeholder="이름을 입력해 주세요" maxLength={40}/></label><div className="form-columns"><label htmlFor="student-grade">학년<select id="student-grade" name="grade" defaultValue=""><option value="" disabled>학년 선택</option>{GRADES.map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><label htmlFor="student-classroom">반 <small className="optional-label">선택</small><input id="student-classroom" name="classroom" placeholder="예: 2반" maxLength={30}/></label></div></>}
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
