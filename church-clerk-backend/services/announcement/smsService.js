import AnnouncementMessage from "../../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../../models/announcementMessageDeliveryModel.js";
import { sendBulkSms } from "../africasTalkingSmsService.js";
import {
  normalizeSmsPhoneE164,
  resolveSmsSenderIdOrThrow,
  mapAfricasTalkingRecipientToStatus,
  isAfricasTalkingPreAcceptanceRejection,
  friendlySmsError
} from "../../utils/announcementHelpers.js";

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
            errorMessage: "The phone number is invalid or not formatted correctly."
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
      sent: 0,
      failed: invalid.length,
      invalid: invalid.length,
      rejectedBeforeAcceptance: invalid.length,
      rejectedDeliveryIds: []
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
    // Provider threw — could be auth failure, network error, etc.
    // If markProviderErrorsFailed is true (immediate send), mark as failed.
    // If false (scheduled retry), keep pending for retry.
    const ops = valid.map((v) => ({
      updateOne: {
        filter: { _id: v.delivery._id, church: churchId },
        update: {
          $set: {
            status: markProviderErrorsFailed ? "failed" : "pending",
            provider: "africastalking",
            errorMessage: friendlySmsError(err?.message || "SMS send failed")
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
  let sent = 0;
  let failed = 0;
  const rejectedDeliveryIds = [];

  const ops = valid.map((v) => {
    const r = byPhone.get(v.phoneE164);
    const rawStatus = r?.status;
    const status = mapAfricasTalkingRecipientToStatus(rawStatus);

    if (status === "delivered") {
      delivered += 1;
    } else if (status === "sent") {
      sent += 1;
    } else {
      failed += 1;
      // Track pre-acceptance rejections for refund
      if (isAfricasTalkingPreAcceptanceRejection(rawStatus)) {
        rejectedDeliveryIds.push(v.delivery._id);
      }
    }

    return {
      updateOne: {
        filter: { _id: v.delivery._id, church: churchId },
        update: {
          $set: {
            status,
            provider: "africastalking",
            providerMessageId: r?.messageId ? String(r.messageId) : null,
            errorMessage: status === "failed" ? friendlySmsError(rawStatus || "Failed") : null,
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
    sent,
    failed: failed + invalid.length,
    invalid: invalid.length,
    // Deliveries rejected by the provider before acceptance — eligible for refund
    rejectedBeforeAcceptance: rejectedDeliveryIds.length + invalid.length,
    rejectedDeliveryIds
  };
}

export { sendSmsAndUpdateDeliveries };
