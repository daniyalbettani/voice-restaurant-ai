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

export const sendOTPEmail = async (toEmail, otp, name) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "VoiceBite AI <onboarding@resend.dev>",
          to: [toEmail],
          subject: "Your VoiceBite OTP Code",
          html: emailHtml(name, otp),
        }),
      });

      if (response.ok) {
        console.log(
          `✅ OTP email successfully delivered to ${toEmail} via Resend HTTP API`,
        );
        return;
      } else {
        const errData = await response.json();
        console.error(`⚠️ Resend API Error:`, errData);
      }
    } catch (err) {
      console.error(`⚠️ Resend HTTP Request Failed: ${err.message}`);
    }
  }

  // Fallback print in logs if API key is not set or request fails
  console.log(`📌 FALLBACK OTP FOR ${toEmail}: [ ${otp} ]`);
};
