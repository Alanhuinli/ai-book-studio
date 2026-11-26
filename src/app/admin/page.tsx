import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardClient } from './AdminDashboardClient';

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/admin');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            此區域僅限作者管理員存取
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            您目前登入的帳號為 <code>{user.email}</code>（一般讀者權限）。請登出後使用作者帳號{' '}
            <strong>alan.huinli@gmail.com</strong> 註冊／登入，即可進入作者管理後台。
          </p>
          <Link
            href="/bookshelf"
            className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            返回個人數位書櫃
          </Link>
        </div>
      </div>
    );
  }

  const [booksRes, versionsRes, ordersRes, profilesRes, entsRes, settingsRes] =
    await Promise.all([
      supabase.from('books').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('book_versions')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase
        .from('user_entitlements')
        .select('*')
        .order('granted_at', { ascending: false }),
      supabase.from('site_settings').select('*').eq('id', 1).single(),
    ]);

  const fallbackSettings = settingsRes.data ?? {
    id: 1,
    site_name: "艾倫數位書坊 Alan's AI Press",
    site_subtitle: '精選 AI 協作原創電子書與實戰指南',
    business_entity: "艾倫數位書坊（Alan's AI Press）",
    support_email: 'alan.huinli@gmail.com',
    support_phone: '02-2718-8890',
    business_address: '臺北市信義區松仁路 100 號（數位出版服務中心）',
    service_hours: '週一至週五 09:30 - 18:00（國定例假日除外）',
    payment_mode: 'sandbox',
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            作者出版與營運管理後台
          </h1>
          <p className="text-xs text-slate-500">
            管理書籍上架、發佈 v2.0 / v3.0 新版、檢視訂單發票、訂戶權限與台灣金流審核頁尾資訊
          </p>
        </div>
      </div>

      <AdminDashboardClient
        books={booksRes.data ?? []}
        versions={versionsRes.data ?? []}
        orders={ordersRes.data ?? []}
        profiles={profilesRes.data ?? []}
        entitlements={entsRes.data ?? []}
        siteSettings={fallbackSettings}
      />
    </div>
  );
}
