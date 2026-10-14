"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, BookOpenCheck, Calculator, ChartNoAxesCombined, Check, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, Shapes, Sparkles, TrendingUp, UserRoundPlus } from "lucide-react";
import { domains, domainDescriptions } from "@/lib/assessment";
import { GRADES, QUESTION_COUNT, questionBlueprints, type Grade } from "@/lib/diagnosis-blueprint";

export type PortalPage = "home" | "signup" | "login" | "diagnosis" | "results";
type Navigation = { onNavigate: (page: PortalPage) => void; onGradeChange?: (grade: Grade) => void };
const domainIcons = [Calculator, TrendingUp, Shapes, ChartNoAxesCombined];

export default function StudentPortal({ page, initialGrade, onNavigate, onGradeChange }: Navigation & { page: PortalPage; initialGrade: Grade }) {
  return <>
    <div className="preview-banner"><span/>수리력 진단 <span className="preview-separator">·</span> 이메일 회원가입으로 시작해요.</div>
    {page === "home" && <Landing onNavigate={onNavigate}/>}
    {(page === "signup" || page === "login") && <AccountForm key={page} mode={page} onNavigate={onNavigate} onGradeChange={onGradeChange}/>} 
    {page === "diagnosis" && <Diagnosis key={initialGrade} initialGrade={initialGrade} onNavigate={onNavigate}/>}
    {page === "results" && <Results onNavigate={onNavigate}/>}
  </>;
}

