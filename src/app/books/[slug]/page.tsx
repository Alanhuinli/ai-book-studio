import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  History,
  Lock,
  Unlock,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CheckoutPanel, type VersionQuoteItem } from '@/components/CheckoutPanel';
import { formatTwd } from '@/lib/pricing';
import type { CheckoutQuote } from '@/types/database.types';

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (!book) {
    notFound();
  }

  const { data: versions } = await supabase
    .from('book_versions')
    .select('*')
    .eq('book_id', book.id)
    .order('version_number', { ascending: false });

  if (!versions || versions.length === 0) {
    notFound();
  }

  const latestVersion =
    versions.find((v) => v.id === book.current_version_id) ?? versions[0];

  const { data: chapters } = await supabase
    .from('book_chapters')
    .select('*')
    .eq('book_version_id', latestVersion.id)
    .order('chapter_number', { ascending: true });

  const { data: settings } = await supabase
    .from('site_settings')
    .select('payment_mode')
    .eq('id', 1)
    .maybeSingle();

  // Compute server-verified quote for every version of this book
  const versionQuotes: VersionQuoteItem[] = [];
  for (const ver of versions) {
    const { data: rawQuote } = await supabase.rpc('calculate_checkout_quote', {
      p_book_id: book.id,
      p_target_version_id: ver.id,
    });

    const parsedQuote: CheckoutQuote = rawQuote
      ? (rawQuote as unknown as CheckoutQuote)
      : {
          already_owned: false,
          is_upgrade: false,
          pricing_tier: 'standard',
          list_price_twd: ver.list_price_twd,
          final_price_twd: ver.list_price_twd,
          base_version_id: null,
          base_version_code: null,
          base_paid_amount_twd: null,
        };

    versionQuotes.push({
      id: ver.id,
      version_code: ver.version_code,
      list_price_twd: ver.list_price_twd,
      is_latest: ver.id === latestVersion.id,
      quote: parsedQuote,
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {!book.is_published && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs font-semibold text-amber-900">
          作者預覽模式：本書目前處於「已隱藏下架」狀態，一般訪客與前台書城均不會顯示此書。
        </div>
      )}

      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          首頁
        </Link>
        <span>/</span>
        <Link href="/#books" className="hover:text-indigo-600">
          精選電子書
        </Link>
        <span>/</span>
        <span className="font-medium text-slate-800">{book.title}</span>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        {/* Left Column: Book Content & Chapters */}
        <div className="space-y-8 lg:col-span-7">
          <div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${book.cover_gradient} p-8 text-white shadow-lg sm:p-10`}
          >
            {book.cover_image_url && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="absolute inset-0 h-full w-full object-cover opacity-40"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-indigo-950/40" />
              </>
            )}
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {book.category}
                </span>
                <span className="rounded-full border border-amber-300/40 bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200">
                  當前發行版本：{latestVersion.version_code}
                </span>
              </div>

              <h1 className="mt-5 text-2xl font-extrabold leading-tight sm:text-4xl">
                {book.title}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                {book.subtitle}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-5 border-t border-white/15 pt-5 text-xs text-slate-200">
                <span>作者：{book.author_name}</span>
                <span>頁數規模：約 {latestVersion.page_count} 頁</span>
                <span>呈現格式：全彩圖解線上閱讀器 ＋ 動態個人浮水印 PDF</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/reader/${book.slug}/${latestVersion.version_code}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-100"
                >
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span>
                    {book.is_free_full_book
                      ? `免費線上閱讀全書（全彩圖解版 ${latestVersion.version_code}）`
                      : `免費線上試讀第 1 章（全彩圖解版 ${latestVersion.version_code}）`}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Detailed Description */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">書籍內容簡介與交付規格</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{book.description}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <span>內建線上防拷章節閱讀器</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  支援深色、暖紙護眼與淺色模式及字體縮放，跨手機、平板與電腦免安裝軟體即開即讀。
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <FileDown className="h-4 w-4 text-emerald-600" />
                  <span>動態個人浮水印 PDF 下載</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  伺服器即時為您的帳號生成嵌入專屬授權指紋碼之完整高解析 PDF，支援平板筆記離線閱讀。
                </p>
              </div>
            </div>

            {book.target_audience.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Users className="h-4 w-4 text-indigo-600" />
                  <span>適合讀者對象</span>
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-600">
                  {book.target_audience.map((aud, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{aud}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Table of Contents */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                章節目錄大綱（{latestVersion.version_code}）
              </h2>
              <span className="text-xs text-slate-500">
                共 {(chapters ?? []).length} 章
              </span>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {(chapters ?? []).map((ch) => (
                <div
                  key={ch.id}
                  className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {ch.is_free_preview || book.is_free_full_book ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          <Unlock className="h-3 w-3" />
                          {book.is_free_full_book ? '全書免費開放' : '免費試讀'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          <Lock className="h-3 w-3" />
                          訂戶專屬
                        </span>
                      )}
                      <h3 className="text-sm font-bold text-slate-900">{ch.title}</h3>
                    </div>
                    <p className="text-xs text-slate-500">{ch.preview_excerpt}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      {ch.estimated_minutes} 分鐘
                    </span>
                    {(ch.is_free_preview || book.is_free_full_book) && (
                      <Link
                        href={`/reader/${book.slug}/${latestVersion.version_code}?chapter=${ch.chapter_number}`}
                        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        立即閱讀
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Version Release History */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <History className="h-5 w-5 text-indigo-600" />
              <span>版本演進紀錄與改版保障</span>
            </h2>
            <div className="mt-4 space-y-4">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {ver.version_code}
                      </span>
                      {ver.id === latestVersion.id && (
                        <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                          當前最新版
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      版本原價：{formatTwd(ver.list_price_twd)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    {ver.release_notes}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Sticky Checkout Panel */}
        <div className="lg:col-span-5">
          <div className="sticky top-24">
            <CheckoutPanel
              bookId={book.id}
              bookSlug={book.slug}
              bookTitle={book.title}
              isLoggedIn={Boolean(user)}
              isFreeFullBook={book.is_free_full_book}
              paymentMode={settings?.payment_mode ?? 'sandbox'}
              versionQuotes={versionQuotes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
