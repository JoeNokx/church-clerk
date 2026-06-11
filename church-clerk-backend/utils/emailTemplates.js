function getFrontendBaseUrl() {
  const raw = process.env.FRONTEND_URL || process.env.CLIENT_BASE_URL || process.env.CLIENT_URL || "http://localhost:5173";
  return String(raw || "").replace(/\/$/, "");
}

function getVerificationEmailTemplate(fullName, token) {
  const baseUrl = getFrontendBaseUrl();
  const link = `${baseUrl}/verify-email?token=${token}`;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Verify your email</h2>
      <p>Hello ${fullName || ""},</p>
      <p>Please verify your email to continue using Church Clerk.</p>
      <p><a href="${link}" style="display: inline-block; background: #1e3a8a; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none;">Verify Email</a></p>
      <p style="color: #6b7280; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/>${link}</p>
    </div>
  `;
}

function getWelcomeEmailTemplate(fullName, churchName) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Welcome to Church Clerk</h2>
      <p>Hello ${fullName || ""},</p>
      <p>Your church <strong>${churchName || ""}</strong> has been set up successfully. You can now start managing members, events, finances, and more.</p>
    </div>
  `;
}

function getRegistrationEmailTemplate(fullName, token) {
  const baseUrl = getFrontendBaseUrl();
  const link = `${baseUrl}/verify-email?token=${token}`;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Verify your email</h2>
      <p>Hello ${fullName || ""},</p>
      <p>Thanks for signing up for Church Clerk. Please verify your email to continue.</p>
      <p><a href="${link}" style="display: inline-block; background: #1e3a8a; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none;">Verify Email</a></p>
      <p style="color: #6b7280; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/>${link}</p>
    </div>
  `;
}

function getPasswordResetEmailTemplate(fullName, token) {
  const baseUrl = getFrontendBaseUrl();
  const link = `${baseUrl}/reset-password?token=${token}`;
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="margin: 0 0 12px;">Reset your password</h2>
      <p>Hello ${fullName || ""},</p>
      <p>You requested a password reset. Click the button below to set a new password. This link expires in 1 hour.</p>
      <p><a href="${link}" style="display: inline-block; background: #1e3a8a; color: #ffffff; padding: 10px 14px; border-radius: 8px; text-decoration: none;">Reset Password</a></p>
      <p style="color: #6b7280; font-size: 12px;">If the button doesn't work, copy and paste this link into your browser:<br/>${link}</p>
    </div>
  `;
}

export {
  getFrontendBaseUrl,
  getVerificationEmailTemplate,
  getWelcomeEmailTemplate,
  getRegistrationEmailTemplate,
  getPasswordResetEmailTemplate
};
