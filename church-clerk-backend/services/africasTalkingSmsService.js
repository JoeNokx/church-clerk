import AfricasTalking from "africastalking";

let atClient = null;

function getAfricasTalkingClient() {
  if (atClient) return atClient;

  const username = process.env.AFRICA_TALKING_USERNAME;
  const apiKey = process.env.AFRICA_TALKING_API_KEY;

  if (!username) {
    throw new Error("Missing Africa's Talking username (set AFRICA_TALKING_USERNAME in .env)");
  }
  if (!apiKey) {
    throw new Error("Missing Africa's Talking API key (set AFRICA_TALKING_API_KEY in .env)");
  }

  atClient = AfricasTalking({ username, apiKey });
  return atClient;
}

export function getDefaultSmsSenderId() {
  const senderId = String(process.env.AFRICA_TALKING_SENDER_ID || "").trim();
  if (senderId) return senderId;

  // No fallback — return null so AT uses its default sender.
  // Sending an unregistered sender ID causes "InvalidSenderId" rejection.
  return null;
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

  console.log("[AT] Sending SMS:", { to: recipients, from: sender || "(none)", messageLength: msg.length });

  const response = await sms.send(payload);
  console.log("[AT] Raw response:", JSON.stringify(response, null, 2));
  return response;
}
