import { Resend } from "resend";

let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("Missing RESEND_API_KEY");
  }

  resendClient = new Resend(key);
  return resendClient;
}

export const sendEmail = async ({ to, subject, html }) => {
  const fromName = process.env.FROM_NAME || "Church Clerk";
  const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
  const from = `${fromName} <${fromEmail}>`;
  const resend = getResendClient();
  await resend.emails.send({
    from,
    to,
    subject,
    html
  });
};
