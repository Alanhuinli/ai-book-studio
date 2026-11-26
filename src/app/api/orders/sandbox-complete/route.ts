import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '請先登入會員' }, { status: 401 });
    }

    const { orderId } = (await request.json()) as { orderId?: string };
    if (!orderId) {
      return NextResponse.json({ error: '缺少訂單編號' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('complete_sandbox_order', {
      p_order_id: orderId,
    });

    if (error) {
      metric('checkout.completed', 1, { provider: 'sandbox', outcome: 'error' });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    metric('checkout.completed', 1, { provider: 'sandbox', outcome: 'success' });
    return NextResponse.json({ ok: true, result: data });
  } catch (err) {
    metric('checkout.completed', 1, { provider: 'sandbox', outcome: 'error' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '模擬付款核銷失敗' },
      { status: 500 }
    );
  } finally {
    metric('checkout.duration_ms', Math.round(performance.now() - startedAt));
  }
}
