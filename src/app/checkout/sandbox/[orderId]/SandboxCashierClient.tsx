'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Landmark,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { formatTwd } from '@/lib/pricing';

export function SandboxCashierClient({
  orderId,
  merchantOrderNo,
  bookTitle,
  versionCode,
  amountTwd,
  pricingTier,
  paymentMethod,
  status,
  atmBankCode,
  atmVirtualAccount,
  atmExpireAt,
  invoiceSummary,
}: {
  orderId: string;
  merchantOrderNo: string;
  bookTitle: string;
  versionCode: string;
  amountTwd: number;
  pricingTier: string;
  paymentMethod: string;
  status: string;
  atmBankCode: string | null;
  atmVirtualAccount: string | null;
  atmExpireAt: string | null;
  invoiceSummary: string;
}) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompletePayment = async () => {
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/orders/sandbox-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '核銷失敗');
      }
      router.push(`/bookshelf?paid=${merchantOrderNo}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '模擬付款失敗');
      setProcessing(false);
    }
  };

  const copyVirtualAccount = async () => {
    if (!atmVirtualAccount) return;
    await navigator.clipboard.writeText(atmVirtualAccount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'paid') {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <h2 className="mt-3 text-xl font-bold text-emerald-950">此筆訂單已完成付款！</h2>
        <p className="mt-1 text-sm text-emerald-800">
          您的電子書閱讀權限與個人浮水印 PDF 已開通。
        </p>
        <Link
          href="/bookshelf"
          className="mt-5 inline-block rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          前往個人書櫃閱讀
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-slate-900">
            台灣金流沙盒模擬收銀台（藍新 NewebPay ／ 綠界 ECPay 相容架構）
          </h1>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          SANDBOX 測試驗證環境
        </span>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm space-y-2">
        <div className="flex justify-between">
          <span className="text-slate-500">特店訂單編號：</span>
          <span className="font-mono font-semibold text-slate-900">{merchantOrderNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">購買電子書版本：</span>
          <span className="font-semibold text-slate-900">
            {bookTitle}（{versionCode}）
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">計價方案：</span>
          <span className="font-semibold text-indigo-700">
            {pricingTier === 'upgrade_10pct'
              ? '老訂戶原購價 1/10 優惠升級'
              : '標準單次購書授權'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">電子發票載具：</span>
          <span className="text-slate-700">{invoiceSummary}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
          <span className="font-bold text-slate-800">應付總金額：</span>
          <span className="text-xl font-extrabold text-indigo-700">
            {formatTwd(amountTwd)}
          </span>
        </div>
      </div>

      {paymentMethod === 'credit_card' ? (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-950">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <span>信用卡一次付清（沙盒測試卡號）</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <div className="text-slate-400">測試卡號</div>
                <div className="mt-0.5 font-mono font-semibold text-slate-800">
                  4000-2211-1111-1111
                </div>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <div className="text-slate-400">有效月年</div>
                <div className="mt-0.5 font-mono font-semibold text-slate-800">12 / 30</div>
              </div>
              <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                <div className="text-slate-400">末三碼</div>
                <div className="mt-0.5 font-mono font-semibold text-slate-800">222</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCompletePayment}
            disabled={processing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {processing && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>模擬 3D 驗證通過並立即完成刷卡（{formatTwd(amountTwd)}）</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-950">
              <Landmark className="h-4 w-4 text-emerald-700" />
              <span>已為本筆訂單配發 ATM 專屬虛擬帳號</span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">轉入銀行代碼：</span>
                <span className="font-mono font-bold text-slate-900">
                  {atmBankCode ?? '812'}（台新國際商業銀行）
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">16 碼專屬虛擬帳號：</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-extrabold tracking-wider text-emerald-800">
                    {atmVirtualAccount}
                  </span>
                  <button
                    type="button"
                    onClick={copyVirtualAccount}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? '已複製' : '複製'}</span>
                  </button>
                </div>
              </div>
              {atmExpireAt && (
                <div className="flex justify-between text-xs text-slate-500">
                  <span>繳費有效期限：</span>
                  <span>{new Date(atmExpireAt).toLocaleString('zh-TW')}</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/bookshelf"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              先返回個人書櫃（保留待匯款狀態）
            </Link>
            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={processing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>模擬銀行端 ATM 轉帳入帳核銷（立即開通）</span>
            </button>
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-xs text-slate-400">
        金流審核通過後，於環境變數填入藍新 NewebPay 或綠界 ECPay 正式金鑰，並在作者後台切換模式即可無縫通車正式收款。
      </p>
    </div>
  );
}
