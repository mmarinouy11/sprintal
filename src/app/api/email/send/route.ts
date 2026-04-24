import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    to?: string;
    subject?: string;
    html?: string;
  };
  if (!body.to || !body.subject || !body.html) {
    return NextResponse.json({ error: "Missing email payload." }, { status: 400 });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !from) {
    return NextResponse.json({ error: "SMTP env vars missing." }, { status: 500 });
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
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("email/send:", e);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
