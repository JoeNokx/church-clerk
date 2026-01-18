import express from "express";
const router = express.Router();
import { myProfile, updateMyProfile, updateMyPassword} from "../controller/userController.js";
import { protect } from "../middleware/authMiddleware.js";


router.get("/my-profile", protect, myProfile);
router.put("/update-my-profile", protect, updateMyProfile);
router.put("/update-my-password", protect, updateMyPassword);


export default router;
