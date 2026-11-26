'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, KeyRound, Loader2, Mail, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';
  const nextPath = searchParams.get('next') || '/bookshelf';

  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (tab === 'signup' && !agreeTerms) {
      setError('請先勾選同意會員服務條款與隱私權保護政策');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      if (tab === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          throw new Error(
            signInError.message.includes('Invalid login credentials')
              ? '帳號或密碼不正確，請重新確認（若尚未註冊請切換至「免費註冊」）'
              : signInError.message
          );
        }
        router.push(nextPath);
        router.refresh();
      } else {
        const origin = window.location.origin;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
            data: {
              display_name: displayName.trim() || email.trim().split('@')[0],
            },
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (data.session) {
          router.push(nextPath);
          router.refresh();
        } else {
          setInfoMessage(
            '註冊成功！我們已發送驗證信至您的電子信箱，請點擊信中連結完成啟用後登入。'
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '驗證失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {tab === 'signin' ? '登入艾倫數位書坊' : '註冊讀者會員帳號'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            管理個人數位書櫃、下載專屬浮水印 PDF 與啟用老訂戶 1/10 升級優惠
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`rounded-lg py-2 transition ${
              tab === 'signin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            會員登入
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`rounded-lg py-2 transition ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            免費註冊
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                讀者稱呼 / 顯示名稱
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例如：王小明"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              電子郵件信箱（亦作為動態浮水印授權識別）
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              密碼（至少 6 個字元）
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {tab === 'signup' && (
            <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              <span>
                我已閱讀並同意本站之{' '}
                <Link href="/legal/terms" className="text-indigo-600 underline">
                  《會員服務條款》
                </Link>{' '}
                與{' '}
                <Link href="/legal/privacy" className="text-indigo-600 underline">
                  《隱私權保護政策》
                </Link>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{tab === 'signin' ? '立即登入' : '建立會員帳號'}</span>
          </button>
        </form>

        <div className="mt-6 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-500">
          作者管理員提示：使用作者信箱 <code className="text-slate-700">alan.huinli@gmail.com</code>{' '}
          註冊登入後，系統將自動啟用「作者管理後台」完整發佈與管理權限。
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-sm text-slate-500">載入中...</div>}>
      <LoginFormInner />
    </Suspense>
  );
}
