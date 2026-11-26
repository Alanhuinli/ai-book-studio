import crypto from 'crypto';

export interface NewebPayConfig {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  isProduction: boolean;
}

export interface NewebPayOrderPayload {
  merchantOrderNo: string;
  amount: number;
  itemDesc: string;
  email: string;
  paymentMethod: 'credit_card' | 'atm_virtual_account';
  returnUrl: string;
  notifyUrl: string;
  customerUrl: string;
  clientBackUrl: string;
}

export function getNewebPayConfig(): NewebPayConfig | null {
  const merchantId = process.env.NEWEBPAY_MERCHANT_ID?.trim();
  const hashKey = process.env.NEWEBPAY_HASH_KEY?.trim();
  const hashIv = process.env.NEWEBPAY_HASH_IV?.trim();

  if (!merchantId || !hashKey || !hashIv) {
    return null;
  }

  return {
    merchantId,
    hashKey,
    hashIv,
    isProduction: process.env.NEWEBPAY_ENV === 'production',
  };
}

export function getNewebPayGatewayUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://core.newebpay.com/MPG/mpg_gateway'
    : 'https://ccore.newebpay.com/MPG/mpg_gateway';
}

export function encryptNewebPayTradeInfo(
  tradeParams: Record<string, string | number>,
  hashKey: string,
  hashIv: string
): { tradeInfo: string; tradeSha: string } {
  const queryString = new URLSearchParams(
    Object.entries(tradeParams).map(([k, v]) => [k, String(v)])
  ).toString();

  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(hashKey, 'utf8'),
    Buffer.from(hashIv, 'utf8')
  );
  let encrypted = cipher.update(queryString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const shaPlain = `HashKey=${hashKey}&${encrypted}&HashIV=${hashIv}`;
  const tradeSha = crypto
    .createHash('sha256')
    .update(shaPlain, 'utf8')
    .digest('hex')
    .toUpperCase();

  return { tradeInfo: encrypted, tradeSha };
}

export function decryptNewebPayTradeInfo(
  tradeInfoHex: string,
  tradeSha: string,
  hashKey: string,
  hashIv: string
): Record<string, unknown> {
  const expectedShaPlain = `HashKey=${hashKey}&${tradeInfoHex}&HashIV=${hashIv}`;
  const expectedSha = crypto
    .createHash('sha256')
    .update(expectedShaPlain, 'utf8')
    .digest('hex')
    .toUpperCase();

  if (expectedSha !== tradeSha.toUpperCase()) {
    throw new Error('藍新金流 TradeSha 簽章驗證失敗');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(hashKey, 'utf8'),
    Buffer.from(hashIv, 'utf8')
  );
  decipher.setAutoPadding(false);
  let decrypted = decipher.update(tradeInfoHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  // Strip PKCS7 padding or trailing control characters
  const cleaned = decrypted.replace(/[\x00-\x1F]+$/g, '');
  return JSON.parse(cleaned) as Record<string, unknown>;
}

export function buildNewebPayFormPayload(
  order: NewebPayOrderPayload,
  config: NewebPayConfig
) {
  const timeStamp = Math.floor(Date.now() / 1000);
  const tradeParams: Record<string, string | number> = {
    MerchantID: config.merchantId,
    RespondType: 'JSON',
    TimeStamp: timeStamp,
    Version: '2.0',
    MerchantOrderNo: order.merchantOrderNo,
    Amt: order.amount,
    ItemDesc: order.itemDesc.slice(0, 50),
    Email: order.email,
    LoginType: 0,
    CREDIT: order.paymentMethod === 'credit_card' ? 1 : 0,
    VACC: order.paymentMethod === 'atm_virtual_account' ? 1 : 0,
    ReturnURL: order.returnUrl,
    NotifyURL: order.notifyUrl,
    CustomerURL: order.customerUrl,
    ClientBackURL: order.clientBackUrl,
  };

  const { tradeInfo, tradeSha } = encryptNewebPayTradeInfo(
    tradeParams,
    config.hashKey,
    config.hashIv
  );

  return {
    actionUrl: getNewebPayGatewayUrl(config.isProduction),
    fields: {
      MerchantID: config.merchantId,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: '2.0',
    },
  };
}
