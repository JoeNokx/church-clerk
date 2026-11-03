import Member from "../models/memberModel.js";
import User from "../models/userModel.js";

const esc = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Link a member record to the church user account sharing its phone or
// email — no-op when there's no match or the member is already linked.
export async function linkMemberToMatchingUser(member) {
  try {
    if (!member || member.user) return member;
    const or = [];
    if (member.phoneNumber) or.push({ phoneNumber: member.phoneNumber });
    if (member.email) or.push({ email: { $regex: `^${esc(member.email)}$`, $options: "i" } });
    if (!or.length) return member;
    const user = await User.findOne({ church: member.church, $or: or }).select("_id").lean();
    if (!user) return member;
    member.user = user._id;
    if (typeof member.save === "function") await member.save();
    return member;
  } catch (e) {
    console.error("[linkMemberToMatchingUser]", e?.message || e);
    return member;
  }
}

// Link a user account to the church member record sharing its phone or
// email — fills member.user only when the member is not already linked.
export async function linkUserToMatchingMember(user) {
  try {
    if (!user?.church) return;
    const or = [];
    if (user.phoneNumber) or.push({ phoneNumber: user.phoneNumber });
    if (user.email) or.push({ email: { $regex: `^${esc(user.email)}$`, $options: "i" } });
    if (!or.length) return;
    await Member.updateMany(
      { church: user.church, user: null, $or: or },
      { $set: { user: user._id } }
    );
  } catch (e) {
    console.error("[linkUserToMatchingMember]", e?.message || e);
  }
}
