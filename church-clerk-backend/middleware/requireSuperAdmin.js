const requireSuperAdmin = (req, res, next) => {
  const rawRole = req?.user?.role;
  const role = String(rawRole || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "");
  if (role !== "superadmin" && role !== "supportadmin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

export default requireSuperAdmin;
