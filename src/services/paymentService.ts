import axios from "axios";
import crypto from "crypto";
import { env } from "../config/env";

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    customer: {
      email: string;
    };
  };
}

const paystackApi = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${env.paystack.secretKey}`,
    "Content-Type": "application/json",
  },
});

/**
 * Initialize a payment transaction
 */
export const initializePayment = async (
  email: string,
  amount: number, // Amount in the smallest currency unit (kobo for NGN)
  reference: string,
  callbackUrl?: string
): Promise<PaystackInitResponse["data"]> => {
  try {
    const response = await paystackApi.post<PaystackInitResponse>(
      "/transaction/initialize",
      {
        email,
        amount: amount * 100, // Convert to kobo
        reference,
        callback_url: callbackUrl || `${env.appUrl}/wallet/verify`,
      }
    );

    if (!response.data.status) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack init error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to initialize payment");
  }
};

/**
 * Verify a payment transaction
 */
export const verifyPayment = async (
  reference: string
): Promise<PaystackVerifyResponse["data"]> => {
  try {
    const response = await paystackApi.get<PaystackVerifyResponse>(
      `/transaction/verify/${reference}`
    );

    if (!response.data.status) {
      throw new Error(response.data.message);
    }

    return response.data.data;
  } catch (error: any) {
    console.error(
      "Paystack verify error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to verify payment");
  }
};

/**
 * Verify Paystack webhook signature
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string
): boolean => {
  const hash = crypto
    .createHmac("sha512", env.paystack.secretKey)
    .update(payload)
    .digest("hex");
  return hash === signature;
};

/**
 * Generate a unique payment reference
 */
export const generatePaymentReference = (): string => {
  return `WC_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
};
