import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
  tls: { rejectUnauthorized: false },
});

export function buildInvitationHtml({ inviterName, workspaceName, role, acceptUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>You're invited to DevCollab</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:40px 48px 36px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:28px;">💻</span>
                <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">DevCollab</span>
              </div>
              <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:8px 0 0;">Real-Time Project Collaboration</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 32px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;">
                You're invited! 🎉
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                <strong style="color:#111827;">${inviterName}</strong> has invited you to join the
                <strong style="color:#4f46e5;"> ${workspaceName}</strong> workspace on DevCollab
                as a <strong style="color:#111827;">${role}</strong>.
              </p>

              <!-- Role badge -->
              <div style="background:#eef2ff;border-radius:10px;padding:16px 20px;margin-bottom:28px;display:inline-block;">
                <p style="margin:0;font-size:13px;color:#4f46e5;font-weight:600;">
                  🏷️ Your role: <span style="background:#4f46e5;color:#fff;border-radius:6px;padding:2px 10px;font-size:12px;font-weight:700;">${role}</span>
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${acceptUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;letter-spacing:0.2px;box-shadow:0 4px 16px rgba(79,70,229,0.35);">
                  Accept Invitation →
                </a>
              </div>

              <p style="text-align:center;font-size:12px;color:#9ca3af;margin:0 0 28px;">
                Button not working? Copy and paste this link into your browser:
              </p>
              <p style="text-align:center;font-size:12px;word-break:break-all;">
                <a href="${acceptUrl}" style="color:#4f46e5;text-decoration:none;">${acceptUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Features strip -->
          <tr>
            <td style="padding:0 48px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f9fafb;border-radius:12px;padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;">What you'll get access to</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding:4px 0;font-size:13px;color:#374151;">✅ &nbsp;Kanban boards</td>
                        <td width="50%" style="padding:4px 0;font-size:13px;color:#374151;">✅ &nbsp;Code snippets</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:4px 0;font-size:13px;color:#374151;">✅ &nbsp;Team wiki</td>
                        <td width="50%" style="padding:4px 0;font-size:13px;color:#374151;">✅ &nbsp;AI assistant</td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding:4px 0;font-size:13px;color:#374151;">✅ &nbsp;Real-time chat</td>
                        <td width="50%" style="padding:4px 0;font-size:13px;color:#374151;">✅ &nbsp;Whiteboard</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:24px 48px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;">
                This invitation expires in <strong>7 days</strong>. If you didn't expect this email, you can safely ignore it.
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                © ${new Date().getFullYear()} DevCollab · Built for developers
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendInvitationEmail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) {
    throw new Error("SMTP settings are not configured in backend/.env");
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log("✅ Email sent to", to, "| MessageId:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    throw err;
  }
}


