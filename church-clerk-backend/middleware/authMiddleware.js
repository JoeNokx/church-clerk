import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const protect = async (req, res, next) => {
  try {
    let token;

    //Check for token in Authorization header (Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    //If not in header, check cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no token, block access
    if (!token) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded contains payload: { id: userId, iat: timestamp, exp: timestamp }

    // Attach the user to the request object
    req.user = await User.findById(decoded.id).select("-password");

    // Continue to the route
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

export { protect };
