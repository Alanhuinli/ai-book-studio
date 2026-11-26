import { NextResponse } from 'next/server';
import { metric } from '@vercel/functions';
import { createClient } from '@/lib/supabase/server';
import { generateMerchantOrderNo } from '@/lib/pricing';
import { buildNewebPayFormPayload, getNewebPayConfig } from '@/lib/payments/newebpay';
import { buildECPayFormPayload, getECPayConfig } from '@/lib/payments/ecpay';

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '請先登入會員後再進行結帳' }, { status: 401 });
    }

    const body = await request.json();
    const {
      bookId,
      bookVersionId,
      paymentMethod,
      consentNoRefundDigital,
      invoiceType = 'personal_cloud',
      invoiceCarrierCode = '',
      companyTaxId = '',
      companyTitle = '',
    } = body as {
      bookId?: string;
      bookVersionId?: string;
      paymentMethod?: 'credit_card' | 'atm_virtual_account';
      consentNoRefundDigital?: boolean;
      invoiceType?: 'personal_cloud' | 'mobile_barcode' | 'company_tax_id';
      invoiceCarrierCode?: string;
      companyTaxId?: string;
      companyTitle?: string;
    };

    if (!bookId || !bookVersionId) {
      return NextResponse.json({ error: '缺少書籍或版本識別碼' }, { status: 400 });
    }

    if (paymentMethod !== 'credit_card' && paymentMethod !== 'atm_virtual_account') {
      return NextResponse.json({ error: '請選擇有效的付款方式' }, { status: 400 });
    }

    if (consentNoRefundDigital !== true) {
      return NextResponse.json(
        {
          error:
            '結帳前請務必閱讀並勾選同意《數位內容退換貨政策》（消保法第 19 條合理例外情事）',
        },
        { status: 400 }
      );
    }

    // Validate Taiwan e-Invoice fields
    const trimmedCarrier = invoiceCarrierCode.trim().toUpperCase();
    const trimmedTaxId = companyTaxId.trim();
    const trimmedCompanyTitle = companyTitle.trim();

    if (invoiceType === 'mobile_barcode') {
      if (!/^\/[0-9A-Z.+\-]{7}$/.test(trimmedCarrier)) {
        return NextResponse.json(
          { error: '手機條碼載具格式不正確（須以 / 開頭，共 8 碼英數符號，如 /AB12345）' },
          { status: 400 }
        );
      }
    } else if (invoiceType === 'company_tax_id') {
      if (!/^\d{8}$/.test(trimmedTaxId)) {
        return NextResponse.json(
          { error: '公司統一編號須為 8 碼數字' },
          { status: 400 }
        );
      }
      if (!trimmedCompanyTitle) {
        return NextResponse.json(
          { error: '請填寫公司發票抬頭名稱' },
          { status: 400 }
        );
      }
    }

    // Read configured payment mode
    const { data: settings } = await supabase
      .from('site_settings')
      .select('payment_mode')
      .eq('id', 1)
      .single();

    const configuredMode = (settings?.payment_mode ?? 'sandbox') as
      | 'sandbox'
      | 'newebpay'
      | 'ecpay';

    const newebConfig = getNewebPayConfig();
    const ecpayConfig = getECPayConfig();

    let effectiveProvider: 'sandbox' | 'newebpay' | 'ecpay' = 'sandbox';
    if (configuredMode === 'newebpay' && newebConfig) {
      effectiveProvider = 'newebpay';
    } else if (configuredMode === 'ecpay' && ecpayConfig) {
      effectiveProvider = 'ecpay';
    }

    const { data: book } = await supabase
      .from('books')
      .select('id, title, slug')
      .eq('id', bookId)
      .single();

    const { data: version } = await supabase
      .from('book_versions')
      .select('id, version_code, list_price_twd')
      .eq('id', bookVersionId)
      .eq('book_id', bookId)
      .single();

    if (!book || !version) {
      return NextResponse.json({ error: '查無此電子書或發行版本' }, { status: 404 });
    }

    const merchantOrderNo = generateMerchantOrderNo();

    // Insert order; Postgres BEFORE INSERT trigger authoritatively computes standard vs 1/10 upgrade price
    const { data: order, error: insertError } = await supabase
      .from('orders')
      .insert({
        merchant_order_no: merchantOrderNo,
        user_id: user.id,
        book_id: bookId,
        book_version_id: bookVersionId,
        amount_twd: version.list_price_twd,
        payment_provider: effectiveProvider,
        payment_method: paymentMethod,
        consent_no_refund_digital: true,
        invoice_type: invoiceType,
        invoice_carrier_code: invoiceType === 'mobile_barcode' ? trimmedCarrier : null,
        company_tax_id: invoiceType === 'company_tax_id' ? trimmedTaxId : null,
        company_title: invoiceType === 'company_tax_id' ? trimmedCompanyTitle : null,
      })
      .select('*')
      .single();

    if (insertError || !order) {
      metric('orders.created', 1, { outcome: 'error' });
      return NextResponse.json(
        { error: insertError?.message ?? '建立訂單失敗' },
        { status: 400 }
      );
    }

    metric('orders.created', 1, {
      outcome: 'success',
      tier: order.pricing_tier,
      provider: effectiveProvider,
      method: paymentMethod,
    });

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      new URL(request.url).origin;

    const itemLabel = `${book.title} (${version.version_code})`;

    if (effectiveProvider === 'newebpay' && newebConfig) {
      const gatewayForm = buildNewebPayFormPayload(
        {
          merchantOrderNo: order.merchant_order_no,
          amount: order.amount_twd,
          itemDesc: itemLabel,
          email: user.email ?? 'alan.huinli@gmail.com',
          paymentMethod,
          returnUrl: `${origin}/api/payments/newebpay/return`,
          notifyUrl: `${origin}/api/payments/newebpay/notify`,
          customerUrl: `${origin}/api/payments/newebpay/return`,
          clientBackUrl: `${origin}/books/${book.slug}`,
        },
        newebConfig
      );

      return NextResponse.json({
        mode: 'gateway_post',
        provider: 'newebpay',
        orderId: order.id,
        gatewayForm,
      });
    }

    if (effectiveProvider === 'ecpay' && ecpayConfig) {
      const gatewayForm = buildECPayFormPayload(
        {
          merchantTradeNo: order.merchant_order_no,
          amount: order.amount_twd,
          itemName: itemLabel,
          paymentMethod,
          returnUrl: `${origin}/api/payments/ecpay/notify`,
          paymentInfoUrl: `${origin}/api/payments/ecpay/notify`,
          clientBackUrl: `${origin}/bookshelf`,
        },
        ecpayConfig
      );

      return NextResponse.json({
        mode: 'gateway_post',
        provider: 'ecpay',
        orderId: order.id,
        gatewayForm,
      });
    }

    return NextResponse.json({
      mode: 'sandbox_redirect',
      provider: 'sandbox',
      orderId: order.id,
      redirectUrl: `/checkout/sandbox/${order.id}`,
    });
  } catch (err) {
    metric('orders.created', 1, { outcome: 'error' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '系統發生未預期錯誤' },
      { status: 500 }
    );
  } finally {
    metric('orders.create_duration_ms', Math.round(performance.now() - startedAt));
  }
}
