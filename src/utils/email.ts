import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
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
  } catch (error: any) {
    console.error("Email service error:", error);
    throw error;
  }
};
