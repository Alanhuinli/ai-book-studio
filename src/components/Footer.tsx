import Link from 'next/link';
import { BookOpen, Clock, CreditCard, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export async function Footer() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  const siteName = settings?.site_name ?? "艾倫數位書坊 Alan's AI Press";
  const siteSubtitle = settings?.site_subtitle ?? '精選 AI 協作原創電子書與實戰指南';
  const businessEntity = settings?.business_entity ?? "艾倫數位書坊（Alan's AI Press）";
  const supportEmail = settings?.support_email ?? 'alan.huinli@gmail.com';
  const supportPhone = settings?.support_phone ?? '02-2718-8890';
  const businessAddress =
    settings?.business_address ?? '臺北市信義區松仁路 100 號（數位出版服務中心）';
  const serviceHours =
    settings?.service_hours ?? '週一至週五 09:30 - 18:00（國定例假日除外）';

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand & Delivery Info */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-bold text-white">{siteName}</p>
                <p className="text-xs text-slate-400">{siteSubtitle}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              本網站銷售之商品皆為單本明確標價之原創數位電子書（新台幣 NT$ 計價）。完成付款後系統立即自動開通會員線上防拷章節閱讀權限，並提供動態個人浮水印 PDF 檔案下載。
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
                <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
                信用卡一次付清（VISA / MasterCard / JCB）
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                ATM 專屬虛擬帳號匯款
              </span>
            </div>
          </div>

          {/* Legal & Compliance Links */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              消費者權益與法規聲明
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/legal/refund-policy"
                  className="text-slate-300 transition hover:text-indigo-400"
                >
                  數位內容退換貨政策
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/terms"
                  className="text-slate-300 transition hover:text-indigo-400"
                >
                  會員服務條款
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="text-slate-300 transition hover:text-indigo-400"
                >
                  隱私權保護政策
                </Link>
              </li>
              <li>
                <Link
                  href="/bookshelf"
                  className="text-slate-300 transition hover:text-indigo-400"
                >
                  個人書櫃與訂單查詢
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support Contact (Required for Taiwan Payment Gateway Audit) */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              客服聯絡與營運資訊
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="font-medium text-slate-200">{businessEntity}</li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <span>
                  客服信箱：
                  <a
                    href={`mailto:${supportEmail}`}
                    className="underline decoration-slate-600 underline-offset-4 hover:text-white"
                  >
                    {supportEmail}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <span>客服專線：{supportPhone}</span>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <span>服務時間：{serviceHours}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <span>聯絡地址：{businessAddress}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved. 本站採用 SSL 256-bit 全站加密傳輸。
          </p>
          <p>
            電子發票開立預留支援（雲端發票／手機條碼載具／公司統一編號）
          </p>
        </div>
      </div>
    </footer>
  );
}
