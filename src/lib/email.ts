import nodemailer from "nodemailer";

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM,
} = process.env;

const configured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host:   SMTP_HOST,
      port:   Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT ?? 587) === 465,
      auth:   { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<void> {
  if (!transporter) return; // silently no-op when SMTP not configured

  const recipients = Array.isArray(to) ? to.join(", ") : to;
  await transporter.sendMail({
    from:    EMAIL_FROM ?? SMTP_USER,
    to:      recipients,
    subject,
    html,
  });
}
