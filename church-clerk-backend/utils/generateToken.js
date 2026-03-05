import jwt from "jsonwebtoken";

const generateToken = (userId, expiresIn) => {
    const effectiveExpires = expiresIn || process.env.JWT_EXPIRES_IN || "1d";
    return jwt.sign(
        { id: userId },                   // payload
        process.env.JWT_SECRET,           // secret from .env
        { expiresIn: effectiveExpires }               // token expires in 1 day
    );
};

export default generateToken;
