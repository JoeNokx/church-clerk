import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import connectDB from "./config/db.js";
import User from "./models/userModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const seedSuperAdmin = async () => {
  try {
    await connectDB();

    const email = "superadmin@test.com";

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      console.log("Superadmin already exists");
      process.exit(0);
    }

    const superAdmin = await User.create({
      fullName: "Super Admin",
      email,
      phoneNumber: "0546022758",
      password: "@Password1864",
      role: "superadmin",
      church: null,
      isActive: true
    });

    console.log("Superadmin created successfully:");
    console.log(`- email: ${superAdmin.email}`);
    console.log(`- password: @Password1864`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedSuperAdmin();
