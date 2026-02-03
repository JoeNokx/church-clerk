import User from "../models/userModel.js";
import Church from "../models/churchModel.js";
import generateToken from "../utils/generateToken.js";


//POST: register a new user
const registerUser = async (req, res) => {
    try {
        const {fullName, email, phoneNumber, password, role, churchId} = req.body;
        if(!fullName || !email || !phoneNumber || !password ) {
            return res.status(400).json({message: "all fields are required"})
        }


        //check if user exist
        const userExisting = await User.findOne({email});
        if(userExisting) {
            return res.status(400).json({message: "email already registered."})
        } 

        //Check if user already exists
    const phoneNumberExisting = await User.findOne({ phoneNumber });
    if (phoneNumberExisting) {
      return res.status(400).json({ message: "Phone number already registered" });
    }


        //save user to databse
        const user = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role: role || "churchadmin",
      church: null
    });

   
        console.log(user)

        
        // Generate token
        const token = generateToken(user._id);

        user.password = undefined;

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "Strict",
            maxAge: 24 * 60 * 60 * 1000
        });


        //user successful registered
        console.log("user registered successfully...")

         res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: {
        user,
        nextStep: "church-registration"
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};


//POST: login an existing user
const loginUser =  async (req, res) => {
    try {
        const {email, password} = req.body;

        //check if both fields are filled
        if(!email || !password) { 
        return res.status(400).json({message: "email and password are required"})
        }
        //check if user exist
        const user = await User.findOne({email}).select("+password").populate("church" , "name");
        if(!user) { 
        return res.status(400).json({message: "email or password incorrect."})
        }    

        //check if password is correct    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Email or password incorrect" });

        // Generate token
        const token = generateToken(user._id);

        // Remove password before sending response
        user.password = undefined;

        // Send token in HTTP-only cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });


        //login successful
      res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        user,
        activeChurch: req.activeChurch,
        permissions: req.permissions
      },
      token: token 
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};


//logout user
const logoutUser = async (req, res) => {
  try {
    // Expire the token cookie immediately
    res.cookie("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: new Date(0)
    });

   res.status(200).json({
    status: "success",
    message: "Logged out successfully"
  });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};


//update password
const updatePassword = async (req, res) => {
  try {
    const userId = req.user._id; // from protect middleware
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
      return res.status(401).json({ message: "Old password incorrect." });
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

    res.status(200).json({
      status: "success",
      message: "Password updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};


export {registerUser, loginUser, logoutUser, updatePassword}