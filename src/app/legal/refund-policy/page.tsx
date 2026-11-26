import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '數位內容退換貨政策',
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">
          Digital Content Refund Policy
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          數位內容退換貨政策（消保法合理例外情事聲明）
        </h1>
        <p className="mt-2 text-xs text-slate-500">最後更新日期：2026 年 11 月 26 日</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 text-amber-950">
            <h2 className="text-base font-bold">重要法定權益告知</h2>
            <p className="mt-1.5">
              「艾倫數位書坊 Alan&apos;s AI Press」（以下簡稱本站）所販售之商品皆屬「非以有形媒介提供之數位內容（線上電子書閱讀權限與動態浮水印 PDF 電子檔）」。依據中華民國《消費者保護法》第 19 條第 1 項但書及行政院公告之《通訊交易解除權合理例外情事適用準則》第 2 條第 5 款規定：<strong>「非以有形媒介提供之數位內容或一經提供即為完成之線上服務，經消費者事先同意始提供者」不適用七日猶豫期（無條件解除權）之規定。</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">一、購書前免費試閱機制</h2>
            <p>
              為保障消費者知的權利並協助您在購買前充分評估內容品質、寫作風格與章節深度，本站上架之每一本電子書均公開完整目錄大綱，並提供<strong>「第 1 章免費線上試讀」</strong>。請務必於結帳前先行試讀確認符合您的學習或工作需求。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">二、數位商品交付方式與結帳同意程序</h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                消費者於結帳頁面須主動勾選「我已閱讀並同意《數位內容退換貨政策》，了解本電子書屬非以有形媒介提供之數位內容，一經付款開通權限即完成交付，不適用七日猶豫期退費」後，始得送出訂單。
              </li>
              <li>
                採用「信用卡一次付清」者，於授權成功當下系統立即自動開通「個人書櫃」對應版本閱讀權限與個人專屬浮水印 PDF 下載功能；採用「ATM 專屬虛擬帳號匯款」者，於完成轉帳並經金流系統入帳核銷後立即自動開通。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">三、例外退費與異常處理辦法</h2>
            <p>
              訂單一經完成付款並開通數位電子書權限後，除有下列特殊情形外，恕無法辦理退貨或退款：
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong>重複扣款或帳務異常：</strong>因金流系統網路延遲或銀行端異常導致同一帳號對同一書籍版本重複扣款者，經查證屬實後將全額退還溢收款項。
              </li>
              <li>
                <strong>ATM 虛擬帳號尚未匯款：</strong>若您選擇 ATM 虛擬帳號付款但尚未執行轉帳，無須申請退費，該虛擬帳號逾繳費期限後將自動失效取消，不會產生任何費用。
              </li>
              <li>
                <strong>檔案損毀或系統重大瑕疵：</strong>若發生章節無法正常開啟或動態浮水印 PDF 無法下載，請聯繫客服信箱，我們將於 2 個工作日內修復；若經確認屬本站無法修復之系統重大瑕疵且尚未下載完整檔案者，可專案辦理全額退費。
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">四、客服申請聯繫管道</h2>
            <p>
              如對訂單、帳務或閱讀權限有任何疑問，請來信至客服信箱{' '}
              <a
                href="mailto:alan.huinli@gmail.com"
                className="font-semibold text-indigo-600 underline"
              >
                alan.huinli@gmail.com
              </a>
              ，並附上您的註冊信箱與訂單編號（以 <code>ABS</code> 開頭），客服團隊將於服務時間內儘速為您處理。
            </p>
          </section>
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6 text-sm">
          <Link href="/" className="font-semibold text-indigo-600 hover:text-indigo-700">
            ← 返回艾倫數位書坊首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
