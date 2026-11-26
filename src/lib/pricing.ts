export function formatTwd(amount: number): string {
  return `NT$ ${amount.toLocaleString('zh-TW')}`;
}

/**
 * 計算老訂戶升級優惠價：原購買金額的 1/10（四捨五入至整數，最低 NT$ 1）
 */
export function calculateUpgradePriceTwd(originalPaidAmountTwd: number): number {
  return Math.max(1, Math.round(originalPaidAmountTwd / 10));
}

export function generateMerchantOrderNo(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  // 17 chars alphanumeric (compliant with NewebPay <=30 and ECPay <=20 limits)
  return `ABS${yy}${mm}${dd}${hh}${mi}${ss}${rand}`;
}
