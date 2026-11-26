'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpenCheck,
  BookPlus,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  FileUp,
  Layers,
  Loader2,
  Plus,
  ReceiptText,
  Settings,
  Trash2,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatTwd } from '@/lib/pricing';
import type { Tables } from '@/types/database.types';

interface ChapterDraft {
  title: string;
  previewExcerpt: string;
  estimatedMinutes: number;
  isFreePreview: boolean;
  contentMarkdown: string;
}

export function AdminDashboardClient({
  books,
  versions,
  orders,
  profiles,
  entitlements,
  siteSettings,
}: {
  books: Tables<'books'>[];
  versions: Tables<'book_versions'>[];
  orders: Tables<'orders'>[];
  profiles: Tables<'profiles'>[];
  entitlements: Tables<'user_entitlements'>[];
  siteSettings: Tables<'site_settings'>;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'catalog' | 'orders' | 'new_book' | 'new_version' | 'users' | 'settings'
  >('catalog');
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // --- New Book State ---
  const [nbSlug, setNbSlug] = useState('');
  const [nbTitle, setNbTitle] = useState('');
  const [nbSubtitle, setNbSubtitle] = useState('');
  const [nbCategory, setNbCategory] = useState('AI 實戰應用');
  const [nbSummary, setNbSummary] = useState('');
  const [nbDescription, setNbDescription] = useState('');
  const [nbPrice, setNbPrice] = useState(680);
  const [nbPdfFile, setNbPdfFile] = useState<File | null>(null);
  const [nbChapters, setNbChapters] = useState<ChapterDraft[]>([
    {
      title: '第 1 章：核心觀念與免費試讀導覽',
      previewExcerpt: '免費試讀章節摘要說明。',
      estimatedMinutes: 15,
      isFreePreview: true,
      contentMarkdown: '# 第 1 章：核心觀念與免費試讀導覽\n\n請在此輸入第一章 Markdown 正文內容...',
    },
    {
      title: '第 2 章：進階架構與完整實作指南',
      previewExcerpt: '訂戶專屬完整實戰解析。',
      estimatedMinutes: 25,
      isFreePreview: false,
      contentMarkdown: '# 第 2 章：進階架構與完整實作指南\n\n請在此輸入付費章節內容...',
    },
  ]);

  // --- New Version State (v2.0 / v3.0) ---
  const [nvBookId, setNvBookId] = useState<string>(books[0]?.id ?? '');
  const [nvVersionCode, setNvVersionCode] = useState('v2.0');
  const [nvVersionNumber, setNvVersionNumber] = useState('2.0');
  const [nvPrice, setNvPrice] = useState(980);
  const [nvPageCount, setNvPageCount] = useState(220);
  const [nvReleaseNotes, setNvReleaseNotes] = useState('');
  const [nvPdfFile, setNvPdfFile] = useState<File | null>(null);
  const [nvExtraChapterTitle, setNvExtraChapterTitle] = useState(
    '全新改版擴充章節：2026 最新 AI 架構實戰'
  );
  const [nvExtraChapterBody, setNvExtraChapterBody] = useState(
    '# 全新改版擴充章節\n\n本章為新版本專屬新增內容，已購舊版老訂戶可透過原購價 1/10 優惠升級解鎖閱讀！'
  );

  // --- Grant Entitlement State ---
  const [grantUserId, setGrantUserId] = useState<string>(profiles[0]?.id ?? '');
  const [grantVersionId, setGrantVersionId] = useState<string>(versions[0]?.id ?? '');
  const [grantPaidBasis, setGrantPaidBasis] = useState<number>(780);

  // --- Site Settings State ---
  const [stBusinessEntity, setStBusinessEntity] = useState(
    siteSettings.business_entity
  );
  const [stSupportEmail, setStSupportEmail] = useState(siteSettings.support_email);
  const [stSupportPhone, setStSupportPhone] = useState(siteSettings.support_phone);
  const [stAddress, setStAddress] = useState(siteSettings.business_address);
  const [stHours, setStHours] = useState(siteSettings.service_hours);
  const [stPaymentMode, setStPaymentMode] = useState(siteSettings.payment_mode);

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const versionMap = new Map(versions.map((v) => [v.id, v]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const paidOrders = orders.filter((o) => o.status === 'paid');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.amount_twd, 0);
  const upgradeCount = paidOrders.filter(
    (o) => o.pricing_tier === 'upgrade_10pct'
  ).length;

  const notify = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmOrderPaid = async (orderId: string) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);
      if (error) throw error;
      notify('ok', '訂單已確認入帳，並已自動為該訂戶開通對應版本閱讀權限！');
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '確認入帳失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const cleanSlug = nbSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-');

      if (!cleanSlug) throw new Error('請輸入有效的英文網址代稱（Slug）');

      const { data: createdBook, error: bookErr } = await supabase
        .from('books')
        .insert({
          slug: cleanSlug,
          title: nbTitle.trim(),
          subtitle: nbSubtitle.trim(),
          category: nbCategory.trim(),
          summary: nbSummary.trim(),
          description: nbDescription.trim() || nbSummary.trim(),
          highlights: [
            '內建線上防拷章節閱讀器永久存取權',
            '支援個人專屬動態浮水印 PDF 下載',
            '未來改版享老訂戶原購價 1/10 升級優惠',
          ],
          target_audience: ['AI 應用實踐者與數位知識工作者'],
          sort_order: books.length + 1,
          is_published: true,
        })
        .select('*')
        .single();

      if (bookErr || !createdBook) throw bookErr ?? new Error('新增書籍失敗');

      let uploadedPath: string | null = null;
      if (nbPdfFile) {
        const storagePath = `${createdBook.slug}/v1.0-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from('ebook-pdfs')
          .upload(storagePath, nbPdfFile, { upsert: true });
        if (upErr) throw upErr;
        uploadedPath = storagePath;
      }

      const { data: createdVer, error: verErr } = await supabase
        .from('book_versions')
        .insert({
          book_id: createdBook.id,
          version_code: 'v1.0',
          version_number: 1.0,
          list_price_twd: Number(nbPrice),
          release_notes: 'v1.0 首發正式版上架。',
          page_count: 160,
          pdf_storage_path: uploadedPath,
          is_latest: true,
        })
        .select('*')
        .single();

      if (verErr || !createdVer) throw verErr ?? new Error('新增版本失敗');

      await supabase
        .from('books')
        .update({ current_version_id: createdVer.id })
        .eq('id', createdBook.id);

      for (let i = 0; i < nbChapters.length; i++) {
        const ch = nbChapters[i];
        const { data: chRow, error: chErr } = await supabase
          .from('book_chapters')
          .insert({
            book_version_id: createdVer.id,
            chapter_number: i + 1,
            title: ch.title,
            preview_excerpt: ch.previewExcerpt,
            estimated_minutes: Number(ch.estimatedMinutes) || 15,
            is_free_preview: ch.isFreePreview,
          })
          .select('*')
          .single();

        if (chErr || !chRow) throw chErr ?? new Error('新增章節失敗');

        const { error: bodyErr } = await supabase
          .from('chapter_contents')
          .insert({
            chapter_id: chRow.id,
            content_markdown: ch.contentMarkdown,
          });
        if (bodyErr) throw bodyErr;
      }

      notify('ok', `新電子書《${createdBook.title}》v1.0 已成功上架發佈！`);
      setNbSlug('');
      setNbTitle('');
      setNbSubtitle('');
      setNbSummary('');
      setNbDescription('');
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '上架電子書失敗');
    } finally {
      setBusy(false);
    }
  };

  const handlePublishNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const targetBook = bookMap.get(nvBookId);
      if (!targetBook) throw new Error('請選擇目標書籍');

      let uploadedPath: string | null = null;
      if (nvPdfFile) {
        const storagePath = `${targetBook.slug}/${nvVersionCode.trim()}-${Date.now()}.pdf`;
        const { error: upErr } = await supabase.storage
          .from('ebook-pdfs')
          .upload(storagePath, nvPdfFile, { upsert: true });
        if (upErr) throw upErr;
        uploadedPath = storagePath;
      }

      // Mark previous versions is_latest = false (their user_entitlements stay 100% intact!)
      await supabase
        .from('book_versions')
        .update({ is_latest: false })
        .eq('book_id', targetBook.id);

      const { data: newVer, error: nvErr } = await supabase
        .from('book_versions')
        .insert({
          book_id: targetBook.id,
          version_code: nvVersionCode.trim(),
          version_number: parseFloat(nvVersionNumber),
          list_price_twd: Number(nvPrice),
          page_count: Number(nvPageCount) || 200,
          release_notes:
            nvReleaseNotes.trim() ||
            `${nvVersionCode.trim()} 重大改版發佈！已購舊版訂戶享原購買金額 1/10 優惠升級。`,
          pdf_storage_path: uploadedPath,
          is_latest: true,
        })
        .select('*')
        .single();

      if (nvErr || !newVer) throw nvErr ?? new Error('建立新版本失敗');

      // Clone chapters from previous current_version_id and append the new upgrade chapter
      let nextChapterNo = 1;
      if (targetBook.current_version_id) {
        const { data: prevChapters } = await supabase
          .from('book_chapters')
          .select('*')
          .eq('book_version_id', targetBook.current_version_id)
          .order('chapter_number', { ascending: true });

        const prevIds = (prevChapters ?? []).map((c) => c.id);
        const { data: prevBodies } = prevIds.length
          ? await supabase
              .from('chapter_contents')
              .select('chapter_id, content_markdown')
              .in('chapter_id', prevIds)
          : { data: [] };

        const prevBodyMap = new Map(
          (prevBodies ?? []).map((b) => [b.chapter_id, b.content_markdown])
        );

        for (const pch of prevChapters ?? []) {
          const { data: clonedCh } = await supabase
            .from('book_chapters')
            .insert({
              book_version_id: newVer.id,
              chapter_number: nextChapterNo,
              title: pch.title,
              preview_excerpt: pch.preview_excerpt,
              estimated_minutes: pch.estimated_minutes,
              is_free_preview: pch.is_free_preview,
            })
            .select('*')
            .single();

          if (clonedCh) {
            await supabase.from('chapter_contents').insert({
              chapter_id: clonedCh.id,
              content_markdown: prevBodyMap.get(pch.id) ?? '',
            });
          }
          nextChapterNo += 1;
        }
      }

      if (nvExtraChapterTitle.trim()) {
        const { data: extraCh } = await supabase
          .from('book_chapters')
          .insert({
            book_version_id: newVer.id,
            chapter_number: nextChapterNo,
            title: `第 ${nextChapterNo} 章（${newVer.version_code} 新增）：${nvExtraChapterTitle.trim()}`,
            preview_excerpt: `${newVer.version_code} 改版重點擴充實戰章節。`,
            estimated_minutes: 25,
            is_free_preview: nextChapterNo === 1,
          })
          .select('*')
          .single();

        if (extraCh) {
          await supabase.from('chapter_contents').insert({
            chapter_id: extraCh.id,
            content_markdown: nvExtraChapterBody,
          });
        }
      }

      await supabase
        .from('books')
        .update({
          current_version_id: newVer.id,
          cover_badge: `最新改版 ${newVer.version_code}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetBook.id);

      notify(
        'ok',
        `《${targetBook.title}》新版本 ${newVer.version_code} 已正式發佈！所有舊版訂戶自動啟用 1/10 原購價升級優惠！`
      );
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '發佈新版本失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleGrantEntitlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const ver = versionMap.get(grantVersionId);
      if (!grantUserId || !ver) throw new Error('請選擇會員與書籍版本');

      const { error } = await supabase.from('user_entitlements').upsert(
        {
          user_id: grantUserId,
          book_id: ver.book_id,
          book_version_id: ver.id,
          paid_amount_twd: Number(grantPaidBasis) || 0,
          is_upgrade: false,
          granted_by: 'admin_grant',
          status: 'active',
        },
        { onConflict: 'user_id,book_version_id' }
      );
      if (error) throw error;
      notify('ok', '已成功開通該會員之指定書籍版本閱讀權限！');
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '授權失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeEntitlement = async (entId: string) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('user_entitlements')
        .update({ status: 'revoked' })
        .eq('id', entId);
      if (error) throw error;
      notify('ok', '已停用該筆閱讀授權。');
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '操作失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('site_settings')
        .update({
          business_entity: stBusinessEntity.trim(),
          support_email: stSupportEmail.trim(),
          support_phone: stSupportPhone.trim(),
          business_address: stAddress.trim(),
          service_hours: stHours.trim(),
          payment_mode: stPaymentMode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);
      if (error) throw error;
      notify('ok', '全站頁尾金流審核客服資訊與預設金流模式已更新儲存！');
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '儲存設定失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleBookPublish = async (book: Tables<'books'>) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const nextState = !book.is_published;
      const { error } = await supabase
        .from('books')
        .update({
          is_published: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', book.id);
      if (error) throw error;
      notify(
        'ok',
        nextState
          ? `《${book.title}》已重新公開上架至前台書城！`
          : `《${book.title}》已隱藏下架（前台書城不再顯示，既有訂戶閱讀權仍完整保留）。`
      );
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '切換上下架狀態失敗');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBook = async (book: Tables<'books'>) => {
    setBusy(true);
    try {
      const supabase = createClient();
      // Remove any associated test orders first so ON DELETE RESTRICT doesn't block cleanup
      const { error: ordDelErr } = await supabase
        .from('orders')
        .delete()
        .eq('book_id', book.id);
      if (ordDelErr) throw ordDelErr;

      const { error: bookDelErr } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id);
      if (bookDelErr) throw bookDelErr;

      setConfirmDeleteBookId(null);
      notify('ok', `已永久刪除《${book.title}》及其所有版本與章節資料。`);
      router.refresh();
    } catch (err) {
      notify('err', err instanceof Error ? err.message : '刪除書籍失敗');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">累計已結清營收</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-900">
            {formatTwd(totalRevenue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">已完成訂單數 / 總訂單</p>
          <p className="mt-1 text-2xl font-extrabold text-indigo-700">
            {paidOrders.length} <span className="text-sm font-normal text-slate-400">/ {orders.length}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">老訂戶 1/10 升級成交數</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">
            {upgradeCount} 筆
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">上架書目 / 總發行版本</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700">
            {books.length} 本 / {versions.length} 版
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-4 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpenCheck className="h-4 w-4" />
          <span>書目上下架／刪除管理</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'orders'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ReceiptText className="h-4 w-4" />
          <span>訂單與發票檢視</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('new_book')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'new_book'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookPlus className="h-4 w-4" />
          <span>上傳新電子書</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('new_version')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'new_version'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>發佈新版本 (v2.0 / v3.0)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'users'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>訂戶權限管理</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition ${
            activeTab === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>金流與審核頁尾設定</span>
        </button>
      </div>

      {/* Tab 0: Catalog Management (Publish / Unpublish / Delete) */}
      {activeTab === 'catalog' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-6 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                全站電子書書目上下架與刪除管理
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                金流審核期間建議保留 3 本示範書為「上架中」；審核通過後可一鍵「隱藏下架」或「永久刪除」示範書，換上您的正式作品。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('new_book')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>新增電子書</span>
            </button>
          </div>

          {books.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              目前尚無任何書籍，請點擊右上角「新增電子書」建立您的第一本作品。
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {books.map((b) => {
                const bVersions = versions
                  .filter((v) => v.book_id === b.id)
                  .sort((x, y) => Number(y.version_number) - Number(x.version_number));
                const latestVer =
                  bVersions.find((v) => v.id === b.current_version_id) ??
                  bVersions[0];
                const isConfirmingDelete = confirmDeleteBookId === b.id;

                return (
                  <div
                    key={b.id}
                    className="flex flex-col justify-between gap-4 p-6 transition hover:bg-slate-50/60 lg:flex-row lg:items-center"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {b.is_published ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <Eye className="h-3 w-3" />
                            公開上架中
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                            <EyeOff className="h-3 w-3" />
                            已隱藏下架
                          </span>
                        )}
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                          {b.category}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                          {b.title}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-500">
                        網址代稱：<code className="text-slate-700">/books/{b.slug}</code>
                        {latestVer && (
                          <>
                            　｜　當前版本：<strong>{latestVer.version_code}</strong>（
                            {formatTwd(latestVer.list_price_twd)}）　｜　共{' '}
                            {bVersions.length} 個發行版本
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/books/${b.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>預覽頁面</span>
                      </Link>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleToggleBookPublish(b)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:opacity-60 ${
                          b.is_published
                            ? 'border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {b.is_published ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>隱藏下架</span>
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>重新上架</span>
                          </>
                        )}
                      </button>

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5">
                          <span className="text-xs font-bold text-rose-800">
                            確定永久刪除？
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDeleteBook(b)}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700"
                          >
                            確認刪除
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmDeleteBookId(null)}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmDeleteBookId(b.id)}
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>刪除</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">全站訂單明細與電子發票資訊</h2>
          </div>
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">目前尚無訂單紀錄。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">訂單編號</th>
                    <th className="px-4 py-3 font-semibold">訂戶信箱</th>
                    <th className="px-4 py-3 font-semibold">書籍版本</th>
                    <th className="px-4 py-3 font-semibold">方案 / 金額</th>
                    <th className="px-4 py-3 font-semibold">電子發票載具 / 統編</th>
                    <th className="px-4 py-3 font-semibold">狀態</th>
                    <th className="px-4 py-3 font-semibold">管理操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const b = bookMap.get(o.book_id);
                    const v = versionMap.get(o.book_version_id);
                    const p = profileMap.get(o.user_id);
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {o.merchant_order_no}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {p?.email ?? o.user_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {b?.title ?? ''} ({v?.version_code ?? ''})
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900">
                            {formatTwd(o.amount_twd)}
                          </span>
                          {o.pricing_tier === 'upgrade_10pct' && (
                            <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                              1/10 升級
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {o.invoice_type === 'mobile_barcode'
                            ? `載具 ${o.invoice_carrier_code}`
                            : o.invoice_type === 'company_tax_id'
                              ? `統編 ${o.company_tax_id} (${o.company_title})`
                              : '會員雲端'}
                        </td>
                        <td className="px-4 py-3">
                          {o.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              已收款
                            </span>
                          ) : (
                            <span className="font-semibold text-amber-700">
                              {o.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {o.status !== 'paid' && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleConfirmOrderPaid(o.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-white font-semibold hover:bg-emerald-700"
                            >
                              手動確認入帳
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Upload New Book */}
      {activeTab === 'new_book' && (
        <form
          onSubmit={handleCreateBook}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 sm:p-8"
        >
          <h2 className="text-lg font-bold text-slate-900">上架全新原創電子書（初版 v1.0）</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                網址英文代稱（Slug，例如 prompt-mastery）
              </label>
              <input
                type="text"
                required
                value={nbSlug}
                onChange={(e) => setNbSlug(e.target.value)}
                placeholder="ai-agent-design-guide"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                單本初版定價（NT$ 新台幣整數）
              </label>
              <input
                type="number"
                required
                min={50}
                value={nbPrice}
                onChange={(e) => setNbPrice(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700">電子書書名</label>
              <input
                type="text"
                required
                value={nbTitle}
                onChange={(e) => setNbTitle(e.target.value)}
                placeholder="輸入完整繁體中文書名"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">主題分類</label>
              <input
                type="text"
                required
                value={nbCategory}
                onChange={(e) => setNbCategory(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">書籍副標題</label>
            <input
              type="text"
              required
              value={nbSubtitle}
              onChange={(e) => setNbSubtitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">首頁卡片精簡摘要</label>
            <textarea
              rows={2}
              required
              value={nbSummary}
              onChange={(e) => setNbSummary(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">書籍詳細介紹說明</label>
            <textarea
              rows={3}
              value={nbDescription}
              onChange={(e) => setNbDescription(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4">
            <label className="flex items-center gap-2 text-xs font-bold text-indigo-950">
              <FileUp className="h-4 w-4 text-indigo-600" />
              <span>選填：上傳排版母檔 PDF（若未上傳，系統將自動依下方章節即時排版生成浮水印 PDF）</span>
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNbPdfFile(e.target.files?.[0] ?? null)}
              className="mt-2 block text-xs text-slate-600"
            />
          </div>

          {/* Chapters Editor */}
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">線上閱讀器章節內容設定</h3>
              <button
                type="button"
                onClick={() =>
                  setNbChapters((prev) => [
                    ...prev,
                    {
                      title: `第 ${prev.length + 1} 章：新章節標題`,
                      previewExcerpt: '章節重點摘要',
                      estimatedMinutes: 20,
                      isFreePreview: false,
                      contentMarkdown: `# 第 ${prev.length + 1} 章\n\n請輸入本章正文...`,
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>新增章節</span>
              </button>
            </div>

            {nbChapters.map((ch, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    required
                    value={ch.title}
                    onChange={(e) => {
                      const next = [...nbChapters];
                      next[idx].title = e.target.value;
                      setNbChapters(next);
                    }}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold"
                  />
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={ch.isFreePreview}
                      onChange={(e) => {
                        const next = [...nbChapters];
                        next[idx].isFreePreview = e.target.checked;
                        setNbChapters(next);
                      }}
                    />
                    <span>開放免費試讀</span>
                  </label>
                  {nbChapters.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setNbChapters((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <textarea
                  rows={4}
                  required
                  value={ch.contentMarkdown}
                  onChange={(e) => {
                    const next = [...nbChapters];
                    next[idx].contentMarkdown = e.target.value;
                    setNbChapters(next);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>立即發佈上架新電子書</span>
          </button>
        </form>
      )}

      {/* Tab 3: Publish New Version (v2.0 / v3.0) */}
      {activeTab === 'new_version' && (
        <form
          onSubmit={handlePublishNewVersion}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 sm:p-8"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              發佈電子書重大改版（v2.0 ／ v3.0 老訂戶 1/10 升級引擎）
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              發佈新版後，系統將自動繼承既有章節並附加新版擴充章節；舊版訂戶永久保有舊版閱讀權，且結帳本新版時自動換算為「原購買金額 × 1/10（四捨五入至整數）」！
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">選擇要改版之電子書</label>
              <select
                value={nvBookId}
                onChange={(e) => setNvBookId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  新版代號（如 v2.0 / v3.0）
                </label>
                <input
                  type="text"
                  required
                  value={nvVersionCode}
                  onChange={(e) => setNvVersionCode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  排序版號數值（如 2.0）
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={nvVersionNumber}
                  onChange={(e) => setNvVersionNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                新版本新讀者標準原價（NT$）
              </label>
              <input
                type="number"
                required
                min={50}
                value={nvPrice}
                onChange={(e) => setNvPrice(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">新版估計頁數</label>
              <input
                type="number"
                required
                value={nvPageCount}
                onChange={(e) => setNvPageCount(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              改版更新說明（Release Notes）
            </label>
            <textarea
              rows={2}
              required
              value={nvReleaseNotes}
              onChange={(e) => setNvReleaseNotes(e.target.value)}
              placeholder="說明本次改版新增哪些實戰案例、架構更新與修訂重點..."
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <label className="block text-xs font-bold text-slate-800">
              新版擴充章節標題（將自動附加於既有章節之後）
            </label>
            <input
              type="text"
              value={nvExtraChapterTitle}
              onChange={(e) => setNvExtraChapterTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold"
            />
            <textarea
              rows={4}
              value={nvExtraChapterBody}
              onChange={(e) => setNvExtraChapterBody(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700">
              選填：上傳此新版本專屬 PDF 母檔
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setNvPdfFile(e.target.files?.[0] ?? null)}
              className="mt-1.5 block text-xs text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>發佈新版本並開放老訂戶 1/10 升級</span>
          </button>
        </form>
      )}

      {/* Tab 4: Subscribers & Entitlements */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <form
            onSubmit={handleGrantEntitlement}
            className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-slate-900">
              手動授予訂戶書籍版本權限（支援公關贈書或補發舊版資格）
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">選擇註冊會員</label>
                <select
                  value={grantUserId}
                  onChange={(e) => setGrantUserId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email} ({p.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">選擇書籍與版本</label>
                <select
                  value={grantVersionId}
                  onChange={(e) => setGrantVersionId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                >
                  {versions.map((v) => {
                    const b = bookMap.get(v.book_id);
                    return (
                      <option key={v.id} value={v.id}>
                        {b?.title} — {v.version_code} ({formatTwd(v.list_price_twd)})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  視同原購基準金額（供日後 1/10 升級換算）
                </label>
                <input
                  type="number"
                  min={0}
                  value={grantPaidBasis}
                  onChange={(e) => setGrantPaidBasis(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
            >
              立即授予閱讀與 PDF 下載權限
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-sm font-bold text-slate-900">目前已開通之訂戶版本授權清單</h3>
            </div>
            {entitlements.length === 0 ? (
              <p className="p-6 text-xs text-slate-500">尚無訂戶授權紀錄。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">訂戶信箱</th>
                      <th className="px-4 py-3">書籍與版本</th>
                      <th className="px-4 py-3">實付/基準金額</th>
                      <th className="px-4 py-3">來源</th>
                      <th className="px-4 py-3">狀態</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entitlements.map((e) => {
                      const p = profileMap.get(e.user_id);
                      const b = bookMap.get(e.book_id);
                      const v = versionMap.get(e.book_version_id);
                      return (
                        <tr key={e.id}>
                          <td className="px-4 py-3">{p?.email ?? e.user_id.slice(0, 8)}</td>
                          <td className="px-4 py-3 font-medium">
                            {b?.title} ({v?.version_code})
                          </td>
                          <td className="px-4 py-3">{formatTwd(e.paid_amount_twd)}</td>
                          <td className="px-4 py-3">
                            {e.is_upgrade
                              ? '老訂戶 1/10 升級'
                              : e.granted_by === 'admin_grant'
                                ? '管理員授權'
                                : '標準購買'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                e.status === 'active'
                                  ? 'font-semibold text-emerald-700'
                                  : 'text-rose-600'
                              }
                            >
                              {e.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {e.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => handleRevokeEntitlement(e.id)}
                                className="text-rose-600 hover:underline"
                              >
                                撤銷權限
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Payment Gateway & Footer Audit Settings */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 sm:p-8"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              台灣金流（藍新 NewebPay ／ 綠界 ECPay）與頁尾審核客服設定
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              提交金流審核前，可於此處即時更新顯示於全站頁尾之真實聯絡電話、營業/通訊地址與收款閘道模式。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                金流收款模式
              </label>
              <select
                value={stPaymentMode}
                onChange={(e) => setStPaymentMode(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              >
                <option value="sandbox">
                  內建沙盒模擬結帳（審核期間與測試流程預設推薦）
                </option>
                <option value="newebpay">
                  藍新金流 NewebPay MPG（讀取環境變數 NEWEBPAY_*）
                </option>
                <option value="ecpay">
                  綠界科技 ECPay 全方位金流（讀取環境變數 ECPAY_*）
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                營運主體／商號顯示名稱
              </label>
              <input
                type="text"
                required
                value={stBusinessEntity}
                onChange={(e) => setStBusinessEntity(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                客服聯絡信箱（頁尾公開顯示）
              </label>
              <input
                type="email"
                required
                value={stSupportEmail}
                onChange={(e) => setStSupportEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                客服聯絡電話（頁尾公開顯示）
              </label>
              <input
                type="text"
                required
                value={stSupportPhone}
                onChange={(e) => setStSupportPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                客服服務時間
              </label>
              <input
                type="text"
                required
                value={stHours}
                onChange={(e) => setStHours(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                聯絡地址／營業登記地址
              </label>
              <input
                type="text"
                required
                value={stAddress}
                onChange={(e) => setStAddress(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>儲存頁尾與金流設定</span>
          </button>
        </form>
      )}
    </div>
  );
}
