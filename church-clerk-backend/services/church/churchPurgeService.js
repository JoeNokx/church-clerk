import mongoose from "mongoose";
import cloudinary from "../../config/cloudinary.js";

// Finds every model whose documents belong to a church — any schema
// path named `church` that references the Church model — so new
// church-scoped collections are swept automatically.
const churchScopedModels = () =>
  Object.values(mongoose.models).filter((model) => {
    const path = model?.schema?.path("church");
    return path?.instance === "ObjectId" && path?.options?.ref === "Church";
  });

const deleteCloudinaryPrefix = async (prefix) => {
  try {
    await cloudinary.api.delete_resources_by_prefix(prefix);
  } catch (_) {
    // File cleanup is best-effort — the database purge is what matters.
  }
};

// Deletes every record owned by a church across all collections.
// Returns a { ModelName: deletedCount } summary. The Church document
// itself is NOT deleted here — the caller deletes it last, so a
// failure partway through can simply be retried.
export const purgeChurchData = async (churchId) => {
  const summary = {};
  const User = mongoose.model("User");
  const Program = mongoose.model("Program");
  const Notification = mongoose.model("Notification");
  const LookupValue = mongoose.model("LookupValue");
  const ReferralHistory = mongoose.model("ReferralHistory");

  // Gather ids first — notifications and avatars are keyed by user,
  // and program uploads live under church-clerk/events/<programId>.
  const [userIds, programIds] = await Promise.all([
    User.find({ church: churchId }).distinct("_id"),
    Program.find({ church: churchId }).distinct("_id")
  ]);

  for (const model of churchScopedModels()) {
    const { deletedCount } = await model.deleteMany({ church: churchId });
    if (deletedCount) summary[model.modelName] = deletedCount;
  }

  if (userIds.length) {
    const { deletedCount } = await Notification.deleteMany({ userId: { $in: userIds } });
    if (deletedCount) summary.Notification = deletedCount;
  }

  // Church-linked records that don't use a plain `church` field.
  const [lookups, referrals] = await Promise.all([
    LookupValue.deleteMany({ churchId }),
    ReferralHistory.deleteMany({
      $or: [{ referrerChurch: churchId }, { referredChurch: churchId }]
    })
  ]);
  if (lookups.deletedCount) summary.LookupValue = lookups.deletedCount;
  if (referrals.deletedCount) summary.ReferralHistory = referrals.deletedCount;

  // Branches outlive their HQ — a branch doesn't require a parent, so
  // just detach them instead of leaving a dangling reference.
  const Church = mongoose.model("Church");
  const detached = await Church.updateMany(
    { parentChurch: churchId },
    { $set: { parentChurch: null } }
  );
  if (detached.modifiedCount) summary.BranchesDetached = detached.modifiedCount;

  // Cloudinary assets — best effort, after the DB rows are gone.
  const prefixes = [
    `church-clerk/churches/${churchId}`,
    `church-clerk/members/${churchId}`,
    ...userIds.map((id) => `church-clerk/users/${id}`),
    ...programIds.map((id) => `church-clerk/events/${id}`)
  ];
  await Promise.all(prefixes.map(deleteCloudinaryPrefix));

  return summary;
};
