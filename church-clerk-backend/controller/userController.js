import User from "../models/userModel.js"
import { ROLE_PERMISSIONS, CHURCH_ROLES } from "../config/roles.js"
import cloudinary from "../config/cloudinary.js"
import { validatePhoneNumber } from "../utils/validatePhoneNumber.js"
import Role from "../models/roleModel.js"
import { MODULES } from "../config/permissions.js"
import { resolvePermissions } from "../utils/resolvePermissions.js"
import Subscription from "../models/billingModel/subscriptionModel.js"
import Plan from "../models/billingModel/planModel.js"
import { sendRegistrationVerificationEmail } from "../services/auth/emailVerificationService.js"
import Member from "../models/memberModel.js"
import Church from "../models/churchModel.js"
import { getChurchPrefix, generateMemberId, takeMemberSerial, releaseMemberSerial } from "../utils/memberHelpers.js"
import { linkUserToMatchingMember } from "../utils/memberUserLink.js"

//GET: fetch my profile
const myProfile =  async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select("-password").populate("church", "name");

        //check if user exist
         if(!user) {
        res.status(404).json({message: "user not found"})
         }
       
        //my profile successfully retrieve
         res.status(200).json({
      status: "success",
      message: "user profile fetched successfully",
      data: {
        user,
        activeChurch: req.activeChurch,
        permissions: req.permissions
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};



//PUT: update my profile details
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { email } = req.body;

        let validatedPhoneNumber;
        if (req.body?.phoneNumber !== undefined) {
            const rawPhone = String(req.body.phoneNumber || "").trim();
            if (rawPhone) {
                try {
                    validatedPhoneNumber = validatePhoneNumber(rawPhone, "GH");
                } catch (e) {
                    return res.status(400).json({ message: e?.message || "Invalid phone number" });
                }
            } else {
                validatedPhoneNumber = "";
            }
        }

        if (email) {
            const normalizedEmail = String(email).toLowerCase().trim();
            const emailExisting = await User.findOne({ email: normalizedEmail });
            if (emailExisting && emailExisting._id.toString() !== userId.toString()) {
                return res.status(400).json({ message: "email already in use by another user." });
            }
        }

        const update = {};
        if (req.body?.fullName !== undefined) update.fullName = String(req.body.fullName || "").trim();
        if (req.body?.email !== undefined) update.email = String(req.body.email || "").toLowerCase().trim();
        if (req.body?.phoneNumber !== undefined) update.phoneNumber = validatedPhoneNumber;

        const file = req.file;
        if (!file && req.body?.removeAvatar === "true") {
            update.profileImageUrl = "";
        }
        if (file) {
            if (!file.buffer) {
                return res.status(400).json({ message: "File buffer is missing" });
            }

            const mt = String(file.mimetype || "").toLowerCase();
            if (!mt.startsWith("image/")) {
                return res.status(400).json({ message: "Only image files are allowed" });
            }

            const folder = `church-clerk/users/${userId}/avatar`;
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder,
                        resource_type: "image",
                        use_filename: true,
                        unique_filename: true
                    },
                    (err, result) => {
                        if (err) return reject(err);
                        resolve(result);
                    }
                );
                stream.end(file.buffer);
            });

            if (!uploadResult?.secure_url) {
                return res.status(502).json({ message: "Failed to upload avatar" });
            }

            update.profileImageUrl = uploadResult.secure_url;
        }

        const user = await User.findByIdAndUpdate(userId, update, { new: true, runValidators: true })
            .select("-password")
            .populate("church", "name");
       
        //check if user exist
        if(!user) {
        return res.status(404).json({message: "user not found"})
        }

        //user successful update
                console.log("user details updated successfully...")

        return res.status(200).json({ message: "Profile updated successfully", user })

    } catch (error) {
        res.status(400).json({message: error.message})
        console.log("user details could not be updated", error.message)
    }
};


