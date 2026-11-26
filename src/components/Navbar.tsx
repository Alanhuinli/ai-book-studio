import Link from 'next/link';
import { BookOpen, Library, ShieldCheck, UserCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SignOutButton } from './SignOutButton';

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role = 'reader';
  let displayName = '';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, display_name')
      .eq('id', user.id)
      .maybeSingle();
    role = profile?.role ?? (user.email?.toLowerCase() === 'alan.huinli@gmail.com' ? 'admin' : 'reader');
    displayName = profile?.display_name || user.email?.split('@')[0] || '會員';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-slate-900 text-white shadow-sm transition group-hover:scale-105">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                艾倫數位書坊
              </span>
              <span className="hidden rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 sm:inline-block">
                Alan&apos;s AI Press
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 md:block">
              精選 AI 協作原創電子書與實戰指南
            </p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/#books"
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            精選電子書
          </Link>
          <Link
            href="/#upgrade-mechanism"
            className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:inline-block"
          >
            老訂戶 1/10 升級制
          </Link>

          {user ? (
            <>
              <Link
                href="/bookshelf"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <Library className="h-4 w-4" />
                <span>個人書櫃</span>
              </Link>

              {role === 'admin' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">作者後台</span>
                </Link>
              )}

              <div className="hidden items-center gap-1.5 text-xs text-slate-500 lg:flex">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="max-w-[120px] truncate">{displayName}</span>
              </div>

              <SignOutButton />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                會員登入
              </Link>
              <Link
                href="/login?tab=signup"
                className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                免費註冊
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
