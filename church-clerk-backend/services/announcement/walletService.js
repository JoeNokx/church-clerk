import AnnouncementWallet from "../../models/announcementWalletModel.js";
import AnnouncementWalletTransaction from "../../models/announcementWalletTransactionModel.js";

async function getOrCreateWallet({ churchId }) {
  const wallet = await AnnouncementWallet.findOneAndUpdate(
    { church: churchId },
    { $setOnInsert: { balanceCredits: 0 } },
    { new: true, upsert: true }
  );
  return wallet;
}

async function deductCreditsForMessage({ churchId, wallet, totalCostCredits, status, channels, recipientCount, userId }) {
  if (totalCostCredits <= 0) return wallet;

  const updatedWallet = await AnnouncementWallet.findOneAndUpdate(
    { _id: wallet._id, balanceCredits: { $gte: totalCostCredits } },
    { $inc: { balanceCredits: -totalCostCredits } },
    { new: true }
  );

  if (!updatedWallet) {
    throw new Error("Insufficient credits. Please fund your wallet.");
  }

  await AnnouncementWalletTransaction.create({
    church: churchId,
    wallet: wallet._id,
    type: "deduct",
    status: "success",
    amountCredits: -totalCostCredits,
    balanceAfterCredits: updatedWallet.balanceCredits,
    description: `Message ${status}`,
    createdBy: userId || null,
    metadata: {
      channels,
      recipientCount
    }
  });

  return updatedWallet;
}

export { getOrCreateWallet, deductCreditsForMessage };
