import jwt from "jsonwebtoken";

const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },                   // payload
        process.env.JWT_SECRET,           // secret from .env
        { expiresIn: "1d" }               // token expires in 1 day
    );
};

export default generateToken;
