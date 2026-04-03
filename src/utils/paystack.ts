import axios from "axios";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = "https://api.paystack.co";

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}
const paystackRequest = async <T>(
  method: string,
  path: string,
  body: any = null,
): Promise<T> => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      ...(body && { data: body }),
    };

    const response = await axios(config);
    const data = response.data as PaystackResponse<T>;

    if (!data.status) {
      throw new Error(data.message || "Paystack request failed");
    }
    return data.data;
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    throw new Error(errorMsg);
  }
};
export const initializePaystackPayment = (params: {
  email: string;
  amount: number;
  metadata?: any;
  callbackUrl?: string;
  plan?: string;
}) =>
  paystackRequest<any>("POST", "/transaction/initialize", {
    email: params.email,
    amount: params.amount,
    metadata: params.metadata,
    callback_url: params.callbackUrl,
    plan: params.plan,
  });

export const createPaystackPlan = (params: {
  name: string;
  amount: number;
  interval: "monthly" | "annually";
}) =>
  paystackRequest<any>("POST", "/plan", {
    name: params.name,
    amount: params.amount,
    interval: params.interval,
  });

export const verifyPaystackPayment = (reference: string) =>
  paystackRequest<any>("GET", `/transaction/verify/${reference}`);

export const initiateTransfer = async (params: {
  accountName: string;
  accountNumber: string;
  bankCode: string;
  amount: number;
  reason?: string;
  reference?: string;
}) => {
  const recipient = await paystackRequest<any>("POST", "/transferrecipient", {
    type: "nuban",
    name: params.accountName,
    account_number: params.accountNumber,
    bank_code: params.bankCode,
    currency: "NGN",
  });
  return paystackRequest<any>("POST", "/transfer", {
    source: "balance",
    amount: params.amount,
    recipient: recipient.recipient_code,
    reason: params.reason,
    reference: params.reference,
  });
};

export const resolveAccountNumber = (accountNumber: string, bankCode: string) =>
  paystackRequest<any>(
    "GET",
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
  );

export const getBankList = () =>
  paystackRequest<any[]>("GET", "/bank?currency=NGN");
