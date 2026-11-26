# 艾倫數位書坊 Alan's AI Press (`ai-book-studio`)

> 精選 AI 協作原創電子書與實戰指南 — 支援線上防拷章節閱讀器、個人專屬動態浮水印 PDF 下載、老訂戶原購價 1/10 改版優惠升級與台灣金流（藍新 NewebPay / 綠界 ECPay）合規架構。

## 核心功能與架構亮點

1. **會員註冊登入與個人數位書櫃（Supabase Auth + `@supabase/ssr` + Next.js 16 Proxy）**
   - 嚴格啟用 PostgreSQL Row-Level Security（RLS），分離公開章節目錄 (`book_chapters`) 與受保護正文 (`chapter_contents`)。
   - 使用 `alan.huinli@gmail.com` 註冊將由資料庫觸發器自動賦予 `admin` 作者管理後台權限。

2. **「單次購書 ＋ 老訂戶 1/10 價格升級新版」自動計價引擎**
   - 新讀者以新台幣原價單次購買當前最新版。
   - 已購舊版（如 `v1.0`）之老訂戶永久保有原舊版線上閱讀與 PDF 下載權。
   - 老訂戶結帳同書新版（如 `v2.0`）時，由資料庫 `calculate_checkout_quote` 與 `BEFORE INSERT` 觸發器強制換算為**原購買金額的 1/10（四捨五入至整數）**，徹底杜絕前端金額竄改。

3. **內建線上防拷章節閱讀器 ＋ PDF 動態個人浮水印下載**
   - 閱讀器攔截右鍵選單、複製與列印快捷鍵，支援淺色／暖紙護眼／深色主題與字級切換，並疊加個人授權浮水印。
   - 後端 `/api/books/[bookId]/versions/[versionId]/pdf` 即時嵌入訂戶 Email 與唯一數位指紋碼（`ABS-WM-...`）並寫入稽核紀錄。

4. **台灣金流（藍新 NewebPay / 綠界 ECPay）一次過審合規設計**
   - 內建藍新 MPG v2.0（AES-256-CBC + SHA256）與綠界 AIO（SHA256 CheckMacValue）信用卡／ATM 專屬虛擬帳號雙金流模組與沙盒模擬收銀台。
   - 預留電子發票欄位（會員雲端載具、手機條碼載具、8 碼公司統一編號＋抬頭）。
   - 內建 3 本明確標示 `NT$` 售價之示範 AI 電子書、《數位內容退換貨政策（消保法第 19 條合理例外情事強制勾選）》、《會員服務條款》、《隱私權保護政策》與頁尾真實客服聯絡資訊。

5. **Vercel 可觀測性埋點（Custom Metrics）**
   - 已於訂單建立、結帳核銷與動態浮水印 PDF 生成路由埋入 `@vercel/functions` 之 `metric()` 指標（`orders.created`, `orders.create_duration_ms`, `checkout.completed`, `checkout.duration_ms`, `ebook.pdf_downloaded`, `ebook.pdf_render_ms`）。

## 本地啟動與環境變數

請參考 `.env.example` 建立 `.env.local`，接著執行：

```bash
npm install
npm run dev
```
