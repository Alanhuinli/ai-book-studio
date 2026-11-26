import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileDown,
  Library,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { calculateUpgradePriceTwd, formatTwd } from '@/lib/pricing';

export default async function BookshelfPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const { paid } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/bookshelf');
  }

  const { data: entitlements } = await supabase
    .from('user_entitlements')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('granted_at', { ascending: false });

  const { data: books } = await supabase.from('books').select('*');
  const { data: versions } = await supabase
    .from('book_versions')
    .select('*')
    .order('version_number', { ascending: false });

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const bookMap = new Map((books ?? []).map((b) => [b.id, b]));
  const versionMap = new Map((versions ?? []).map((v) => [v.id, v]));

  // Group owned versions by book
  const ownedByBook = new Map<
    string,
    Array<{
      entitlementId: string;
      paidAmountTwd: number;
      isUpgrade: boolean;
      versionId: string;
      versionCode: string;
      versionNumber: number;
      listPriceTwd: number;
    }>
  >();

  for (const ent of entitlements ?? []) {
    const ver = versionMap.get(ent.book_version_id);
    if (!ver) continue;
    const list = ownedByBook.get(ent.book_id) ?? [];
    list.push({
      entitlementId: ent.id,
      paidAmountTwd: ent.paid_amount_twd,
      isUpgrade: ent.is_upgrade,
      versionId: ver.id,
      versionCode: ver.version_code,
      versionNumber: Number(ver.version_number),
      listPriceTwd: ver.list_price_twd,
    });
    ownedByBook.set(ent.book_id, list);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-600 uppercase">
            <Library className="h-4 w-4" />
            <span>Personal Digital Bookshelf</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
            我的個人數位書櫃
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            授權會員帳號：{user.email}（所有已購版本皆永久保留閱讀與專屬個人浮水印 PDF 下載權）
          </p>
        </div>
        <Link
          href="/#books"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <span>探索更多電子書</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {paid && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>
            付款成功（訂單編號 <strong>{paid}</strong>）！對應版本之線上閱讀與動態個人浮水印 PDF 已立即為您開通。
          </span>
        </div>
      )}

      {/* Owned Books Section */}
      <section className="mt-8">
        {ownedByBook.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 text-lg font-bold text-slate-900">
              您的個人書櫃目前尚無已購電子書
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              可先前往首頁免費試讀任一電子書第 1 章，或選購您感興趣的 AI 實戰專書。
            </p>
            <Link
              href="/#books"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              前往瀏覽書目
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from(ownedByBook.entries()).map(([bookId, ownedVersions]) => {
              const book = bookMap.get(bookId);
              if (!book) return null;

              const sortedOwned = [...ownedVersions].sort(
                (a, b) => b.versionNumber - a.versionNumber
              );
              const latestPublished = book.current_version_id
                ? versionMap.get(book.current_version_id)
                : null;

              const ownsLatest = latestPublished
                ? sortedOwned.some((o) => o.versionId === latestPublished.id)
                : true;

              const earliestBase = [...ownedVersions].sort(
                (a, b) =>
                  Number(a.isUpgrade) - Number(b.isUpgrade) ||
                  a.versionNumber - b.versionNumber
              )[0];

              const basePaid =
                earliestBase.paidAmountTwd > 0
                  ? earliestBase.paidAmountTwd
                  : earliestBase.listPriceTwd;

              const upgradePrice =
                !ownsLatest && latestPublished
                  ? calculateUpgradePriceTwd(basePaid)
                  : null;

              return (
                <div
                  key={bookId}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
                >
                  <div>
                    <div
                      className={`bg-gradient-to-r ${book.cover_gradient} p-6 text-white`}
                    >
                      <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
                        {book.category}
                      </span>
                      <h2 className="mt-3 text-xl font-bold">{book.title}</h2>
                      <p className="mt-1 text-xs text-slate-200">{book.subtitle}</p>
                    </div>

                    <div className="p-6 space-y-4">
                      <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                        已永久開通之版本授權（共 {sortedOwned.length} 個版本）
                      </h3>

                      <div className="space-y-3">
                        {sortedOwned.map((ov) => (
                          <div
                            key={ov.entitlementId}
                            className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  版本 {ov.versionCode}
                                </span>
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                  永久有效
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                取得紀錄：
                                {ov.isUpgrade
                                  ? `老訂戶 1/10 升級購得（${formatTwd(ov.paidAmountTwd)}）`
                                  : ov.paidAmountTwd > 0
                                    ? `標準購書（${formatTwd(ov.paidAmountTwd)}）`
                                    : '作者授權開通'}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/reader/${book.slug}/${ov.versionCode}`}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>線上閱讀</span>
                              </Link>
                              <a
                                href={`/api/books/${book.id}/versions/${ov.versionId}/pdf`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                              >
                                <FileDown className="h-3.5 w-3.5 text-emerald-600" />
                                <span>浮水印 PDF</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* 1/10 Upgrade Banner if Newer Version Exists */}
                      {!ownsLatest && latestPublished && upgradePrice !== null && (
                        <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <Sparkles className="h-4 w-4 text-amber-600" />
                            <span>
                              新版本 {latestPublished.version_code} 已發佈！老訂戶享 1/10 升級價
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-amber-800">
                            新版原價 {formatTwd(latestPublished.list_price_twd)}，您只需{' '}
                            <strong className="text-sm text-amber-950">
                              {formatTwd(upgradePrice)}
                            </strong>{' '}
                            即可加購升級，且原 {earliestBase.versionCode} 版本閱讀權永久保留！
                          </p>
                          <Link
                            href={`/books/${book.slug}`}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-amber-700"
                          >
                            <span>立即前往以 {formatTwd(upgradePrice)} 升級新版</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Order History Section */}
      <section className="mt-14">
        <h2 className="text-lg font-bold text-slate-900">訂單與付款紀錄</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {(orders ?? []).length === 0 ? (
            <p className="p-6 text-sm text-slate-500">尚無歷史訂單紀錄。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">訂單編號</th>
                    <th className="px-4 py-3 font-semibold">書籍與版本</th>
                    <th className="px-4 py-3 font-semibold">計價類型</th>
                    <th className="px-4 py-3 font-semibold">實付金額</th>
                    <th className="px-4 py-3 font-semibold">付款方式 / 狀態</th>
                    <th className="px-4 py-3 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(orders ?? []).map((ord) => {
                    const b = bookMap.get(ord.book_id);
                    const v = versionMap.get(ord.book_version_id);
                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5 font-mono font-medium text-slate-800">
                          {ord.merchant_order_no}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900">
                          {b?.title ?? '電子書'} ({v?.version_code ?? ''})
                        </td>
                        <td className="px-4 py-3.5">
                          {ord.pricing_tier === 'upgrade_10pct' ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                              老訂戶 1/10 升級
                            </span>
                          ) : (
                            <span className="text-slate-600">標準單次購書</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {formatTwd(ord.amount_twd)}
                        </td>
                        <td className="px-4 py-3.5">
                          {ord.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              已付款開通
                            </span>
                          ) : ord.status === 'awaiting_atm' ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                              <Clock className="h-3.5 w-3.5" />
                              ATM 待匯款 ({ord.atm_virtual_account})
                            </span>
                          ) : (
                            <span className="text-slate-500">{ord.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {ord.status !== 'paid' && ord.payment_provider === 'sandbox' && (
                            <Link
                              href={`/checkout/sandbox/${ord.id}`}
                              className="font-semibold text-indigo-600 hover:underline"
                            >
                              前往收銀台完成付款
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