//PUT: update my passsword
const updateMyPassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find the user with password included
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password incorrect." });
    }

    // Check new password confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Remove password from response
    user.password = undefined;

    res.status(200).json({ message: "Password updated successfully", user });
    console.log("Password updated successfully...");
  } catch (error) {
    console.error("Update password error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};



const listChurchUsers = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { search = "", role = "" } = req.query;
    const query = { church: churchId };

    const q = String(search || "").trim();
    if (q) {
      const regex = new RegExp(q, "i");
      query.$or = [{ fullName: regex }, { email: regex }, { phoneNumber: regex }];
    }

    const roleFilter = String(role || "").trim();
    if (roleFilter) {
      query.role = roleFilter;
    }

    const users = await User.find(query)
      .select("fullName email phoneNumber role isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Flag which users already have a linked member record.
    const userIds = users.map((u) => u._id);
    const linked = await Member.find({ church: churchId, user: { $in: userIds } }).select("user").lean();
    const linkedIds = new Set(linked.map((m) => String(m.user)));
    for (const u of users) u.hasMember = linkedIds.has(String(u._id));

    return res.status(200).json({ message: "Users fetched", users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createChurchUser = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { fullName, email, phoneNumber, password, role, autoRegisterMember, linkMemberId } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let validatedPhoneNumber;
    try {
      validatedPhoneNumber = validatePhoneNumber(phoneNumber, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number" });
    }

    const roleKey = String(role || "").trim().toLowerCase();
    let roleRef = null;
    const dbRole = await Role.findOne({ key: roleKey, scope: "church" }).select("_id isActive").lean();
    if (dbRole?._id) {
      if (dbRole?.isActive === false) {
        return res.status(400).json({ message: "Invalid role selected" });
      }
      roleRef = dbRole._id;
    } else if (!CHURCH_ROLES.includes(roleKey)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const emailExisting = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (emailExisting) {
      return res.status(400).json({ message: "email already registered." });
    }

    const phoneExisting = await User.findOne({ phoneNumber: validatedPhoneNumber }).lean();
    if (phoneExisting) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    // "Not registered as a member" — if a member already matches this
    // phone/email, the admin should use the search-member option instead.
    let preExistingMember = null;
    if (autoRegisterMember) {
      const normalizedEmail = String(email || "").toLowerCase().trim();
      preExistingMember = await Member.findOne({
        church: churchId,
        $or: [
          { phoneNumber: validatedPhoneNumber },
          { email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } }
        ]
      }).lean();
      if (preExistingMember) {
        return res.status(409).json({ message: "This person is already a member — choose the 'An existing member' option to link them." });
      }
    }

    const user = await User.create({
      fullName,
      email,
      phoneNumber: validatedPhoneNumber,
      password,
      role: roleKey,
      roleRef,
      church: churchId,
      isActive: true
    });

    user.password = undefined;

    sendRegistrationVerificationEmail(user).catch((err) => {
      console.error("[createChurchUser] Failed to send verification email:", err.message);
    });

    // Attach this account to an existing member record with the same
    // phone/email when the explicit flows below don't already handle it.
    if (!autoRegisterMember && !linkMemberId) {
      linkUserToMatchingMember(user).catch(() => {});
    }

    // Optionally register the new user as a church member too — skipped if a
    // member already matches their phone number or email.
    let member = null;
    if (autoRegisterMember) {
      try {
        const normalizedEmail = String(email || "").toLowerCase().trim();
        {
          const nameParts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
          const firstName = nameParts[0] || "Member";
          const lastName = nameParts.slice(1).join(" ");

          const prefix = await getChurchPrefix(churchId);
          const issuedSerial = await takeMemberSerial(churchId);
          const memberId = generateMemberId(prefix || "CH", issuedSerial - 1);

          try {
            member = await Member.create({
              memberId,
              firstName,
              lastName,
              email: normalizedEmail,
              phoneNumber: validatedPhoneNumber,
              status: "active",
              church: churchId,
              createdBy: req.user._id,
              user: user._id
            });
            const totalMembers = await Member.countDocuments({ church: churchId });
            await Church.findByIdAndUpdate(churchId, { memberCount: totalMembers });
          } catch (memberErr) {
            if (memberErr?.code !== 11000 && memberErr?.errorResponse?.code !== 11000) {
              await releaseMemberSerial(churchId, issuedSerial).catch(() => {});
            }
            throw memberErr;
          }
        }
      } catch (memberErr) {
        // Best-effort — the user account was created successfully either way.
        console.error("[createChurchUser] member auto-register failed:", memberErr?.message || memberErr);
      }
    }

    // Optionally link the new user account to an existing member record.
    let linkedMember = null;
    let memberLinkConflict = false;
    if (linkMemberId) {
      try {
        const target = await Member.findOne({ _id: linkMemberId, church: churchId });
        if (target) {
          if (target.user && String(target.user) !== String(user._id)) {
            memberLinkConflict = true;
          } else {
            target.user = user._id;
            await target.save();
            linkedMember = target;
          }
        }
      } catch (linkErr) {
        console.error("[createChurchUser] member link failed:", linkErr?.message || linkErr);
      }
    }

    return res.status(201).json({ message: "User created. A verification email has been sent to their inbox.", user, member, linkedMember, memberLinkConflict });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateChurchUser = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { id } = req.params;
    const { fullName, email, phoneNumber, role, memberId } = req.body;

    let validatedPhoneNumber;
    if (phoneNumber !== undefined) {
      const rawPhone = String(phoneNumber || "").trim();
      if (rawPhone) {
        try {
          validatedPhoneNumber = validatePhoneNumber(rawPhone, "GH");
        } catch (e) {
          return res.status(400).json({ message: e?.message || "Invalid phone number" });
        }
      } else {
        validatedPhoneNumber = "";
      }
    }

    const existing = await User.findOne({ _id: id, church: churchId }).lean();
    if (!existing) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email) {
      const emailExisting = await User.findOne({ email }).lean();
      if (emailExisting && String(emailExisting._id) !== String(id)) {
        return res.status(400).json({ message: "email already in use by another user." });
      }
    }

    if (validatedPhoneNumber) {
      const phoneExisting = await User.findOne({ phoneNumber: validatedPhoneNumber }).lean();
      if (phoneExisting && String(phoneExisting._id) !== String(id)) {
        return res.status(400).json({ message: "Phone number already in use by another user." });
      }
    }

    // Validate the member link target before touching anything.
    let linkTarget = null;
    if (memberId !== undefined && memberId !== null && memberId !== "") {
      linkTarget = await Member.findOne({ _id: memberId, church: churchId });
      if (!linkTarget) {
        return res.status(400).json({ message: "Member not found in this church" });
      }
      if (linkTarget.user && String(linkTarget.user) !== String(id)) {
        return res.status(409).json({ message: "This member is already linked to another user" });
      }
    }

    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (email !== undefined) update.email = email;
    if (phoneNumber !== undefined) update.phoneNumber = validatedPhoneNumber;
    if (role !== undefined) {
      const roleKey = String(role || "").trim().toLowerCase();
      let roleRef = null;
      const dbRole = await Role.findOne({ key: roleKey, scope: "church" }).select("_id isActive").lean();
      if (dbRole?._id) {
        if (dbRole?.isActive === false) {
          return res.status(400).json({ message: "Invalid role selected" });
        }
        roleRef = dbRole._id;
      } else if (!CHURCH_ROLES.includes(roleKey)) {
        return res.status(400).json({ message: "Invalid role selected" });
      }
      update.role = roleKey;
      update.roleRef = roleRef;
    }

    const user = await User.findOneAndUpdate(
      { _id: id, church: churchId },
      update,
      { new: true, runValidators: true }
    )
      .select("fullName email phoneNumber role isActive createdAt")
      .lean();

    // Apply the member link — unset any member currently pointing at this
    // user, then attach the selected one. Null memberId just unlinks.
    if (memberId !== undefined) {
      await Member.updateMany({ user: id, ...(linkTarget ? { _id: { $ne: linkTarget._id } } : {}) }, { $unset: { user: 1 } });
      if (linkTarget) {
        linkTarget.user = id;
        await linkTarget.save();
      }
    }

    return res.status(200).json({ message: "User updated", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const setChurchUserActiveStatus = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be boolean" });
    }

    if (String(req.user?._id || "") === String(id)) {
      return res.status(400).json({ message: "You cannot change your own account status" });
    }

    const actorRole = String(req.user?.role || "");
    const isAdminActor = ["churchadmin", "superadmin", "supportadmin"].includes(actorRole);
    if (!isAdminActor) {
      return res.status(403).json({ message: "Only church admins can activate or deactivate user accounts" });
    }

    const target = await User.findOne({ _id: id, church: churchId }).select("role fullName email phoneNumber isActive").lean();
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    if (actorRole === "churchadmin" && target.role === "churchadmin") {
      return res.status(403).json({ message: "You cannot deactivate another church admin" });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, church: churchId },
      { isActive },
      { new: true }
    )
      .select("fullName email phoneNumber role isActive createdAt")
      .lean();

    return res.status(200).json({ message: "User status updated", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRolePermissionMatrix = async (req, res) => {
  try {
    const dbChurchRoles = await Role.find({ scope: "church", isActive: true })
      .select("key")
      .sort({ createdAt: -1 })
      .lean();

    const dbChurchRoleKeys = Array.isArray(dbChurchRoles)
      ? dbChurchRoles.map((r) => String(r?.key || "").trim().toLowerCase()).filter(Boolean)
      : [];

    // Always include built-in roles merged with DB roles so the matrix never
    // drops built-in roles when custom roles exist.
    const churchRoles = Array.from(new Set([...(CHURCH_ROLES || []), ...dbChurchRoleKeys]));

    const roles = {};
    for (const roleKey of churchRoles) {
      roles[roleKey] = await resolvePermissions(roleKey, null, "church");
    }

    // Only church-scoped roles are exposed to the church app — system roles
    // must never appear here.
    const roleList = {
      churchRoles
    };

    return res.status(200).json({ roles, roleList, modules: MODULES });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const canCreateChurchUser = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) return res.status(400).json({ message: "Active church context is required" });

    const subscription = await Subscription.findOne({ church: churchId }).lean();
    if (!subscription?.plan) return res.status(200).json({ allowed: true });

    const plan = await Plan.findById(subscription.plan).select("userLimit").lean();
    const userLimit = plan?.userLimit;
    if (userLimit === null || userLimit === undefined) return res.status(200).json({ allowed: true });

    const totalUsers = await User.countDocuments({ church: churchId });

    if (totalUsers >= Number(userLimit)) {
      return res.status(403).json({
        message: "User limit reached. Upgrade to add more users to manage your church."
      });
    }

    return res.status(200).json({ allowed: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export {
  myProfile,
  updateMyProfile,
  updateMyPassword,
  listChurchUsers,
  createChurchUser,
  updateChurchUser,
  setChurchUserActiveStatus,
  getRolePermissionMatrix,
  canCreateChurchUser
};