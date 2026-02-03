import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Member from "../models/memberModel.js";



// GET all churches in system
const getAllChurches = async (req, res) => {
  try {
    const churches = await Church.find().lean();
    res.status(200).json({
      message: "All churches fetched successfully",
      data: churches,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// GET all users in system (superadmin + supportadmin)
const getAllSystemUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ["superadmin","supportadmin"] } })
      .select("-password")
      .lean();

    res.status(200).json({
      message: "System users fetched successfully",
      data: users,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// GET dashboard stats for superadmin
const getDashboardStats = async (req, res) => {
  try {
    const totalChurches = await Church.countDocuments();
    const totalMembers = await Member.countDocuments();
    const totalUsers = await User.countDocuments();

    res.status(200).json({
      message: "Dashboard stats fetched successfully",
      data: {
        totalChurches,
        totalMembers,
        totalUsers
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export { getAllChurches, getAllSystemUsers, getDashboardStats };