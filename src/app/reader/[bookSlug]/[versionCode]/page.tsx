import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReaderClient } from './ReaderClient';
import type { CheckoutQuote } from '@/types/database.types';

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookSlug: string; versionCode: string }>;
  searchParams: Promise<{ chapter?: string }>;
}) {
  const { bookSlug, versionCode } = await params;
  const { chapter } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('slug', bookSlug)
    .maybeSingle();

  if (!book) {
    notFound();
  }

  const { data: versions } = await supabase
    .from('book_versions')
    .select('*')
    .eq('book_id', book.id)
    .order('version_number', { ascending: false });

  const decodedVersionCode = decodeURIComponent(versionCode);
  const targetVersion = (versions ?? []).find(
    (v) => v.version_code === decodedVersionCode
  );

  if (!targetVersion) {
    notFound();
  }

  let isAdmin = false;
  let hasEntitlement = false;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    isAdmin = profile?.role === 'admin';

    const { data: ent } = await supabase
      .from('user_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_version_id', targetVersion.id)
      .eq('status', 'active')
      .maybeSingle();

    hasEntitlement = Boolean(ent);
  }

  const hasFullAccess = isAdmin || hasEntitlement;

  const { data: chaptersMeta } = await supabase
    .from('book_chapters')
    .select('*')
    .eq('book_version_id', targetVersion.id)
    .order('chapter_number', { ascending: true });

  const chapterIds = (chaptersMeta ?? []).map((c) => c.id);
  // RLS on chapter_contents automatically returns ONLY free preview chapters or authorized chapters!
  const { data: authorizedContents } = chapterIds.length
    ? await supabase
        .from('chapter_contents')
        .select('chapter_id, content_markdown')
        .in('chapter_id', chapterIds)
    : { data: [] };

  const contentMap = new Map(
    (authorizedContents ?? []).map((item) => [item.chapter_id, item.content_markdown])
  );

  const { data: rawQuote } = await supabase.rpc('calculate_checkout_quote', {
    p_book_id: book.id,
    p_target_version_id: targetVersion.id,
  });

  const quote = rawQuote as unknown as CheckoutQuote | null;

  const initialChapterNumber = Number(chapter) || 1;
  const watermarkLabel = user?.email
    ? `授權訂戶：${user.email} · Alan's AI Press`
    : "免費試閱模式 · 艾倫數位書坊 Alan's AI Press";

  return (
    <ReaderClient
      bookId={book.id}
      bookSlug={book.slug}
      bookTitle={book.title}
      versionId={targetVersion.id}
      versionCode={targetVersion.version_code}
      allVersions={(versions ?? []).map((v) => ({
        id: v.id,
        versionCode: v.version_code,
        isLatest: v.id === book.current_version_id,
      }))}
      chapters={(chaptersMeta ?? []).map((c) => ({
        id: c.id,
        chapterNumber: c.chapter_number,
        title: c.title,
        previewExcerpt: c.preview_excerpt,
        estimatedMinutes: c.estimated_minutes,
        isFreePreview: c.is_free_preview || book.is_free_full_book,
        contentMarkdown: contentMap.get(c.id) ?? null,
      }))}
      initialChapterNumber={initialChapterNumber}
      hasFullAccess={hasFullAccess}
      watermarkLabel={watermarkLabel}
      unlockPriceTwd={quote?.final_price_twd ?? targetVersion.list_price_twd}
      isUpgradeOffer={Boolean(quote?.is_upgrade)}
    />
  );
}
