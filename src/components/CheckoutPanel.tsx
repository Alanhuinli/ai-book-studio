'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Receipt,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { formatTwd } from '@/lib/pricing';
import type { CheckoutQuote } from '@/types/database.types';

export interface VersionQuoteItem {
  id: string;
  version_code: string;
  list_price_twd: number;
  is_latest: boolean;
  quote: CheckoutQuote;
}

export function CheckoutPanel({
  bookId,
  bookSlug,
  bookTitle,
  isLoggedIn,
  paymentMode,
  versionQuotes,
}: {
  bookId: string;
  bookSlug: string;
  bookTitle: string;
  isLoggedIn: boolean;
  paymentMode: string;
  versionQuotes: VersionQuoteItem[];
}) {
  const router = useRouter();
  const defaultItem =
    versionQuotes.find((v) => v.is_latest) ?? versionQuotes[0];

  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    defaultItem?.id ?? ''
  );
  const [paymentMethod, setPaymentMethod] = useState<
    'credit_card' | 'atm_virtual_account'
  >('credit_card');
  const [invoiceType, setInvoiceType] = useState<
    'personal_cloud' | 'mobile_barcode' | 'company_tax_id'
  >('personal_cloud');
  const [carrierCode, setCarrierCode] = useState('');
  const [companyTaxId, setCompanyTaxId] = useState('');
  const [companyTitle, setCompanyTitle] = useState('');
  const [consentDigital, setConsentDigital] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeItem =
    versionQuotes.find((v) => v.id === selectedVersionId) ?? defaultItem;

  if (!activeItem) {
    return null;
  }

  const { quote } = activeItem;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/books/${bookSlug}`)}`);
      return;
    }

    if (!consentDigital) {
      setError('結帳前請務必勾選同意《數位內容退換貨政策》（消保法合理例外情事）');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookVersionId: activeItem.id,
          paymentMethod,
          consentNoRefundDigital: consentDigital,
          invoiceType,
          invoiceCarrierCode: carrierCode,
          companyTaxId,
          companyTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '建立訂單失敗');
      }

      if (data.mode === 'gateway_post' && data.gatewayForm) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.gatewayForm.actionUrl;
        Object.entries(
          data.gatewayForm.fields as Record<string, string>
        ).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '結帳發生錯誤');
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-sm font-bold text-slate-900">購買數位電子書授權</span>
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          {paymentMode === 'newebpay'
            ? '藍新 NewebPay 金流'
            : paymentMode === 'ecpay'
              ? '綠界 ECPay 金流'
              : '支援信用卡 / ATM（內建測試收銀台）'}
        </span>
      </div>

      {/* Version Selector (when multiple versions exist) */}
      {versionQuotes.length > 1 && (
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-600">
            選擇購買版本（老訂戶可先體驗購買舊版，再驗證新版自動 1/10 升級價）
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {versionQuotes.map((vq) => (
              <button
                key={vq.id}
                type="button"
                onClick={() => {
                  setSelectedVersionId(vq.id);
                  setError(null);
                }}
                className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                  vq.id === activeItem.id
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{vq.version_code}</span>
                  {vq.is_latest && (
                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">
                      最新版
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  {vq.quote.already_owned
                    ? '已擁有授權'
                    : vq.quote.is_upgrade
                      ? `升級價 ${formatTwd(vq.quote.final_price_twd)}`
                      : `定價 ${formatTwd(vq.list_price_twd)}`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Box */}
      <div className="mt-5">
        {quote.already_owned ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>您已擁有 {activeItem.version_code} 永久閱讀權限</span>
            </div>
            <p className="mt-1.5 text-xs text-emerald-800">
              可隨時進入線上防拷章節閱讀器閱讀全文，或下載您的專屬個人浮水印 PDF。
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href={`/reader/${bookSlug}/${activeItem.version_code}`}
                className="rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                開啟線上閱讀器
              </Link>
              <a
                href={`/api/books/${bookId}/versions/${activeItem.id}/pdf`}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-center text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                下載個人浮水印 PDF
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-5">
            {quote.is_upgrade ? (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <span>
                    已啟用老訂戶專屬 1/10 升級優惠（依據已購 {quote.base_version_code}）
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2.5">
                  <span className="text-3xl font-extrabold text-amber-700">
                    {formatTwd(quote.final_price_twd)}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    新版定價 {formatTwd(quote.list_price_twd)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-amber-800">
                  系統自動以您原購買金額 {formatTwd(quote.base_paid_amount_twd ?? 0)} × 1/10（四捨五入至整數）計價，且原有 {quote.base_version_code} 閱讀權永久保留！
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {bookTitle}（{activeItem.version_code} 單次買斷授權）
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {formatTwd(quote.final_price_twd)}
                  </span>
                  <span className="text-xs text-slate-500">新台幣含稅價</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  購買後未來若推出新改版，本帳號結帳新版享原購價 1/10（{formatTwd(Math.max(1, Math.round(quote.final_price_twd / 10)))}）優惠升級！
                </p>
              </div>
            )}

            {/* Payment Method Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700">
                1. 選擇付款方式
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition ${
                    paymentMethod === 'credit_card'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="h-4 w-4 shrink-0 text-indigo-600" />
                  <div>
                    <div>信用卡一次付清</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      付款後即時開通
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('atm_virtual_account')}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition ${
                    paymentMethod === 'atm_virtual_account'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Landmark className="h-4 w-4 shrink-0 text-indigo-600" />
                  <div>
                    <div>ATM 虛擬帳號</div>
                    <div className="text-[11px] font-normal text-slate-500">
                      專屬匯款帳號核銷
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Taiwan e-Invoice Reserved Fields */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                <span>2. 電子發票開立方式</span>
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setInvoiceType('personal_cloud')}
                  className={`rounded-lg border px-2.5 py-2 font-medium transition ${
                    invoiceType === 'personal_cloud'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  會員雲端載具
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('mobile_barcode')}
                  className={`rounded-lg border px-2.5 py-2 font-medium transition ${
                    invoiceType === 'mobile_barcode'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  手機條碼載具
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('company_tax_id')}
                  className={`rounded-lg border px-2.5 py-2 font-medium transition ${
                    invoiceType === 'company_tax_id'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  公司統編發票
                </button>
              </div>

              {invoiceType === 'mobile_barcode' && (
                <div className="mt-2.5">
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={carrierCode}
                    onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                    placeholder="請輸入手機條碼（如 /AB12345）"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs uppercase focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {invoiceType === 'company_tax_id' && (
                <div className="mt-2.5 space-y-2">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={companyTaxId}
                      onChange={(e) => setCompanyTaxId(e.target.value.replace(/\D/g, ''))}
                      placeholder="統一編號（8 碼數字）"
                      className="w-full rounded-xl border border-slate-300 py-2 pr-3 pl-9 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={companyTitle}
                    onChange={(e) => setCompanyTitle(e.target.value)}
                    placeholder="公司發票抬頭全銜"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Mandatory Consumer Protection Digital Content Exception Checkbox */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-slate-700">
                <input
                  type="checkbox"
                  checked={consentDigital}
                  onChange={(e) => setConsentDigital(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                />
                <span>
                  我已先行體驗免費試讀章節，並閱讀同意{' '}
                  <Link
                    href="/legal/refund-policy"
                    target="_blank"
                    className="font-semibold text-indigo-700 underline"
                  >
                    《數位內容退換貨政策》
                  </Link>{' '}
                  與{' '}
                  <Link
                    href="/legal/terms"
                    target="_blank"
                    className="font-semibold text-indigo-700 underline"
                  >
                    《會員服務條款》
                  </Link>
                  ，知悉本數位電子書屬消保法第 19 條合理例外情事，一經付款開通閱讀權限即不適用七日猶豫期退費。
                </span>
              </label>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {!isLoggedIn
                  ? `登入會員以購買（${formatTwd(quote.final_price_twd)}）`
                  : quote.is_upgrade
                    ? `以 1/10 老訂戶優惠價 ${formatTwd(quote.final_price_twd)} 立即升級`
                    : `立即結帳購買（${formatTwd(quote.final_price_twd)}）`}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
