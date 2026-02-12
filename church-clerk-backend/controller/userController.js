import User from "../models/userModel.js";
import { ROLE_PERMISSIONS, CHURCH_ROLES, SYSTEM_ROLES } from "../config/roles.js";
import cloudinary from "../config/cloudinary.js";

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
        if (req.body?.phoneNumber !== undefined) update.phoneNumber = String(req.body.phoneNumber || "").trim();

        const file = req.file;
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

    return res.status(200).json({ message: "Users fetched", users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createChurchUser = async (req, res) => {
  try {
    if (req.user?.role !== "churchadmin") {
      return res.status(403).json({ message: "Only a church admin can add users" });
    }

    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { fullName, email, phoneNumber, password, role } = req.body;
    if (!fullName || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!CHURCH_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const emailExisting = await User.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (emailExisting) {
      return res.status(400).json({ message: "email already registered." });
    }

    const phoneExisting = await User.findOne({ phoneNumber: String(phoneNumber).trim() }).lean();
    if (phoneExisting) {
      return res.status(400).json({ message: "Phone number already registered" });
    }

    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role,
      church: churchId,
      isActive: true
    });

    user.password = undefined;

    return res.status(201).json({ message: "User created", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateChurchUser = async (req, res) => {
  try {
    if (req.user?.role !== "churchadmin") {
      return res.status(403).json({ message: "Only a church admin can update users" });
    }

    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Active church context is required" });
    }

    const { id } = req.params;
    const { fullName, email, phoneNumber, role } = req.body;

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

    if (phoneNumber) {
      const phoneExisting = await User.findOne({ phoneNumber }).lean();
      if (phoneExisting && String(phoneExisting._id) !== String(id)) {
        return res.status(400).json({ message: "Phone number already in use by another user." });
      }
    }

    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (email !== undefined) update.email = email;
    if (phoneNumber !== undefined) update.phoneNumber = phoneNumber;
    if (role !== undefined) {
      if (!CHURCH_ROLES.includes(role)) {
        return res.status(400).json({ message: "Invalid role selected" });
      }
      update.role = role;
    }

    const user = await User.findOneAndUpdate(
      { _id: id, church: churchId },
      update,
      { new: true, runValidators: true }
    )
      .select("fullName email phoneNumber role isActive createdAt")
      .lean();

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

    if (String(req.user?._id || "") === String(id) && isActive === false) {
      return res.status(400).json({ message: "You cannot deactivate your own account" });
    }

    const user = await User.findOneAndUpdate(
      { _id: id, church: churchId },
      { isActive },
      { new: true }
    )
      .select("fullName email phoneNumber role isActive createdAt")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "User status updated", user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getRolePermissionMatrix = async (req, res) => {
  try {
    const roles = { ...ROLE_PERMISSIONS };
    const roleList = {
      systemRoles: SYSTEM_ROLES,
      churchRoles: CHURCH_ROLES
    };

    return res.status(200).json({ roles, roleList });
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
  getRolePermissionMatrix
}