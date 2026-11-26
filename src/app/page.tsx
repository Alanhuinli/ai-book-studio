import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileDown,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { calculateUpgradePriceTwd, formatTwd } from '@/lib/pricing';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: books } = await supabase
    .from('books')
    .select('*')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  const { data: versions } = await supabase
    .from('book_versions')
    .select('*')
    .order('version_number', { ascending: false });

  const { data: entitlements } = user
    ? await supabase
        .from('user_entitlements')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
    : { data: [] };

  const versionById = new Map((versions ?? []).map((v) => [v.id, v]));
  const versionsByBook = new Map<string, NonNullable<typeof versions>>();
  for (const v of versions ?? []) {
    const arr = versionsByBook.get(v.book_id) ?? [];
    arr.push(v);
    versionsByBook.set(v.book_id, arr);
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/50 via-slate-950 to-slate-950" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>艾倫數位書坊 Alan&apos;s AI Press｜原創 AI 電子書直營出版平台</span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.18]">
              精選 AI 協作原創電子書
              <span className="block bg-gradient-to-r from-indigo-400 via-sky-300 to-amber-200 bg-clip-text text-transparent">
                一次購書永久閱讀，改版升級僅需 1/10 價格
              </span>
            </h1>

            <p className="text-base leading-relaxed text-slate-300 sm:text-lg">
              每一本電子書皆為針對實務工程與知識創作深度撰寫的原創專書。購買後立即開通「線上防拷章節閱讀器」與「個人專屬動態浮水印 PDF 下載」；當書籍隨 AI 技術演進發佈 v2.0、v3.0 新版時，老訂戶永遠保有已購舊版閱讀權，並自動享有原購買金額 1/10 的改版升級優惠。
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#books"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
              >
                <span>瀏覽上架電子書與試讀</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/bookshelf"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span>進入個人書櫃</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-4 text-xs text-slate-400 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-400" />
                <span>內建線上防拷閱讀器（提供免費試讀章節）</span>
              </div>
              <div className="flex items-center gap-2">
                <FileDown className="h-4 w-4 text-emerald-400" />
                <span>支援個人專屬動態浮水印 PDF 下載</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-400" />
                <span>老訂戶自動換算原購價 1/10 升級新版</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Books Catalog */}
      <section id="books" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">
              Digital Publications Catalog
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              精選原創 AI 電子書書目
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              全站採新台幣（NT$）單本明確標價，所有書籍皆開放第 1 章免費線上試讀。
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900">
            支援付款方式：<strong>信用卡一次付清</strong>、<strong>ATM 專屬虛擬帳號匯款</strong>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {(books ?? []).map((book) => {
            const bookVersions = versionsByBook.get(book.id) ?? [];
            const latestVersion =
              (book.current_version_id ? versionById.get(book.current_version_id) : null) ??
              bookVersions[0];

            if (!latestVersion) return null;

            const userBookEnts = (entitlements ?? []).filter(
              (e) => e.book_id === book.id && e.status === 'active'
            );
            const ownsLatest = userBookEnts.some(
              (e) => e.book_version_id === latestVersion.id
            );

            // Determine if eligible for 1/10 upgrade
            const priorEnt = userBookEnts
              .map((e) => ({
                ent: e,
                ver: versionById.get(e.book_version_id),
              }))
              .filter(
                (item) =>
                  item.ver &&
                  item.ver.id !== latestVersion.id &&
                  Number(item.ver.version_number) < Number(latestVersion.version_number)
              )
              .sort(
                (a, b) =>
                  Number(a.ent.is_upgrade) - Number(b.ent.is_upgrade) ||
                  Number(a.ver!.version_number) - Number(b.ver!.version_number)
              )[0];

            const priorBaseAmount = priorEnt
              ? priorEnt.ent.paid_amount_twd > 0
                ? priorEnt.ent.paid_amount_twd
                : priorEnt.ver!.list_price_twd
              : null;

            const upgradePrice =
              !ownsLatest && priorBaseAmount !== null
                ? calculateUpgradePriceTwd(priorBaseAmount)
                : null;

            return (
              <article
                key={book.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Book Cover Banner */}
                <div
                  className={`relative overflow-hidden bg-gradient-to-br ${book.cover_gradient} p-6 text-white`}
                >
                  {book.cover_image_url && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="absolute inset-0 h-full w-full object-cover opacity-45 mix-blend-luminosity transition duration-500 hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-indigo-950/40" />
                    </>
                  )}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                        {book.category}
                      </span>
                      <span className="rounded-md bg-amber-400/20 border border-amber-300/40 px-2.5 py-0.5 text-xs font-bold text-amber-200">
                        {book.cover_badge} · {latestVersion.version_code}
                      </span>
                    </div>

                    <h3 className="mt-5 text-xl font-bold leading-snug">{book.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-200/90">
                      {book.subtitle}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-white/15 pt-3 text-xs text-slate-200">
                      <span>作者：{book.author_name}</span>
                      <span>約 {latestVersion.page_count} 頁 · 數位版</span>
                    </div>
                  </div>
                </div>

                {/* Book Card Body */}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {book.summary}
                    </p>

                    <ul className="space-y-2 text-xs text-slate-600">
                      {book.highlights.slice(0, 3).map((hl, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                          <span>{hl}</span>
                        </li>
                      ))}
                    </ul>

                    {bookVersions.length > 1 && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-900">
                        <strong>多版本演進書目：</strong>已發行{' '}
                        {bookVersions
                          .slice()
                          .reverse()
                          .map((v) => `${v.version_code} (${formatTwd(v.list_price_twd)})`)
                          .join(' → ')}
                        。已購 v1.0 老訂戶升級 v2.0 僅需原購價 1/10！
                      </div>
                    )}
                  </div>

                  {/* Price & CTA */}
                  <div className="mt-6 border-t border-slate-100 pt-5">
                    {ownsLatest ? (
                      <div className="mb-4 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          <ShieldCheck className="h-4 w-4" />
                          已擁有最新版 ({latestVersion.version_code})
                        </span>
                        <span className="text-sm font-semibold text-slate-400">
                          定價 {formatTwd(latestVersion.list_price_twd)}
                        </span>
                      </div>
                    ) : upgradePrice !== null && priorEnt?.ver ? (
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs font-bold text-amber-900">
                            老訂戶 {priorEnt.ver.version_code} 專屬 1/10 升級價
                          </span>
                          <span className="text-xs text-slate-400 line-through">
                            新版原價 {formatTwd(latestVersion.list_price_twd)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-2xl font-extrabold text-amber-700">
                            {formatTwd(upgradePrice)}
                          </span>
                          <span className="text-xs text-amber-800">
                            （原購價 {formatTwd(priorBaseAmount!)} × 1/10）
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs font-medium text-slate-500">
                            單本數位授權定價（{latestVersion.version_code}）
                          </span>
                          <div className="text-2xl font-extrabold text-slate-900">
                            {formatTwd(latestVersion.list_price_twd)}
                          </div>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          含線上閱讀 ＋ PDF
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        href={`/reader/${book.slug}/${latestVersion.version_code}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {ownsLatest ? '立即閱讀' : '免費試讀第 1 章'}
                      </Link>
                      <Link
                        href={`/books/${book.slug}`}
                        className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                      >
                        {ownsLatest
                          ? '書籍詳情'
                          : upgradePrice !== null
                            ? `升級購書 ${formatTwd(upgradePrice)}`
                            : '查看詳情與購書'}
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 1/10 Upgrade Pricing Mechanism Explainer */}
      <section
        id="upgrade-mechanism"
        className="border-y border-slate-200 bg-white py-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">
              Fair & Transparent Upgrade Policy
            </span>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              「單次購書 ＋ 老訂戶 1/10 價格升級新版」運作方式
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              AI 領域日新月異，我們承諾讓早期支持原創內容的讀者享有最公平、透明的版本升級保障：
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                01
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                新讀者直接購買當前最新版
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                首次購買任一電子書之讀者，以頁面標示之新台幣原價單次購買當前最新版本，立即獲得線上章節閱讀與動態個人浮水印 PDF 下載權。
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
                02
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                已購舊版永久保留，絕不覆蓋消失
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                即使作者發佈 v2.0 或 v3.0 大改版，已購買舊版（如 v1.0）之訂戶在個人書櫃中永遠保有原購買舊版的完整線上閱讀與 PDF 下載權限。
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-white">
                03
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900">
                結帳新版自動換算原購價 1/10
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                當老訂戶登入後選購同書目之新版本時，計價引擎自動抓取原購買金額除以 10（四捨五入至整數）。例如原以 NT$ 780 購買 v1.0，升級 v2.0（原價 NT$ 880）僅需支付 <strong>NT$ 78</strong>！
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
