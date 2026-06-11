import User from "../../models/userModel.js";
import ReferralCode from "../../models/referralModel/referralCodeModel.js";
import ReferralHistory from "../../models/referralModel/referralHistoryModel.js";
import { generateReferralCode } from "../../utils/generateReferralCode.js";

async function handleReferralCode({ churchId, referralCodeInput, email }) {
  if (!referralCodeInput) return;

  const referrerCode = await ReferralCode.findOne({
    code: String(referralCodeInput || "").toUpperCase()
  });

  if (!referrerCode) {
    throw new Error("Invalid referral code. Please check and try again.");
  }

  if (referrerCode && referrerCode.church.toString() !== churchId.toString()) {
    const existingReferral = await ReferralHistory.findOne({
      referredChurch: churchId
    });

    if (!existingReferral) {
      await ReferralHistory.create({
        referrerChurch: referrerCode.church,
        referredChurch: churchId,
        referredChurchEmail: email
      });
    }
  }
}

async function assignUserRole({ userId, churchId, currentRole }) {
  const existingUsersInChurch = await User.countDocuments({ church: churchId });

  const setRole =
    existingUsersInChurch === 0 &&
    currentRole !== "superadmin" &&
    currentRole !== "supportadmin"
      ? "churchadmin"
      : currentRole;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { church: churchId, role: setRole },
    { new: true }
  );

  return updatedUser;
}

async function createReferralCodeForChurch({ churchId, churchName }) {
  const newReferralCode = generateReferralCode(churchName);
  await ReferralCode.create({
    church: churchId,
    code: newReferralCode
  });
  return newReferralCode;
}

export { handleReferralCode, assignUserRole, createReferralCodeForChurch };
