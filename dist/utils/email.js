"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const resend_1 = require("resend");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const sendEmail = async ({ to, subject, html }) => {
    try {
        const fromAddress = process.env.EMAIL_FROM || "onboarding@resend.dev";
        const fromName = process.env.APP_NAME || "WishCube";
        const { data, error } = await resend.emails.send({
            from: `${fromName} <${fromAddress}>`,
            to,
            subject,
            html,
        });
        if (error) {
            console.error("Resend internal error:", error);
            throw new Error(error.message);
        }
        return data;
    }
    catch (error) {
        console.error("Email service error:", error);
        throw error;
    }
};
exports.sendEmail = sendEmail;
