import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import { env } from "../config/env";

type MailParams = {
  to: string;
  subject: string;
  html: string;
};

let smtpTransport: Transporter | null = null;
let resendClient: Resend | null = null;

function getSmtpTransport(): Transporter | null {
  if (!env.smtpHost) return null;
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure, // true for 465, false for other ports
      auth: env.smtpUser && env.smtpPass ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
    });
  }
  return smtpTransport;
}

function getResendClient(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

/** True when at least one delivery channel (SMTP or Resend) is configured. */
export function isMailConfigured(): boolean {
  return Boolean(env.smtpHost || env.resendApiKey);
}

/**
 * Sends an email using SMTP when configured, otherwise falls back to Resend.
 * Throws when no channel is configured or delivery fails.
 */
export async function sendMail(params: MailParams): Promise<void> {
  const smtp = getSmtpTransport();
  if (smtp) {
    await smtp.sendMail({
      from: env.mailFrom,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return;
  }

  const resend = getResendClient();
  if (resend) {
    const { error } = await resend.emails.send({
      from: "RoomMate <onboarding@resend.dev>",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
    }
    return;
  }

  throw new Error("No mail delivery channel configured (set SMTP_* or RESEND_API_KEY)");
}
