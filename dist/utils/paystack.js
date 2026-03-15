"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBankList = exports.resolveAccountNumber = exports.initiateTransfer = exports.verifyPaystackPayment = exports.initializePaystackPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const BASE_URL = "https://api.paystack.co";
const paystackRequest = async (method, path, body = null) => {
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
        const response = await (0, axios_1.default)(config);
        const data = response.data;
        if (!data.status) {
            throw new Error(data.message || "Paystack request failed");
        }
        return data.data;
    }
    catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        throw new Error(errorMsg);
    }
};
const initializePaystackPayment = (params) => paystackRequest("POST", "/transaction/initialize", {
    email: params.email,
    amount: params.amount,
    metadata: params.metadata,
    callback_url: params.callbackUrl,
});
exports.initializePaystackPayment = initializePaystackPayment;
const verifyPaystackPayment = (reference) => paystackRequest("GET", `/transaction/verify/${reference}`);
exports.verifyPaystackPayment = verifyPaystackPayment;
const initiateTransfer = async (params) => {
    // Step 1: Create transfer recipient
    const recipient = await paystackRequest("POST", "/transferrecipient", {
        type: "nuban",
        name: params.accountName,
        account_number: params.accountNumber,
        bank_code: params.bankCode,
        currency: "NGN",
    });
    // Step 2: Initiate transfer
    return paystackRequest("POST", "/transfer", {
        source: "balance",
        amount: params.amount,
        recipient: recipient.recipient_code,
        reason: params.reason,
        reference: params.reference,
    });
};
exports.initiateTransfer = initiateTransfer;
const resolveAccountNumber = (accountNumber, bankCode) => paystackRequest("GET", `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
exports.resolveAccountNumber = resolveAccountNumber;
const getBankList = () => paystackRequest("GET", "/bank?currency=NGN");
exports.getBankList = getBankList;
