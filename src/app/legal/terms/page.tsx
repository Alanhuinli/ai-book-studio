import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '會員服務條款',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <span className="text-xs font-bold tracking-wider text-indigo-600 uppercase">
          Terms of Service
        </span>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          會員服務條款
        </h1>
        <p className="mt-2 text-xs text-slate-500">最後更新日期：2026 年 11 月 26 日</p>

        <div className="mt-8 space-y-6 text-sm leading-7 text-slate-700">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">第一條　認知與接受條款</h2>
            <p>
              歡迎您使用「艾倫數位書坊 Alan&apos;s AI Press」（以下簡稱「本站」）提供之原創數位電子書購買、線上閱讀與檔案下載服務。當您註冊成為本站會員或完成結帳購買程序時，即表示您已詳細閱讀、了解並同意遵守本服務條款之所有約定。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">第二條　會員帳號註冊與安全保管</h2>
            <p>
              會員應提供真實、正確且有效之電子郵件信箱進行註冊。您的帳號僅限您本人使用，不得轉讓、出借、出租或與他人共用帳號。若發現帳號遭他人冒用，請立即通知本站客服協助處理。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">
              第三條　單次購書授權與老訂戶 1/10 改版升級規則
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <strong>單本明確計價與版本授權：</strong>本站所有電子書均以新台幣（NT$）明確標示單本版本售價，無任何預付儲值點數或代幣制度。購買完成後，訂戶就該購買版本享有於本站營運期間內不限次數之線上閱讀及個人浮水印 PDF 下載授權。
              </li>
              <li>
                <strong>舊版權益永久保留：</strong>當同一電子書作品日後發佈重大改版（例如由 v1.0 發佈新版本 v2.0、v3.0）時，已購買舊版之訂戶仍持續保有原已購舊版之完整閱讀與下載權，不會因新版推出而遭覆蓋或取消。
              </li>
              <li>
                <strong>老訂戶 1/10 優惠升級機制：</strong>已持有同一書目任一有效舊版授權之老訂戶，於登入原購書帳號結帳購買該書新版本時，系統將自動以該訂戶「原購買金額之十分之一（1/10，四捨五入至新台幣整數，最低 NT$ 1）」計算專屬升級優惠價。此優惠限同一會員帳號本人享有，不得跨帳號移轉。
              </li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">
              第四條　智慧財產權與動態個人浮水印防盜版約定
            </h2>
            <p>
              本站所有電子書文字、圖表、程式碼範例與版面設計均受中華民國《著作權法》及國際智慧財產權公約保護。本站提供之線上防拷閱讀器及下載之 PDF 檔案均內嵌訂戶專屬帳號資訊與唯一數位浮水印指紋碼（<code>ABS-WM-XXXXXXXXXXXX</code>）。嚴禁會員將電子書內容或 PDF 檔案進行公開傳輸、上傳至雲端硬碟／論壇／社群群組、轉售、團購分流或去除浮水印。如有違反，本站有權立即終止該帳號之存取權限並依法追究民事賠償及刑事責任。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900">第五條　準據法與管轄法院</h2>
            <p>
              本服務條款之解釋與適用，以及與本服務條款有關之爭議，均應依照中華民國法律予以處理，並以臺灣臺北地方法院為第一審管轄法院。
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
