import AnnouncementMessage from "../../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../../models/announcementMessageDeliveryModel.js";
import { sendBulkSms } from "../africasTalkingSmsService.js";
import { normalizeSmsPhoneE164, resolveSmsSenderIdOrThrow, mapAfricasTalkingRecipientToStatus } from "../../utils/announcementHelpers.js";

async function sendSmsAndUpdateDeliveries({ churchId, church, messageDoc, deliveries, markProviderErrorsFailed = true }) {
  const senderId = resolveSmsSenderIdOrThrow({ church, requestedSenderId: messageDoc?.smsSenderId });

  if (messageDoc?._id) {
    await AnnouncementMessage.updateOne(
      { _id: messageDoc._id, church: churchId },
      { $set: { sender_id_used: senderId } }
    );
  }

  const valid = [];
  const invalid = [];

  for (const d of deliveries) {
    const normalized = normalizeSmsPhoneE164(d.phone);
    if (!normalized) {
      invalid.push(d);
      continue;
    }
    valid.push({ delivery: d, phoneE164: normalized });
  }

  if (invalid.length) {
    const ops = invalid.map((d) => ({
      updateOne: {
        filter: { _id: d._id, church: churchId },
        update: {
          $set: {
            status: "failed",
            provider: "africastalking",
            errorMessage: "Invalid phone number"
          }
        }
      }
    }));
    await AnnouncementMessageDelivery.bulkWrite(ops);
  }

  if (!valid.length) {
    return {
      attempted: 0,
      delivered: 0,
      failed: invalid.length,
      invalid: invalid.length
    };
  }

  let response;
  try {
    response = await sendBulkSms({
      to: valid.map((v) => v.phoneE164),
      message: messageDoc.content,
      from: senderId
    });
  } catch (err) {
    const ops = valid.map((v) => ({
      updateOne: {
        filter: { _id: v.delivery._id, church: churchId },
        update: {
          $set: {
            status: markProviderErrorsFailed ? "failed" : "pending",
            provider: "africastalking",
            errorMessage: String(err?.message || "SMS send failed")
          }
        }
      }
    }));
    if (ops.length) {
      await AnnouncementMessageDelivery.bulkWrite(ops);
    }
    throw err;
  }

  const recipients = response?.SMSMessageData?.Recipients;
  const list = Array.isArray(recipients) ? recipients : [];
  const byPhone = new Map(list.map((r) => [String(r?.number || "").trim(), r]));

  let delivered = 0;
  let failed = 0;

  const ops = valid.map((v) => {
    const r = byPhone.get(v.phoneE164);
    const status = mapAfricasTalkingRecipientToStatus(r?.status);
    if (status === "delivered") delivered += 1;
    else failed += 1;

    return {
      updateOne: {
        filter: { _id: v.delivery._id, church: churchId },
        update: {
          $set: {
            status,
            provider: "africastalking",
            providerMessageId: r?.messageId ? String(r.messageId) : null,
            errorMessage: status === "failed" ? String(r?.status || "Failed") : null,
            phone: v.phoneE164
          }
        }
      }
    };
  });

  if (ops.length) {
    await AnnouncementMessageDelivery.bulkWrite(ops);
  }

  return {
    attempted: valid.length,
    delivered,
    failed: failed + invalid.length,
    invalid: invalid.length
  };
}

export { sendSmsAndUpdateDeliveries };
