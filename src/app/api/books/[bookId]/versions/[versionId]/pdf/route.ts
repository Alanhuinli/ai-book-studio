import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { createClient } from '@/lib/supabase/server';
import { generateWatermarkedBookPdf } from '@/lib/pdf-watermark';

export async function GET(
  _request: Request,
  context: { params: Promise<{ bookId: string; versionId: string }> }
) {
  const startedAt = performance.now();

  try {
    const { bookId, versionId } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '請先登入會員後下載個人專屬浮水印 PDF' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, email, role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    const { data: entitlement } = await supabase
      .from('user_entitlements')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('book_version_id', versionId)
      .eq('status', 'active')
      .maybeSingle();

    const { data: book } = await supabase
      .from('books')
      .select('id, slug, title, subtitle, author_name, cover_image_url, is_free_full_book, is_published')
      .eq('id', bookId)
      .single();

    const { data: version } = await supabase
      .from('book_versions')
      .select('id, version_code, pdf_storage_path')
      .eq('id', versionId)
      .eq('book_id', bookId)
      .single();

    if (!book || !version) {
      return NextResponse.json({ error: '找不到指定的書籍或版本' }, { status: 404 });
    }

    const canAccessFreeBook = Boolean(book.is_published && book.is_free_full_book);

    if (!entitlement && !isAdmin && !canAccessFreeBook) {
      metric('ebook.pdf_downloaded', 1, { outcome: 'forbidden' });
      return NextResponse.json(
        { error: '您尚未購買此電子書版本的授權，無法下載完整 PDF' },
        { status: 403 }
      );
    }

    const { data: chaptersMeta } = await supabase
      .from('book_chapters')
      .select('id, chapter_number, title')
      .eq('book_version_id', versionId)
      .order('chapter_number', { ascending: true });

    const chapterIds = (chaptersMeta ?? []).map((c) => c.id);
    const { data: chapterBodies } = chapterIds.length
      ? await supabase
          .from('chapter_contents')
          .select('chapter_id, content_markdown')
          .in('chapter_id', chapterIds)
      : { data: [] };

    const bodyMap = new Map(
      (chapterBodies ?? []).map((b) => [b.chapter_id, b.content_markdown])
    );

    let existingPdfBytes: Uint8Array | null = null;
    if (version.pdf_storage_path) {
      const { data: pdfBlob } = await supabase.storage
        .from('ebook-pdfs')
        .download(version.pdf_storage_path);
      if (pdfBlob) {
        existingPdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
      }
    } else {
      const bundledMasterPath = path.join(
        process.cwd(),
        'private-ebooks',
        `${book.slug}-${version.version_code}.pdf`
      );
      try {
        const buf = await fs.readFile(bundledMasterPath);
        existingPdfBytes = new Uint8Array(buf);
      } catch {
        // Fallback to dynamic chapter typesetting when no bundled master PDF exists
      }
    }

    const nowIso = new Date().toISOString();
    const rawFingerprint = `${user.id}:${versionId}:${nowIso}`;
    const hashShort = crypto
      .createHash('sha256')
      .update(rawFingerprint)
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();
    const watermarkFingerprint = `ABS-WM-${hashShort}`;

    await supabase.from('watermark_downloads').insert({
      user_id: user.id,
      book_version_id: versionId,
      entitlement_id: entitlement?.id ?? null,
      watermark_fingerprint: watermarkFingerprint,
    });

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      new URL(_request.url).origin;

    const pdfBytes = await generateWatermarkedBookPdf({
      bookTitle: book.title,
      bookSubtitle: book.subtitle,
      coverImageUrl: book.cover_image_url,
      siteOrigin,
      versionCode: version.version_code,
      authorName: book.author_name,
      readerEmail: user.email ?? profile?.email ?? 'reader',
      readerName: profile?.display_name || '授權訂戶',
      watermarkFingerprint,
      downloadedAtIso: nowIso.replace('T', ' ').slice(0, 19) + ' UTC',
      chapters: (chaptersMeta ?? []).map((ch) => ({
        chapterNumber: ch.chapter_number,
        title: ch.title,
        contentMarkdown: bodyMap.get(ch.id) ?? '',
      })),
      existingPdfBytes,
    });

    metric('ebook.pdf_downloaded', 1, { outcome: 'success' });

    const safeFilename = `${book.slug}-${version.version_code}-watermarked.pdf`;
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    });
  } catch (err) {
    metric('ebook.pdf_downloaded', 1, { outcome: 'error' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '生成動態個人浮水印 PDF 失敗' },
      { status: 500 }
    );
  } finally {
    metric('ebook.pdf_render_ms', Math.round(performance.now() - startedAt));
  }
}
