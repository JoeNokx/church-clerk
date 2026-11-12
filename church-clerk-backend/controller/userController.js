import User from "../models/userModel.js"
import { ROLE_PERMISSIONS, CHURCH_ROLES, ROLE_DISPLAY_NAMES } from "../config/roles.js"
import cloudinary from "../config/cloudinary.js"
import { validatePhoneNumber } from "../utils/validatePhoneNumber.js"
import Role from "../models/roleModel.js"
import { MODULES, SYSTEM_MODULES } from "../config/permissions.js"
import { resolvePermissions } from "../utils/resolvePermissions.js"
import Subscription from "../models/billingModel/subscriptionModel.js"
import Plan from "../models/billingModel/planModel.js"
import { sendRegistrationVerificationEmail } from "../services/auth/emailVerificationService.js"
import Member from "../models/memberModel.js"

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

    const { fullName, email, phoneNumber, password, role, linkMemberId } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (!linkMemberId) {
      return res.status(400).json({ message: "Select a registered member to create a user account" });
    }

    let validatedPhoneNumber;
    try {
      validatedPhoneNumber = validatePhoneNumber(phoneNumber, "GH");
    } catch (e) {
      return res.status(400).json({ message: e?.message || "Invalid phone number" });
    }

    const roleKey = String(role || "").trim().toLowerCase();
    if (roleKey === "churchclerkadmin") {
      return res.status(403).json({ message: "The ChurchClerk Admin role cannot be assigned here" });
    }
    let roleRef = null;
    const dbRole =
      (await Role.findOne({ key: roleKey, scope: "church", church: churchId }).select("_id isActive").lean()) ||
      (await Role.findOne({ key: roleKey, scope: "church", church: null }).select("_id isActive").lean());
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

    // Users can only be created for registered members of this church —
    // validate the link target before creating the account.
    const linkTarget = await Member.findOne({ _id: linkMemberId, church: churchId });
    if (!linkTarget) {
      return res.status(400).json({ message: "Member not found in this church" });
    }
    if (linkTarget.user) {
      return res.status(409).json({ message: "This member already has a user account" });
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

    linkTarget.user = user._id;
    await linkTarget.save();

    return res.status(201).json({ message: "User created. A verification email has been sent to their inbox.", user, linkedMember: linkTarget });
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
      // User management permissions never apply to one's own account.
      if (String(req.user?._id || "") === String(id)) {
        return res.status(403).json({ message: "You cannot change your own role" });
      }
      const roleKey = String(role || "").trim().toLowerCase();
      // The ChurchClerk Admin role is granted at account creation by the
      // system — it can neither be assigned nor changed from a church context.
      if (roleKey === "churchclerkadmin" || String(existing.role || "").trim().toLowerCase() === "churchclerkadmin") {
        return res.status(403).json({ message: "The ChurchClerk Admin role cannot be assigned or changed here" });
      }
      let roleRef = null;
      const dbRole =
        (await Role.findOne({ key: roleKey, scope: "church", church: churchId }).select("_id isActive").lean()) ||
        (await Role.findOne({ key: roleKey, scope: "church", church: null }).select("_id isActive").lean());
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

    // The route's requirePermission("settingsUsersRoles","deactivate") is the
    // real gate — any role (built-in or custom) holding that permission may
    // activate/deactivate. No extra built-in-only check here.

    const target = await User.findOne({ _id: id, church: churchId }).select("role fullName email phoneNumber isActive").lean();
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }

    // ChurchClerk Admin accounts are managed by the system admin — no church
    // user (including the account holder) can activate or deactivate them here.
    if (String(target.role || "").trim().toLowerCase() === "churchclerkadmin") {
      return res.status(403).json({ message: "ChurchClerk Admin accounts can only be managed by the system admin" });
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
    const churchId = req.activeChurch?._id || null;

    const roleFilter = { scope: "church", isActive: true };
    if (churchId) {
      roleFilter.$or = [{ church: churchId }, { church: null }];
    } else {
      roleFilter.church = null;
    }

    const dbChurchRoles = await Role.find(roleFilter)
      .select("key name")
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
      roles[roleKey] = await resolvePermissions(roleKey, null, "church", churchId);
    }

    // Display names for every role in the list — built-ins come from the
    // config map, custom roles keep the name the church gave them.
    const dbRoleNames = {};
    for (const r of dbChurchRoles || []) {
      const k = String(r?.key || "").trim().toLowerCase();
      if (k && r?.name) dbRoleNames[k] = r.name;
    }
    const roleNames = {};
    for (const roleKey of churchRoles) {
      roleNames[roleKey] = dbRoleNames[roleKey] || ROLE_DISPLAY_NAMES?.[roleKey] || roleKey;
    }

    // Only church-scoped roles are exposed to the church app — system roles
    // must never appear here.
    const roleList = {
      churchRoles,
      builtinRoles: [...(CHURCH_ROLES || [])]
    };

    // System-scope modules power the admin portal — never offer them to a
    // church role editor.
    const churchModules = { ...MODULES };
    for (const k of SYSTEM_MODULES) delete churchModules[k];

    return res.status(200).json({ roles, roleList, roleNames, modules: churchModules });
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