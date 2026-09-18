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
  </div>
`;

export const sendOTPEmail = async (toEmail, otp, name) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: "VoiceBite AI",
            email: process.env.EMAIL_USER || "bhittanidaniyal@gmail.com",
          },
          to: [{ email: toEmail, name: name || "User" }],
          subject: "Your VoiceBite OTP Code",
          htmlContent: emailHtml(name, otp),
        }),
      });

      if (response.ok) {
        console.log(
          `✅ OTP email successfully delivered to ${toEmail} via Brevo API`,
        );
        return;
      } else {
        const err = await response.json();
        console.error("⚠️ Brevo API Error Response:", err);
      }
    } catch (err) {
      console.error("⚠️ Brevo Fetch Exception:", err.message);
    }
  }

  // Backup log in case API key is missing or invalid
  console.log(`📌 FALLBACK OTP FOR ${toEmail}: [ ${otp} ]`);
};
