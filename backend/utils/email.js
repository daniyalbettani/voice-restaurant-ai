import nodemailer from "nodemailer";
import dns from "dns";

const emailHtml = (name, otp) => `
  <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;background:#0a0a0f;color:#fff;padding:40px;border-radius:16px;">
    <h1 style="color:#f97316;font-size:28px;margin-bottom:8px;">🍽️ VoiceBite AI</h1>
    <p style="color:#a1a1aa;margin-bottom:32px;">Email Verification</p>
    <h2 style="font-size:18px;margin-bottom:16px;">Hello ${name}! 👋</h2>
    <p style="color:#a1a1aa;margin-bottom:24px;">Use this OTP to verify your email. It expires in <strong style="color:#fff;">10 minutes</strong>.</p>
    <div style="background:#1a1a2e;border:2px solid #f97316;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#f97316;">${otp}</div>
    </div>
    <p style="color:#52525b;font-size:13px;">If you didn't request this, ignore this email.</p>
    <p style="color:#52525b;font-size:13px;margin-top:24px;">🔒 VoiceBite AI — Secure &amp; Encrypted</p>
  </div>
`;

const createTransporter = () => {
  const { EMAIL_USER: u, EMAIL_PASS: p } = process.env;
  if (
    u &&
    u !== "your_gmail@gmail.com" &&
    p &&
    p !== "your_gmail_app_password_16_chars"
  ) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: u, pass: p },
      // Explicitly forces DNS resolution to resolve strictly IPv4 addresses
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { family: 4 }, callback);
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return null;
};

export const sendOTPEmail = async (toEmail, otp, name) => {
  const real = createTransporter();

  if (real) {
    try {
      await real.sendMail({
        from: `"VoiceBite AI 🍽️" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your VoiceBite OTP Code",
        html: emailHtml(name, otp),
      });
      console.log(`✅ OTP email successfully sent to ${toEmail}`);
      return;
    } catch (err) {
      console.error(`⚠️ Gmail SMTP Error on Render: ${err.message}`);
      console.log(`📌 FALLBACK OTP FOR ${toEmail}: [ ${otp} ]`);
      return;
    }
  }

  // Ethereal fallback for local testing
  try {
    const testAccount = await nodemailer.createTestAccount();
    const test = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      lookup: (hostname, options, callback) => {
        dns.lookup(hostname, { family: 4 }, callback);
      },
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    const info = await test.sendMail({
      from: '"VoiceBite AI 🍽️" <noreply@voicebite.ai>',
      to: toEmail,
      subject: "Your VoiceBite OTP Code",
      html: emailHtml(name, otp),
    });
    console.log(
      `\n📧 OTP EMAIL PREVIEW: ${nodemailer.getTestMessageUrl(info)}`,
    );
    console.log(`📌 OTP for ${toEmail}: ${otp}\n`);
  } catch (etherealErr) {
    console.log(`📌 LOCAL FALLBACK OTP FOR ${toEmail}: [ ${otp} ]`);
  }
};
