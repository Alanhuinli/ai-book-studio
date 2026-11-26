import crypto from 'crypto';

export interface ECPayConfig {
  merchantId: string;
  hashKey: string;
  hashIv: string;
  isProduction: boolean;
}

export interface ECPayOrderPayload {
  merchantTradeNo: string;
  amount: number;
  itemName: string;
  paymentMethod: 'credit_card' | 'atm_virtual_account';
  returnUrl: string;
  paymentInfoUrl: string;
  clientBackUrl: string;
}

export function getECPayConfig(): ECPayConfig | null {
  const merchantId = process.env.ECPAY_MERCHANT_ID?.trim();
  const hashKey = process.env.ECPAY_HASH_KEY?.trim();
  const hashIv = process.env.ECPAY_HASH_IV?.trim();

  if (!merchantId || !hashKey || !hashIv) {
    return null;
  }

  return {
    merchantId,
    hashKey,
    hashIv,
    isProduction: process.env.ECPAY_ENV === 'production',
  };
}

export function getECPayGatewayUrl(isProduction: boolean): string {
  return isProduction
    ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
    : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
}

function ecpayUrlEncode(raw: string): string {
  return encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')');
}

export function computeECPayCheckMacValue(
  params: Record<string, string>,
  hashKey: string,
  hashIv: string
): string {
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'CheckMacValue')
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const queryPairs = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
  const raw = `HashKey=${hashKey}&${queryPairs}&HashIV=${hashIv}`;
  const encoded = ecpayUrlEncode(raw);

  return crypto
    .createHash('sha256')
    .update(encoded, 'utf8')
    .digest('hex')
    .toUpperCase();
}

export function buildECPayFormPayload(order: ECPayOrderPayload, config: ECPayConfig) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const tradeDate = `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(
    now.getDate()
  )} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const fields: Record<string, string> = {
    MerchantID: config.merchantId,
    MerchantTradeNo: order.merchantTradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: 'aio',
    TotalAmount: String(order.amount),
    TradeDesc: 'AlansAIPressDigitalBook',
    ItemName: order.itemName.replace(/[#&+%]/g, ' ').slice(0, 80),
    ReturnURL: order.returnUrl,
    ClientBackURL: order.clientBackUrl,
    ChoosePayment: order.paymentMethod === 'atm_virtual_account' ? 'ATM' : 'Credit',
    EncryptType: '1',
  };

  if (order.paymentMethod === 'atm_virtual_account') {
    fields.ExpireDate = '3';
    fields.PaymentInfoURL = order.paymentInfoUrl;
  }

  fields.CheckMacValue = computeECPayCheckMacValue(fields, config.hashKey, config.hashIv);

  return {
    actionUrl: getECPayGatewayUrl(config.isProduction),
    fields,
  };
}
