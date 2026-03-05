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
  const from = process.env.RESEND_FROM || "Church Clerk <onboarding@resend.dev>";
  const resend = getResendClient();
  await resend.emails.send({
    from,
    to,
    subject,
    html
  });
};
