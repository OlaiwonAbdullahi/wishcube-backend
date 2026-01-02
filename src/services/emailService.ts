import nodemailer from "nodemailer";
import { env } from "../config/env";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: env.emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
};

// Email templates
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: "Welcome to WishCube!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Welcome to WishCube, ${name}!</h1>
        <p>We're excited to have you on board. With WishCube, you can:</p>
        <ul>
          <li>Create beautiful digital greeting cards</li>
          <li>Build mini-websites for special occasions</li>
          <li>Send gifts to your loved ones</li>
          <li>Manage events and track RSVPs</li>
        </ul>
        <p>Start creating your first card today!</p>
        <a href="${env.appUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
      </div>
    `,
  });
};

export const sendEventInvitation = async (
  email: string,
  eventTitle: string,
  eventLink: string,
  hostName: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `You're invited: ${eventTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">You're Invited!</h1>
        <p>${hostName} has invited you to <strong>${eventTitle}</strong></p>
        <p>View event details and RSVP:</p>
        <a href="${eventLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View Event</a>
      </div>
    `,
  });
};

export const sendGiftNotification = async (
  email: string,
  senderName: string,
  cardLink: string
): Promise<void> => {
  await sendEmail({
    to: email,
    subject: `${senderName} sent you a gift on WishCube!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">🎁 You've Got a Gift!</h1>
        <p>${senderName} has sent you a special card with gifts!</p>
        <a href="${cardLink}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">View Your Card</a>
      </div>
    `,
  });
};