function Landing({ onNavigate }: Navigation) {
  return <div className="container portal-home">
    <section className="landing-hero" aria-labelledby="home-title">
      <div className="landing-copy">
        <p className="hero-pill"><Sparkles size={16}/> 초등 1·2·3학년 수리력 진단</p>
        <h1 id="home-title">수학을 이해하는 힘,<br/><em>한 걸음씩</em> 자라요.</h1>
        <p className="landing-description">내가 잘하는 것과 더 배워 갈 것을 알아보는 시간.<br className="desktop-break"/>나에게 맞는 배움의 시작을 함께 찾아요.</p>
        <div className="button-row hero-actions"><button className="button button-primary button-large" onClick={() => onNavigate("diagnosis")}>진단하기 <ArrowRight size={21}/></button><button className="button button-outline button-large" onClick={() => onNavigate("signup")}>회원가입</button></div>
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
      <div className="section-heading"><div><p className="eyebrow">나의 수리력 한걸음</p><h2 id="menu-title">무엇부터 해 볼까요?</h2></div><p className="section-note">처음이라면 회원가입부터 시작해요.</p></div>
      <div className="quick-grid">
        <button className="quick-card" onClick={() => onNavigate("signup")}><span className="quick-icon mint"><UserRoundPlus size={27}/></span><span className="quick-content"><strong>회원가입</strong><span>이메일로 나만의 계정을 준비해요.</span></span><ArrowUpRight size={21}/></button>
        <button className="quick-card featured" onClick={() => onNavigate("diagnosis")}><span className="quick-icon blue"><ClipboardList size={27}/></span><span className="quick-content"><strong>진단하기</strong><span>우리 학년의 {QUESTION_COUNT}문항을 만나 보세요.</span></span><ArrowUpRight size={21}/></button>
        <button className="quick-card" onClick={() => onNavigate("results")}><span className="quick-icon lavender"><ChartNoAxesCombined size={27}/></span><span className="quick-content"><strong>나의 결과</strong><span>진단 결과와 배움의 기록을 살펴봐요.</span></span><ArrowUpRight size={21}/></button>
      </div>
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

function AccountForm({ mode, onNavigate, onGradeChange }: Navigation & { mode: "signup" | "login" }) {
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
    if (signup && password !== confirmation) { setError("비밀번호가 서로 다릅니다."); setSubmitting(false); return; }
    try {
      const response = await fetch(signup ? "/api/auth/signup" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signup ? { name, grade, classroom, email, password } : { email, password }) });
      const payload = await response.json() as { student?: { grade?: number }; error?: string };
      if (!response.ok || !payload.student) throw new Error(payload.error || "계정 요청을 처리하지 못했습니다.");
      const studentGrade = Number(payload.student.grade);
      if ([1, 2, 3].includes(studentGrade)) onGradeChange?.(studentGrade as Grade);
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
      <div id="account-readiness" className="readiness-note" role="status"><LockKeyhole size={19}/><p>Firebase 이메일 {signup ? "회원가입" : "로그인"}을 사용해요.<br/><small>비밀번호는 사이트에 저장하지 않고 Firebase 인증으로 처리합니다.</small></p></div>
      <form className="form-stack" onSubmit={handleSubmit} aria-describedby="account-readiness" autoComplete="off">
        {signup && <><label htmlFor="student-name">이름<input id="student-name" name="name" placeholder="이름을 입력해 주세요" maxLength={40}/></label><div className="form-columns"><label htmlFor="student-grade">학년<select id="student-grade" name="grade" defaultValue=""><option value="" disabled>학년 선택</option>{GRADES.map(grade => <option key={grade} value={grade}>{grade}학년</option>)}</select></label><label htmlFor="student-classroom">반 <small className="optional-label">선택</small><input id="student-classroom" name="classroom" placeholder="예: 2반" maxLength={30}/></label></div></>}
        <label htmlFor="student-email">이메일<div className="input-with-icon"><Mail size={19}/><input id="student-email" name="email" type="email" placeholder="name@example.com" maxLength={254}/></div></label>
        <label htmlFor="student-password">비밀번호<div className="password-input"><input id="student-password" name="password" type={showPassword ? "text" : "password"} placeholder="비밀번호를 입력해 주세요" autoComplete="new-password" maxLength={128}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}>{showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div></label>
        {signup && <label htmlFor="password-confirm">비밀번호 확인<input id="password-confirm" name="passwordConfirm" type="password" placeholder="비밀번호를 한 번 더 입력해 주세요" autoComplete="new-password" maxLength={128}/></label>}
        {error && <p className="alert" role="alert">{error}</p>}{notice && <p className="success-message" role="status">{notice}</p>}
        <button type="submit" className="button button-primary button-block" disabled={submitting}>{submitting ? (signup ? "가입 처리 중…" : "로그인 중…") : (signup ? "회원가입" : "로그인")} <ArrowRight size={18}/></button>
      </form>
      <p className="account-switch">{signup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"} <button className="text-button" onClick={() => onNavigate(signup ? "login" : "signup")}>{signup ? "로그인" : "회원가입"}</button></p>
    </div>
  </section>;
}

function Diagnosis({ initialGrade, onNavigate }: Navigation & { initialGrade: Grade }) {
  const [grade, setGrade] = useState<Grade>(initialGrade);
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const items = questionBlueprints[grade];
  const item = items[step];
  const answeredCount = items.filter(question => answers[question.id]?.trim()).length;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (started) headingRef.current?.focus(); }, [step, started, reviewing]);
  useEffect(() => {
    if (!answeredCount) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [answeredCount]);
  function changeGrade(next: Grade) { setGrade(next); setStep(0); setAnswers({}); setReviewing(false); }

  return <section className="container diagnosis-content">
    {!started ? <>
      <div className="page-intro"><p className="eyebrow">진단하기</p><h1>나의 학년을 선택해 주세요.</h1><p>총 {QUESTION_COUNT}문항으로 지금까지의 배움을 살펴봐요.</p></div>
      <fieldset className="grade-grid"><legend className="sr-only">진단 학년</legend>{GRADES.map(value => <label key={value} className={`grade-card ${grade === value ? "selected" : ""}`}><input type="radio" name="assessment-grade" checked={grade === value} onChange={() => changeGrade(value)}/><span className="grade-number">0{value}</span><span><strong>{value}학년</strong><small>총 {QUESTION_COUNT}문항</small></span><span className="grade-radio">{grade === value && <Check size={16}/>}</span></label>)}</fieldset>
      <div className="panel diagnosis-instructions"><div><span className="quick-icon blue"><ClipboardList size={25}/></span><h2>시작하기 전에 읽어 주세요.</h2><ul><li>선생님이 나눠 준 우리 학년 검사지를 준비해요.</li><li>검사지의 문제를 풀고, 번호에 맞는 답을 입력해요.</li><li>선택형은 보기 번호를, 단답형은 직접 답을 적어요.</li><li>제출 전에 {QUESTION_COUNT}문항의 답을 한 번 더 확인해요.</li></ul></div><aside><span className="badge">미리보기 안내</span><p>현재는 답안 화면을 살펴볼 수 있어요. 정식 진단은 회원가입 기능과 검사지 확인이 끝난 뒤 시작해요.</p><button className="button button-primary button-block" onClick={() => { setStarted(true); setStep(0); }}>{grade}학년 답안 화면 미리보기 <ArrowRight size={18}/></button><button className="text-button" onClick={() => onNavigate("signup")}>회원가입 화면 보기</button></aside></div>
    </> : <>
      <div className="answer-heading"><div><p className="eyebrow">{grade}학년 · 답안 화면 미리보기</p><h1 ref={headingRef} tabIndex={-1}>{reviewing ? "입력한 답을 확인해요." : `${item.number}번 문제의 답을 입력해요.`}</h1></div><button className="button button-outline" onClick={() => answeredCount ? setLeaveOpen(true) : setStarted(false)}>학년 다시 선택</button></div>
      <p className="answer-preview-note">이 화면은 검사지 답안 입력용 미리보기예요. 답안은 새로고침하거나 화면을 나가면 사라지며, 채점·저장은 아직 진행되지 않아요.</p>
      <div className="answer-layout"><aside className="panel answer-map"><div className="answer-map-heading"><h2>문항 번호</h2><span>{answeredCount} / {QUESTION_COUNT}</span></div><div className="answer-progress" role="progressbar" aria-label="답안 입력 진행률" aria-valuemin={0} aria-valuemax={QUESTION_COUNT} aria-valuenow={answeredCount}><div style={{ width: `${answeredCount / QUESTION_COUNT * 100}%` }}/></div><nav className="question-grid" aria-label="문항 이동">{items.map((question, index) => <button key={question.id} className={`${!reviewing && step === index ? "current" : ""} ${answers[question.id]?.trim() ? "answered" : ""}`} aria-current={!reviewing && step === index ? "step" : undefined} aria-label={`${question.number}번 ${answers[question.id]?.trim() ? "답변 완료" : "미답변"}`} onClick={() => { setStep(index); setReviewing(false); }}>{question.number}</button>)}</nav><p><span/> 파란색은 답을 입력한 문항이에요.</p></aside>
        <div className="panel answer-card">{reviewing ? <>
          <h2>답안 확인</h2><p className="muted">수정할 문항을 누르면 다시 입력할 수 있어요.</p><div className="answer-summary">{items.map((question, index) => <button key={question.id} onClick={() => { setStep(index); setReviewing(false); }}><span>{question.number}번</span><strong className={answers[question.id]?.trim() ? "" : "unanswered"}>{answers[question.id]?.trim() || "미입력"}</strong><ChevronRight size={16}/></button>)}</div><p className="readiness-note" role="status">{answeredCount < QUESTION_COUNT ? `아직 ${QUESTION_COUNT - answeredCount}문항의 답을 입력하지 않았어요. ` : "20문항의 답을 모두 확인했어요. "}결과 제출은 정식 오픈 후 이용할 수 있어요.</p><button className="button button-primary button-block" disabled>결과 제출 준비 중</button>
        </> : <>
          <div className="answer-card-meta"><span className="badge">{item.type === "choice" ? "선택형" : "단답형"}</span><span>{item.number} / {QUESTION_COUNT} 문항</span></div><p className="item-topic-label">이 문항에서 살펴보는 내용</p><h2 className="item-topic">{item.topic}</h2><div className="paper-reminder"><BookOpenCheck size={23}/><p>문제와 그림은 선생님이 나눠 준 검사지를 봐 주세요.<small>여기에는 출제 내용만 안내되어 있어요.</small></p></div>
          {item.type === "choice" ? <fieldset className="choice-field"><legend>검사지에서 고른 보기 번호를 눌러 주세요.</legend><div className="number-options">{["①", "②", "③", "④"].map(choice => <button key={choice} type="button" aria-pressed={answers[item.id] === choice} className={answers[item.id] === choice ? "selected" : ""} onClick={() => setAnswers(previous => ({ ...previous, [item.id]: choice }))}>{choice}{answers[item.id] === choice && <Check size={18}/>}</button>)}</div></fieldset> : <label className="short-answer" htmlFor="written-answer">검사지에 적은 답을 입력해 주세요.<input key={item.id} id="written-answer" value={answers[item.id] ?? ""} maxLength={100} autoComplete="off" spellCheck={false} onChange={event => setAnswers(previous => ({ ...previous, [item.id]: event.target.value }))} placeholder="숫자, 글자 또는 기호를 입력해 주세요"/><small>답이 여러 개라면 쉼표(,)로 구분해 주세요.</small></label>}
          <div className="question-actions"><button className="button button-quiet" disabled={step === 0} onClick={() => setStep(value => value - 1)}><ChevronLeft size={18}/> 이전</button><button className="button button-primary" onClick={() => step === QUESTION_COUNT - 1 ? setReviewing(true) : setStep(value => value + 1)}>{step === QUESTION_COUNT - 1 ? "답안 확인" : "다음 문항"}<ChevronRight size={18}/></button></div>
        </>}</div>
      </div>
    </>}
    {leaveOpen && <LeaveDialog onCancel={() => setLeaveOpen(false)} onConfirm={() => { setLeaveOpen(false); setStarted(false); setAnswers({}); setReviewing(false); setStep(0); }}/>} 
  </section>;
}

function LeaveDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={dialogRef} className="modal" onCancel={onCancel} aria-labelledby="leave-title"><h2 id="leave-title">학년 선택으로 돌아갈까요?</h2><p className="muted">미리보기에서 입력한 답이 지워져요.</p><div className="button-row leave-actions"><button autoFocus className="button button-outline" onClick={onCancel}>계속 입력하기</button><button className="button button-primary" onClick={onConfirm}>돌아가기</button></div></dialog>;
}

function Results({ onNavigate }: Navigation) {
  return <section className="container results-content"><div className="page-intro"><p className="eyebrow">나의 결과</p><h1>배움의 기록을 모아 봐요.</h1><p>진단 결과에서 나의 강점과 다음 배움을 살펴볼 수 있어요.</p></div><div className="panel results-empty"><span className="results-empty-icon"><ChartNoAxesCombined size={38}/></span><h2>로그인 후 나의 결과를 확인해요.</h2><p>회원가입과 결과 조회 기능을 준비하고 있어요.<br/>정식 오픈 후 진단을 완료하면 이곳에서 내 기록을 볼 수 있어요.</p><div className="button-row"><button className="button button-primary" onClick={() => onNavigate("login")}>로그인 화면 보기 <ArrowRight size={18}/></button><button className="button button-outline" onClick={() => onNavigate("diagnosis")}>진단 안내 보기</button></div></div></section>;
}

