import { metric } from '@vercel/functions';
import { createServiceAdminClient } from '@/lib/supabase/server';
import { computeECPayCheckMacValue, getECPayConfig } from '@/lib/payments/ecpay';

export async function POST(request: Request) {
  try {
    const config = getECPayConfig();
    if (!config) {
      return new Response('0|ECPayNotConfigured', { status: 400 });
    }

    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((val, key) => {
      params[key] = String(val);
    });

    const receivedMac = params.CheckMacValue ?? '';
    const expectedMac = computeECPayCheckMacValue(params, config.hashKey, config.hashIv);

    if (!receivedMac || receivedMac.toUpperCase() !== expectedMac) {
      metric('checkout.completed', 1, { provider: 'ecpay', outcome: 'invalid_mac' });
      return new Response('0|CheckMacValueError', { status: 400 });
    }

    const rtnCode = params.RtnCode;
    const merchantTradeNo = params.MerchantTradeNo;
    const tradeNo = params.TradeNo;
    const adminClient = createServiceAdminClient();

    if (adminClient && merchantTradeNo) {
      if (rtnCode === '1') {
        // Payment completed
        await adminClient
          .from('orders')
          .update({
            status: 'paid',
            provider_trade_no: tradeNo || null,
            paid_at: new Date().toISOString(),
          })
          .eq('merchant_order_no', merchantTradeNo);

        metric('checkout.completed', 1, { provider: 'ecpay', outcome: 'success' });
      } else if (rtnCode === '2' && params.vAccount) {
        // ATM Virtual Account assigned
        await adminClient
          .from('orders')
          .update({
            status: 'awaiting_atm',
            atm_bank_code: params.BankCode || null,
            atm_virtual_account: params.vAccount,
            atm_expire_at: params.ExpireDate
              ? new Date(`${params.ExpireDate.replace(/\//g, '-')}T23:59:59+08:00`).toISOString()
              : null,
            provider_trade_no: tradeNo || null,
          })
          .eq('merchant_order_no', merchantTradeNo);
      }
    }

    return new Response('1|OK', { status: 200 });
  } catch {
    metric('checkout.completed', 1, { provider: 'ecpay', outcome: 'error' });
    return new Response('0|ServerError', { status: 500 });
  }
}
