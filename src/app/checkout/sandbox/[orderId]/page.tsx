import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SandboxCashierClient } from './SandboxCashierClient';

export default async function SandboxCheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const { data: book } = await supabase
    .from('books')
    .select('title')
    .eq('id', order.book_id)
    .single();

  const { data: version } = await supabase
    .from('book_versions')
    .select('version_code')
    .eq('id', order.book_version_id)
    .single();

  const invoiceSummary =
    order.invoice_type === 'mobile_barcode'
      ? `手機條碼載具 (${order.invoice_carrier_code})`
      : order.invoice_type === 'company_tax_id'
        ? `公司統編 ${order.company_tax_id}（${order.company_title}）`
        : '會員雲端電子發票';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <SandboxCashierClient
        orderId={order.id}
        merchantOrderNo={order.merchant_order_no}
        bookTitle={book?.title ?? '電子書'}
        versionCode={version?.version_code ?? 'v1.0'}
        amountTwd={order.amount_twd}
        pricingTier={order.pricing_tier}
        paymentMethod={order.payment_method}
        status={order.status}
        atmBankCode={order.atm_bank_code}
        atmVirtualAccount={order.atm_virtual_account}
        atmExpireAt={order.atm_expire_at}
        invoiceSummary={invoiceSummary}
      />
    </div>
  );
}
