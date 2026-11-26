import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: '請先免費註冊或登入會員，即可一鍵領取收入個人書櫃並下載 PDF' },
        { status: 401 }
      );
    }

    const { bookId, bookVersionId } = (await request.json()) as {
      bookId?: string;
      bookVersionId?: string;
    };

    if (!bookId || !bookVersionId) {
      return NextResponse.json({ error: '缺少書籍或版本參數' }, { status: 400 });
    }

    const { data: book } = await supabase
      .from('books')
      .select('id, is_free_full_book, is_published')
      .eq('id', bookId)
      .single();

    if (!book || !book.is_published || !book.is_free_full_book) {
      return NextResponse.json(
        { error: '此書籍目前非免費開放領取狀態' },
        { status: 403 }
      );
    }

    const { data: existing } = await supabase
      .from('user_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('book_version_id', bookVersionId)
      .eq('status', 'active')
      .maybeSingle();

    if (!existing) {
      const { error: insertErr } = await supabase.from('user_entitlements').insert({
        user_id: user.id,
        book_id: bookId,
        book_version_id: bookVersionId,
        paid_amount_twd: 0,
        is_upgrade: false,
        granted_by: 'purchase',
        status: 'active',
      });

      if (insertErr) {
        metric('ebook.free_claimed', 1, { outcome: 'error' });
        return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }
    }

    metric('ebook.free_claimed', 1, { outcome: 'success' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    metric('ebook.free_claimed', 1, { outcome: 'error' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '領取免費電子書失敗' },
      { status: 500 }
    );
  }
}
