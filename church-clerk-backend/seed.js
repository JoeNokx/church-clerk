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

    const fullName = process.env.SEED_ADMIN_FULLNAME ;
    const email = process.env.SEED_ADMIN_EMAIL ;
    const phoneNumber = process.env.SEED_ADMIN_PHONE ;
    const password = process.env.SEED_ADMIN_PASSWORD ;

    const exists = await User.findOne({ email }).lean();
    if (exists) {
      console.log("Superadmin already exists");
      process.exit(0);
    }

    const superAdmin = await User.create({
      fullName,
      email,
      phoneNumber,
      password,
      role: "superadmin",
      church: null,
      isActive: true
    });

    console.log("Superadmin created successfully:");
    console.log(`- email: ${superAdmin.email}`);
    console.log(`- password: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedSuperAdmin();
