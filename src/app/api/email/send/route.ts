import { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { apiError, apiOk } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return apiError("CRON_SECRET not configured.", 500);
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return apiError("Unauthorized.", 401);
  }

  const body = (await req.json().catch(() => ({}))) as {
    to?: string;
    subject?: string;
    html?: string;
  };
  if (!body.to || !body.subject || !body.html) {
    return apiError("Missing email payload.", 400);
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) {
    return apiError("SMTP env vars missing.", 500);
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from,
      to: body.to,
      subject: body.subject,
      html: body.html,
    });
    return apiOk({ ok: true });
  } catch (e) {
    console.error("email/send:", e);
    return apiError("Failed to send email.", 500);
  }
}
