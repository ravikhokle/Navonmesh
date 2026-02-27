import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send an email using NodeMailer + Brevo SMTP
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML body
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Emergex" <${process.env.SENDER_EMAIL}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Email send error:", error.message);
    throw error;
  }
};

/**
 * Send verification email with a clickable link
 */
export const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #dc2626; color: #fff; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; font-size: 22px; font-weight: bold;">E</div>
      </div>
      <h2 style="color: #111827; text-align: center; margin: 0 0 8px;">Verify Your Email</h2>
      <p style="color: #6b7280; text-align: center; margin: 0 0 24px; font-size: 14px;">
        Click the button below to verify your email address and activate your Emergex account.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${verifyUrl}" style="display: inline-block; background: #dc2626; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Verify Email
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>
  `;
  return sendEmail(email, "Emergex — Verify Your Email", html);
};

/**
 * Send password reset email with a clickable link
 */
export const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #fff; border-radius: 12px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: #dc2626; color: #fff; width: 48px; height: 48px; line-height: 48px; border-radius: 12px; font-size: 22px; font-weight: bold;">E</div>
      </div>
      <h2 style="color: #111827; text-align: center; margin: 0 0 8px;">Reset Your Password</h2>
      <p style="color: #6b7280; text-align: center; margin: 0 0 24px; font-size: 14px;">
        You requested a password reset. Click the button below to set a new password.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${resetUrl}" style="display: inline-block; background: #dc2626; color: #fff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Reset Password
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        This link expires in 15 minutes. If you didn't request this, ignore this email.
      </p>
    </div>
  `;
  return sendEmail(email, "Emergex — Reset Your Password", html);
};
