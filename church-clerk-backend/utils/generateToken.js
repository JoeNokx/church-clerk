import jwt from "jsonwebtoken";

const generateToken = (userId, expiresIn) => {
    const effectiveExpires = expiresIn || process.env.JWT_EXPIRES_IN || "1d";
    return jwt.sign(
        { id: userId },                   // payload
        process.env.JWT_SECRET,           // secret from .env
        { expiresIn: effectiveExpires }               // token expires in 1 day
    );
};

/**
 * Generates a short-lived delegated session token for a system admin
 * to view a church through the church-facing frontend.
 *
 * The token contains the admin's user ID plus a `delegate` flag and
 * the target church ID, so the backend can identify delegated sessions
 * and scope requests accordingly.
 */
const generateDelegateToken = (userId, churchId, expiresIn) => {
    const effectiveExpires = expiresIn || process.env.DELEGATE_TOKEN_EXPIRES_IN || "2h";
    return jwt.sign(
        { id: userId, delegate: true, delegateChurch: String(churchId) },
        process.env.JWT_SECRET,
        { expiresIn: effectiveExpires }
    );
};

export { generateDelegateToken };
export default generateToken;
