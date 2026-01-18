import express from "express";
const router = express.Router();
import {registerUser, loginUser, logoutUser, updatePassword} from "../controller/authController.js"
import { protect } from "../middleware/authMiddleware.js";


router.post("/register", registerUser); 
router.post("/login", loginUser);
router.post("/logout", protect, logoutUser);
router.put("/change-password", protect, updatePassword);


export default router;
