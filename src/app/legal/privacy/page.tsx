import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '隱私權保護政策',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">
          Privacy Policy
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          隱私權保護政策
        </h1>
        <p className="mt-2 text-xs text-slate-500">最後更新日期：2026 年 11 月 26 日</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">一、個人資料蒐集目的與類別</h2>
            <p>
              「艾倫數位書坊 Alan&apos;s AI Press」（以下簡稱本站）依據中華民國《個人資料保護法》規範，僅於提供會員身分驗證、數位電子書授權開通、金流收款對帳、電子發票開立與防盜版數位浮水印標記之特定目的範圍內，蒐集下列必要資料：
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>基本識別資料：電子郵件信箱、會員顯示名稱。</li>
              <li>交易與發票紀錄：訂單編號、交易金額、付款方式狀態、手機條碼載具或公司統一編號與抬頭。</li>
              <li>數位版權保護紀錄：PDF 下載時間戳記與動態浮水印授權識別碼。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">二、金流支付安全聲明</h2>
            <p>
              本站串接符合 PCI-DSS 國際發卡組織安全標準之第三方台灣合作金流服務商（如藍新金流 NewebPay、綠界科技 ECPay）。消費者進行信用卡刷卡時，完整卡號、有效期限與安全驗證碼均直接於金流機構之 SSL 加密頁面輸入處理，<strong>本站伺服器絕不經手或儲存任何信用卡敏感卡號資訊。</strong>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">三、個人資料利用期間、地區與保護措施</h2>
            <p>
              您的個人資料於會員帳號存續期間及稅務法令規定之帳務保存年限內，於本站雲端資料庫（啟用資料庫列層級存取控制 Row-Level Security 與全站 HTTPS 加密）妥善保護。除依法令規定配合司法或主管機關調查，或為完成金流收款與電子發票開立所必須之傳輸外，本站絕不會將您的個人資料出售、交換或洩漏予無關之第三人。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">四、當事人權利行使方式</h2>
            <p>
              依個人資料保護法第 3 條規定，您就本人之個人資料得向本站請求查詢、閱覽、製給複製本、補充或更正、停止蒐集處理利用或刪除。欲行使上述權利，請來信至客服信箱{' '}
              <a
                href="mailto:alan.huinli@gmail.com"
                className="font-semibold text-indigo-600 underline"
              >
                alan.huinli@gmail.com
              </a>
              ，我們將竭誠為您辦理。
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
