import nodemailer from "nodemailer";

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
      secure: true, // SSL required for cloud hostings like Render
      auth: { user: u, pass: p },
      connectionTimeout: 10000, // 10s connection timeout
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  return null;
};

export const sendOTPEmail = async (toEmail, otp, name) => {
  try {
    const real = createTransporter();
    if (real) {
      await real.sendMail({
        from: `"VoiceBite AI 🍽️" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Your VoiceBite OTP Code",
        html: emailHtml(name, otp),
      });
      console.log(`✅ OTP email successfully sent to ${toEmail}`);
      return true;
    } else {
      // Ethereal fallback for local development
      const testAccount = await nodemailer.createTestAccount();
      const test = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
        connectionTimeout: 10000,
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
      return true;
    }
  } catch (error) {
    console.error("❌ Email Sending Failed:", error.message);
    throw new Error(`Email dispatch failed: ${error.message}`);
  }
};
