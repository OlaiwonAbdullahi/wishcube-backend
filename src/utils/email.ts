import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  const { data, error } = await resend.emails.send({
    from: `${process.env.APP_NAME || "WishCube"} <onboarding@usewishcube.com>`,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
