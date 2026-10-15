"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { USERNAME_GUIDE } from '@/lib/student-login';

export default function StudentAccountEditor({ student }: { student: { id: string; name: string; grade: number; classroom: string } }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'unconfigured' | 'unregistered' | 'error'>('loading');
  const [loginId, setLoginId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/student-account?studentId=${encodeURIComponent(student.id)}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json() as { ready?: boolean; registered?: boolean; loginId?: string; error?: string };
      if (!response.ok) throw new Error(data.error || '학생 계정을 확인하지 못했습니다.');
      setStatus(!data.ready ? 'unconfigured' : !data.registered ? 'unregistered' : 'ready');
      setLoginId(data.loginId ?? '');
    }).catch(reason => { if (!controller.signal.aborted) { setStatus('error'); setError(reason instanceof Error ? reason.message : '계정을 확인하지 못했습니다.'); } });
    return () => controller.abort();
  }, [student.id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(''); setNotice('');
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('newPassword') ?? '');
    if (password !== data.get('confirmPassword')) { setError('새 비밀번호가 서로 다릅니다.'); return; }
    setBusy(true);
    try {
      const username = String(data.get('newUsername') ?? '').trim();
      const response = await fetch('/api/admin/student-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id, password, username, teacherPassword: data.get('teacherPassword') }),
      });
      const payload = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || '변경하지 못했습니다.');
      if (username) setLoginId(username.toLowerCase());
      form.reset(); setNotice(payload.message ?? '변경했습니다.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '변경하지 못했습니다.'); }
    finally { setBusy(false); }
  }

  return <>
    <h2>학생 로그인 관리</h2>
    <p className="muted">{student.name} · {student.grade}학년 {student.classroom}</p>
    {status === 'loading' && <p role="status">계정을 확인하고 있어요.</p>}
    {status === 'unconfigured' && <p className="alert" role="status">비밀번호 초기화를 사용하려면 Cloudflare 시크릿에 FIREBASE_SERVICE_ACCOUNT_JSON을 등록해 주세요. 등록 후 이 창을 다시 열어 주세요.</p>}
    {status === 'unregistered' && <p className="alert">이 학생은 아직 회원가입된 계정과 연결되지 않았습니다.</p>}
    {status === 'ready' && <form className="form-stack" onSubmit={submit}>
      <p className="readiness-note">현재 로그인: <strong>{loginId}</strong></p>
      <label>새 아이디 <small>선택</small><input name="newUsername" type="text" maxLength={20} pattern="[A-Za-z][A-Za-z0-9_]{3,19}" placeholder="비워 두면 현재 아이디 유지" autoCapitalize="none" autoCorrect="off" spellCheck={false}/><small>{USERNAME_GUIDE}. 기존 이메일 계정도 아이디 계정으로 바꿀 수 있습니다.</small></label>
      <label>새 비밀번호<input name="newPassword" type="password" required minLength={6} maxLength={128} autoComplete="new-password" placeholder="최소 6자리"/></label>
      <label>새 비밀번호 확인<input name="confirmPassword" type="password" required minLength={6} maxLength={128} autoComplete="new-password"/></label>
      <label>관리자 비밀번호 확인<input name="teacherPassword" type="password" required maxLength={100} autoComplete="off"/></label>
      <p className="muted">변경 후 학생은 새 정보로 다시 로그인해야 합니다. 학생 기록은 그대로 유지됩니다.</p>
      <button className="button button-primary button-block" disabled={busy}>{busy ? '변경 중…' : '로그인 정보 변경'}</button>
    </form>}
    {error && <p className="alert" role="alert">{error}</p>}
    {notice && <p className="success-message" role="status">{notice}</p>}
  </>;
}
