'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Lock,
  Moon,
  ShieldAlert,
  Sun,
  Type,
  Unlock,
} from 'lucide-react';
import { MarkdownArticle } from '@/components/MarkdownArticle';
import { formatTwd } from '@/lib/pricing';

interface ChapterViewItem {
  id: string;
  chapterNumber: number;
  title: string;
  previewExcerpt: string;
  estimatedMinutes: number;
  isFreePreview: boolean;
  contentMarkdown: string | null;
}

export function ReaderClient({
  bookId,
  bookSlug,
  bookTitle,
  versionId,
  versionCode,
  allVersions,
  chapters,
  initialChapterNumber,
  hasFullAccess,
  watermarkLabel,
  unlockPriceTwd,
  isUpgradeOffer,
}: {
  bookId: string;
  bookSlug: string;
  bookTitle: string;
  versionId: string;
  versionCode: string;
  allVersions: Array<{ id: string; versionCode: string; isLatest: boolean }>;
  chapters: ChapterViewItem[];
  initialChapterNumber: number;
  hasFullAccess: boolean;
  watermarkLabel: string;
  unlockPriceTwd: number;
  isUpgradeOffer: boolean;
}) {
  const router = useRouter();
  const [currentChapterNum, setCurrentChapterNum] = useState<number>(
    initialChapterNumber
  );
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [copyToast, setCopyToast] = useState(false);

  const activeChapter =
    chapters.find((c) => c.chapterNumber === currentChapterNum) ?? chapters[0];

  const activeIdx = chapters.findIndex((c) => c.id === activeChapter?.id);
  const prevChapter = activeIdx > 0 ? chapters[activeIdx - 1] : null;
  const nextChapter =
    activeIdx >= 0 && activeIdx < chapters.length - 1
      ? chapters[activeIdx + 1]
      : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'p', 's', 'u'].includes(key)) {
        e.preventDefault();
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2400);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerAntiCopyNotice = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2400);
  };

  const containerThemeClass =
    theme === 'dark'
      ? 'bg-slate-950 text-slate-100'
      : theme === 'sepia'
        ? 'bg-[#f8f1e3] text-stone-900'
        : 'bg-slate-50 text-slate-900';

  const cardThemeClass =
    theme === 'dark'
      ? 'border-slate-800 bg-slate-900/95'
      : theme === 'sepia'
        ? 'border-amber-200/80 bg-[#fdf8ee]'
        : 'border-slate-200 bg-white';

  return (
    <div className={`min-h-[calc(100vh-64px)] transition-colors ${containerThemeClass}`}>
      {/* Print protection banner */}
      <div className="print-warning-only hidden p-16 text-center">
        <h2 className="text-2xl font-bold">版權保護聲明 — 艾倫數位書坊 Alan&apos;s AI Press</h2>
        <p className="mt-2">線上防拷章節閱讀器禁止網頁列印，已購訂戶請下載專屬個人浮水印 PDF 閱讀。</p>
      </div>

      {/* Top Reader Toolbar */}
      <div className="sticky top-[65px] z-30 border-b border-slate-200/60 bg-white/90 px-4 py-2.5 text-slate-800 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/books/${bookSlug}`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>書籍頁</span>
            </Link>
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-slate-900">{bookTitle}</span>
            </div>

            {/* Version Switcher */}
            {allVersions.length > 1 && (
              <select
                value={versionCode}
                onChange={(e) =>
                  router.push(`/reader/${bookSlug}/${e.target.value}`)
                }
                aria-label="切換閱讀版本"
                className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 focus:outline-none"
              >
                {allVersions.map((v) => (
                  <option key={v.id} value={v.versionCode}>
                    {v.versionCode} {v.isLatest ? '(最新版)' : '(歷史舊版)'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Controls */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                  theme === 'light' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>淺色</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('sepia')}
                className={`rounded-md px-2 py-1 font-medium ${
                  theme === 'sepia' ? 'bg-[#f8f1e3] text-amber-950 shadow-2xs' : 'text-slate-600'
                }`}
              >
                暖紙
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${
                  theme === 'dark' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-600'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>深色</span>
              </button>
            </div>

            {/* Font Size Controls */}
            <button
              type="button"
              onClick={() =>
                setFontSize((prev) =>
                  prev === 'sm' ? 'base' : prev === 'base' ? 'lg' : 'sm'
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              title="切換字體大小"
            >
              <Type className="h-3.5 w-3.5" />
              <span>{fontSize === 'sm' ? '小字' : fontSize === 'lg' ? '大字' : '標準'}</span>
            </button>

            {hasFullAccess && (
              <a
                href={`/api/books/${bookId}/versions/${versionId}/pdf`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>下載浮水印 PDF</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {copyToast && (
        <div className="fixed right-4 bottom-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-xl">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span>防拷閱讀保護啟動中：本站內容受著作權保護，禁止複製或擷取文字。</span>
        </div>
      )}

      {/* Main Reader Grid */}
      <div className="anti-copy-reader mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12">
        {/* Sidebar Chapter List */}
        <aside className="lg:col-span-4">
          <div className={`rounded-2xl border p-4 ${cardThemeClass}`}>
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-xs font-bold tracking-wider uppercase opacity-70">
                章節目錄 ({versionCode})
              </span>
              <span className="text-xs opacity-60">
                {hasFullAccess ? '完整授權已解鎖' : '試閱模式'}
              </span>
            </div>

            <div className="space-y-1.5">
              {chapters.map((ch) => {
                const isUnlocked = ch.isFreePreview || hasFullAccess;
                const isActive = ch.id === activeChapter?.id;

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setCurrentChapterNum(ch.chapterNumber)}
                    className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                      isActive
                        ? 'bg-indigo-600 font-bold text-white shadow-xs'
                        : 'hover:bg-indigo-500/10'
                    }`}
                  >
                    {isUnlocked ? (
                      <Unlock
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          isActive ? 'text-indigo-200' : 'text-emerald-500'
                        }`}
                      />
                    ) : (
                      <Lock
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          isActive ? 'text-indigo-200' : 'opacity-50'
                        }`}
                      />
                    )}
                    <div className="flex-1">
                      <div className="leading-snug">{ch.title}</div>
                      <div
                        className={`mt-0.5 text-[11px] ${
                          isActive ? 'text-indigo-100' : 'opacity-60'
                        }`}
                      >
                        約 {ch.estimatedMinutes} 分鐘
                        {ch.isFreePreview && !hasFullAccess ? ' · 免費試讀' : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Protected Reading Canvas */}
        <section
          className="lg:col-span-8"
          onContextMenu={triggerAntiCopyNotice}
          onCopy={triggerAntiCopyNotice}
          onCut={triggerAntiCopyNotice}
          onDragStart={triggerAntiCopyNotice}
        >
          {activeChapter && (
            <div
              className={`relative overflow-hidden rounded-2xl border p-6 shadow-xs sm:p-10 ${cardThemeClass}`}
            >
              {/* Diagonal Dynamic Personal Watermark Overlay */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-around overflow-hidden opacity-[0.045]"
              >
                {[0, 1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="-rotate-12 whitespace-nowrap text-center text-sm font-bold tracking-widest"
                  >
                    {watermarkLabel}　·　{watermarkLabel}
                  </div>
                ))}
              </div>

              <div className="relative z-20">
                {activeChapter.contentMarkdown !== null ? (
                  <>
                    <div className="mb-6 flex items-center justify-between border-b border-slate-200/40 pb-3 text-xs opacity-65">
                      <span>
                        {bookTitle} · {versionCode}
                      </span>
                      <span>閱讀防護：{watermarkLabel}</span>
                    </div>

                    <MarkdownArticle
                      content={activeChapter.contentMarkdown}
                      theme={theme}
                      fontSize={fontSize}
                    />
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600">
                      <Lock className="h-7 w-7" />
                    </div>
                    <h2 className="mt-4 text-xl font-bold">{activeChapter.title}</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm opacity-75">
                      {activeChapter.previewExcerpt}
                    </p>
                    <div className="mx-auto mt-6 max-w-md rounded-2xl border border-indigo-200 bg-indigo-50/80 p-5 text-slate-900">
                      <p className="text-sm font-bold text-indigo-950">
                        本章為訂戶專屬完整實戰章節
                      </p>
                      <p className="mt-1 text-xs text-indigo-900/80">
                        購買本版本後即可立即解鎖全部章節線上閱讀，並下載內嵌個人授權浮水印之完整 PDF 電子書。
                      </p>
                      <Link
                        href={`/books/${bookSlug}`}
                        className="mt-4 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                      >
                        {isUpgradeOffer
                          ? `老訂戶享 1/10 優惠升級（${formatTwd(unlockPriceTwd)}）`
                          : `前往購買解鎖全文（${formatTwd(unlockPriceTwd)}）`}
                      </Link>
                    </div>
                  </div>
                )}

                {/* Chapter Footer Pagination */}
                <div className="mt-10 flex items-center justify-between border-t border-slate-200/50 pt-6">
                  {prevChapter ? (
                    <button
                      type="button"
                      onClick={() => setCurrentChapterNum(prevChapter.chapterNumber)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300/60 px-4 py-2 text-xs font-semibold transition hover:bg-indigo-500/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>上一章</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {nextChapter ? (
                    <button
                      type="button"
                      onClick={() => setCurrentChapterNum(nextChapter.chapterNumber)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
                      <span>下一章</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <Link
                      href={`/books/${bookSlug}`}
                      className="text-xs font-semibold text-indigo-500 hover:underline"
                    >
                      返回書籍總覽
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
