import Church from "../models/churchModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

const churchUserRoles = [
  "churchadmin",
  "associateadmin",
  "secretary",
  "financialofficer",
  "leader"
];

const normalizeRole = (role) => {
  const r = String(role || "").trim().toLowerCase();
  if (r === "super_admin") return "superadmin";
  if (r === "support_admin") return "supportadmin";
  return r;
};

function getDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getHourKey(date = new Date()) {
  const day = getDayKey(date);
  const h = String(date.getHours()).padStart(2, "0");
  return `${day}T${h}`;
}

export function impersonationNotificationMiddleware(req, res, next) {
  try {
    res.on("finish", async () => {
      try {
        if (typeof res.statusCode === "number" && res.statusCode >= 400) return;

        const user = req.user;
        const activeChurch = req.activeChurch;

        if (!user?._id) return;
        if (!activeChurch?._id) return;

        const role = normalizeRole(user?.role);
        if (role === "superadmin" || role === "supportadmin") return;

        if (!user?.church) return;

        const homeChurchId = typeof user.church === "string" ? user.church : user.church?._id;
        if (!homeChurchId) return;

        if (String(activeChurch?.type || "").toLowerCase() !== "branch") return;

        const homeChurch = await Church.findById(homeChurchId).select("_id type").lean();
        if (!homeChurch || String(homeChurch?.type || "").toLowerCase() !== "headquarters") return;

        if (String(activeChurch?.parentChurch || "") !== String(homeChurchId)) return;

        const hourKey = getHourKey();
        const dedupeKey = `impersonation:${String(user._id)}:${String(activeChurch._id)}:${hourKey}`;

        const recipients = await User.find({
          church: activeChurch._id,
          role: { $in: churchUserRoles },
          isActive: true
        })
          .select("_id")
          .lean();

        if (!recipients.length) return;

        const title = "Headquarters is viewing your data";
        const message = `${user.fullName || "A headquarters user"} from your headquarters is currently viewing your branch data.`;

        await Promise.all(
          recipients.map((r) =>
            Notification.create({
              userId: r._id,
              type: "impersonation",
              title,
              message,
              dedupeKey: `${dedupeKey}:${String(r._id)}`
            }).catch(() => null)
          )
        );
      } catch {
        void 0;
      }
    });

    next();
  } catch {
    next();
  }
}
