const requireSuperAdmin = (req, res, next) => {
  const role = req?.user?.role;
  if (role !== "superadmin" && role !== "super_admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};

export default requireSuperAdmin;
