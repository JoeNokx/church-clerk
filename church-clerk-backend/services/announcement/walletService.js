import AnnouncementWallet from "../../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../../models/announcementWalletTransactionModel.js";
import SmsAllowance from "../../models/billingModel/smsAllowanceModel.js";
import { getOrCreateAllowance, remainingIncluded } from "./allowanceService.js";

async function getOrCreateWallet({ churchId }) {
  const wallet = await AnnouncementWallet.findOneAndUpdate(
    { church: churchId },
    { $setOnInsert: { balanceCredits: 0 } },
    { new: true, upsert: true }
  );
  return wallet;
}

/**
 * Total credits available to a church = remaining included (subscription) credits
 * + purchased top-up (wallet) credits.
 */
async function getAvailableCredits({ churchId }) {
  const [wallet, allowance] = await Promise.all([
    getOrCreateWallet({ churchId }),
    getOrCreateAllowance({ churchId })
  ]);

  const walletCredits = Number(wallet?.balanceCredits || 0);
  const includedCredits = remainingIncluded(allowance);

  return {
    walletCredits,
    includedCredits,
    totalAvailable: walletCredits + includedCredits
  };
}

/**
 * Atomic hybrid deduction: consumes included (subscription) credits first, then
 * purchased (wallet) top-up credits. Prevents double-charging by using conditional
 * atomic updates on both documents.
 *
 * Returns { wallet, allowance, fromIncluded, fromWallet } on success, throws on
 * insufficient credits.
 *
 * Idempotency for scheduled messages/retries is handled by the caller passing a
 * stable `deductionKey`; if a transaction with that key already exists we return
 * the previously recorded split instead of re-deducting.
 */
async function deductCreditsForMessage({
  churchId,
  wallet,
  totalCostCredits,
  status,
  channels,
  recipientCount,
  userId,
  deductionKey = null,
  description = null
}) {
  if (totalCostCredits <= 0) {
    return {
      wallet,
      allowance: await getOrCreateAllowance({ churchId }),
      fromIncluded: 0,
      fromWallet: 0
    };
  }

  // Idempotency: if a deduction with the same key already succeeded, do not re-deduct.
  if (deductionKey) {
    const prior = await AnnouncementWalletTransaction.findOne({
      church: churchId,
      "metadata.deductionKey": deductionKey,
      type: "deduct",
      status: "success"
    }).lean();

    if (prior) {
      const fromIncluded = Number(prior?.metadata?.fromIncluded || 0);
      const fromWallet = Number(prior?.metadata?.fromWallet || 0);
      const currentWallet = await getOrCreateWallet({ churchId });
      const currentAllowance = await getOrCreateAllowance({ churchId });
      return { wallet: currentWallet, allowance: currentAllowance, fromIncluded, fromWallet };
    }
  }

  const allowance = await getOrCreateAllowance({ churchId });
  const includedAvailable = remainingIncluded(allowance);
  const fromIncluded = Math.min(includedAvailable, totalCostCredits);
  const fromWallet = totalCostCredits - fromIncluded;

  let updatedWallet = wallet;
  let updatedAllowance = allowance;

  // 1) Consume included credits first (atomic conditional increment of usedCredits).
  if (fromIncluded > 0) {
    updatedAllowance = await SmsAllowance.findOneAndUpdate(
      { _id: allowance._id, usedCredits: { $lte: Number(allowance.grantedCredits || 0) - fromIncluded } },
      { $inc: { usedCredits: fromIncluded } },
      { new: true }
    );

    if (!updatedAllowance) {
      // Race: another concurrent send consumed the allowance. Recompute and retry once.
      const refreshed = await getOrCreateAllowance({ churchId });
      const retryIncluded = Math.min(remainingIncluded(refreshed), totalCostCredits);
      const retryWallet = totalCostCredits - retryIncluded;

      updatedAllowance = await SmsAllowance.findOneAndUpdate(
        { _id: refreshed._id, usedCredits: { $lte: Number(refreshed.grantedCredits || 0) - retryIncluded } },
        { $inc: { usedCredits: retryIncluded } },
        { new: true }
      );

      if (!updatedAllowance) {
        throw new Error("Could not reserve included credits. Please retry.");
      }

      // Reassign the wallet portion for the remainder of this function.
      return deductFromWallet({
        churchId,
        wallet: updatedWallet,
        fromIncluded: retryIncluded,
        fromWallet: retryWallet,
        totalCostCredits,
        status,
        channels,
        recipientCount,
        userId,
        deductionKey,
        description,
        updatedAllowance
      });
    }
  }

  return deductFromWallet({
    churchId,
    wallet: updatedWallet,
    fromIncluded,
    fromWallet,
    totalCostCredits,
    status,
    channels,
    recipientCount,
    userId,
    deductionKey,
    description,
    updatedAllowance
  });
}

