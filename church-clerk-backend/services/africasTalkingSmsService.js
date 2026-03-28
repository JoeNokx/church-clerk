import AfricasTalking from "africastalking";

let atClient = null;

function getAfricasTalkingClient() {
  if (atClient) return atClient;

  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;

  if (!username) {
    throw new Error("Missing AT_USERNAME");
  }
  if (!apiKey) {
    throw new Error("Missing AT_API_KEY");
  }

  atClient = AfricasTalking({ username, apiKey });
  return atClient;
}

export function getDefaultSmsSenderId() {
  const senderId = String(process.env.AT_DEFAULT_SENDER_ID || process.env.AT_SENDER_ID || "").trim();
  return senderId || null;
}

export async function sendBulkSms({ to, message, from }) {
  const arr = Array.isArray(to) ? to : [to];
  const recipients = arr.map((v) => String(v || "").trim()).filter(Boolean);

  if (!recipients.length) {
    throw new Error("No recipients provided");
  }

  const msg = String(message || "").trim();
  if (!msg) {
    throw new Error("Message is required");
  }

  const client = getAfricasTalkingClient();
  const sms = client.SMS;

  const payload = {
    to: recipients,
    message: msg
  };

  const sender = String(from || "").trim();
  if (sender) {
    payload.from = sender;
  }

  return await sms.send(payload);
}
