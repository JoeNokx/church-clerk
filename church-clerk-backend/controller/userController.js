import User from "../models/userModel.js";


//GET: fetch my profile
const myProfile =  async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select("-password");

        //check if user exist
         if(!user) {
        res.status(404).json({message: "user not found"})
         }
       
        //my profile successfully retrieve
        res.status(201).json(user)
        console.log("my profile retrieved successfully...")

    } catch (error) {
        res.status(400).json({message: error.message})
        console.log("user could not be found")

    }
};



//PUT: update my profile details
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
          const { email } = req.body;

        // const {name, email} = req.body;
        if(email) {
            const emailExisting = await User.findOne({email});
            if(emailExisting && emailExisting._id.toString() !== userId.toString()) {
                return res.status(400).json({message: "email already in use by another user."}) 
            }
        }
        const user = await User.findByIdAndUpdate(userId, req.body, {new: true, runValidators:true}).select("-password").populate("church", "name");
       
        //check if user exist
        if(!user) {
        return res.status(404).json({message: "user not found"})
        }

        //user successful update
                console.log("user details updated successfully...")

        res.status(201).json(user)

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



export {myProfile, updateMyProfile, updateMyPassword}