async function deductFromWallet({
  churchId,
  wallet,
  fromIncluded,
  fromWallet,
  totalCostCredits,
  status,
  channels,
  recipientCount,
  userId,
  deductionKey,
  description,
  updatedAllowance
}) {
  let updatedWallet = wallet;

  // 2) Consume wallet (top-up) credits for the remainder (atomic conditional decrement).
  if (fromWallet > 0) {
    updatedWallet = await AnnouncementWallet.findOneAndUpdate(
      { _id: wallet._id, balanceCredits: { $gte: fromWallet } },
      { $inc: { balanceCredits: -fromWallet } },
      { new: true }
    );

    if (!updatedWallet) {
      // Roll back the allowance increment we just made so we don't strand included credits.
      if (fromIncluded > 0 && updatedAllowance) {
        await SmsAllowance.updateOne(
          { _id: updatedAllowance._id },
          { $inc: { usedCredits: -fromIncluded } }
        );
      }
      throw new Error("Insufficient credits. Please fund your wallet.");
    }
  }

  // 3) Record a single ledger entry describing the split (for audit + idempotency).
  await AnnouncementWalletTransaction.create({
    church: churchId,
    wallet: updatedWallet._id,
    type: "deduct",
    status: "success",
    amountCredits: -totalCostCredits,
    balanceAfterCredits: updatedWallet.balanceCredits,
    description: description || `Message ${status}`,
    createdBy: userId || null,
    metadata: {
      channels,
      recipientCount,
      fromIncluded,
      fromWallet,
      deductionKey: deductionKey || null
    }
  });

  return { wallet: updatedWallet, allowance: updatedAllowance, fromIncluded, fromWallet };
}

/**
 * Refund credits back to the church. Included credits are returned to the allowance
 * (decrement usedCredits), wallet credits are returned to the wallet balance. Uses the
 * original transaction's recorded split to refund in the correct proportions.
 */
async function refundCreditsForMessage({ churchId, totalCostCredits, fromIncluded = 0, fromWallet = 0, userId, deductionKey = null, description = null }) {
  if (totalCostCredits <= 0) return { wallet: await getOrCreateWallet({ churchId }) };

  const wallet = await getOrCreateWallet({ churchId });

  // Return included credits first (decrement usedCredits, capped at 0).
  if (fromIncluded > 0) {
    await SmsAllowance.findOneAndUpdate(
      { church: churchId },
      { $inc: { usedCredits: -fromIncluded } },
      { new: true, upsert: true }
    );
  }

  // Return wallet credits.
  let updatedWallet = wallet;
  if (fromWallet > 0) {
    updatedWallet = await AnnouncementWallet.findOneAndUpdate(
      { church: churchId },
      { $inc: { balanceCredits: fromWallet } },
      { new: true, upsert: true }
    );
  }

  await AnnouncementWalletTransaction.create({
    church: churchId,
    wallet: updatedWallet._id,
    type: "refund",
    status: "success",
    amountCredits: totalCostCredits,
    balanceAfterCredits: updatedWallet.balanceCredits,
    description: description || "Message refund",
    createdBy: userId || null,
    metadata: {
      fromIncluded,
      fromWallet,
      deductionKey: deductionKey || null
    }
  });

  return { wallet: updatedWallet };
}

export { getOrCreateWallet, getAvailableCredits, deductCreditsForMessage, refundCreditsForMessage };
