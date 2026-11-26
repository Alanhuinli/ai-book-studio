import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { createServiceAdminClient } from '@/lib/supabase/server';
import { decryptNewebPayTradeInfo, getNewebPayConfig } from '@/lib/payments/newebpay';

export async function POST(request: Request) {
  try {
    const config = getNewebPayConfig();
    if (!config) {
      return NextResponse.json({ error: 'NewebPay not configured' }, { status: 400 });
    }

    const formData = await request.formData();
    const tradeInfo = String(formData.get('TradeInfo') ?? '');
    const tradeSha = String(formData.get('TradeSha') ?? '');

    if (!tradeInfo || !tradeSha) {
      return NextResponse.json({ error: 'Missing TradeInfo or TradeSha' }, { status: 400 });
    }

    const payload = decryptNewebPayTradeInfo(
      tradeInfo,
      tradeSha,
      config.hashKey,
      config.hashIv
    );

    const status = String(payload.Status ?? '');
    const result = (payload.Result ?? {}) as Record<string, unknown>;
    const merchantOrderNo = String(result.MerchantOrderNo ?? '');
    const tradeNo = String(result.TradeNo ?? '');
    const bankCode = result.BankCode ? String(result.BankCode) : null;
    const codeNo = result.CodeNo ? String(result.CodeNo) : null;
    const expireDate = result.ExpireDate ? String(result.ExpireDate) : null;

    const adminClient = createServiceAdminClient();
    if (adminClient && merchantOrderNo) {
      if (status === 'SUCCESS' && !codeNo) {
        await adminClient
          .from('orders')
          .update({
            status: 'paid',
            provider_trade_no: tradeNo || null,
            paid_at: new Date().toISOString(),
          })
          .eq('merchant_order_no', merchantOrderNo);

        metric('checkout.completed', 1, { provider: 'newebpay', outcome: 'success' });
      } else if (codeNo) {
        // ATM Virtual Account issued notification
        await adminClient
          .from('orders')
          .update({
            status: 'awaiting_atm',
            atm_bank_code: bankCode,
            atm_virtual_account: codeNo,
            atm_expire_at: expireDate ? new Date(`${expireDate}T23:59:59+08:00`).toISOString() : null,
            provider_trade_no: tradeNo || null,
          })
          .eq('merchant_order_no', merchantOrderNo);
      }
    }

    return new Response('SUCCESS', { status: 200 });
  } catch (err) {
    metric('checkout.completed', 1, { provider: 'newebpay', outcome: 'error' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook failed' },
      { status: 400 }
    );
  }
}
