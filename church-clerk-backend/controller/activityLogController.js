import activityLogModel from "../models/activityLogModel.js";




const getAllActivityLogs = async (req, res) => {
    try {
        const churchId = req.activeChurch?._id || null;

        const {
            search = "",
            module = "",
            action = "",
            role = "",
            dateFrom = "",
            dateTo = "",
            page = 1,
            limit = 20
        } = req.query;

        const safePage = Math.max(1, Number(page) || 1);
        const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

        const query = {};
        if (churchId) query.church = churchId;

        const q = String(search || "").trim();
        if (q) {
            const regex = new RegExp(q, "i");
            query.$or = [
                { userName: regex },
                { userRole: regex },
                { module: regex },
                { action: regex },
                { resource: regex },
                { path: regex },
                { ipAddress: regex },
                { deviceType: regex },
                { browser: regex },
                { os: regex },
                { model: regex },
                { userAgent: regex }
            ];
        }

        const moduleFilter = String(module || "").trim();
        if (moduleFilter) query.module = moduleFilter;

        const actionFilter = String(action || "").trim();
        if (actionFilter) query.action = actionFilter;

        const roleFilter = String(role || "").trim();
        if (roleFilter) query.userRole = roleFilter;

        const from = String(dateFrom || "").trim();
        const to = String(dateTo || "").trim();
        if (from || to) {
            const range = {};
            if (from) {
                const d = new Date(from);
                if (!Number.isNaN(d.getTime())) range.$gte = d;
            }
            if (to) {
                const d = new Date(to);
                if (!Number.isNaN(d.getTime())) {
                    d.setHours(23, 59, 59, 999);
                    range.$lte = d;
                }
            }
            if (Object.keys(range).length) {
                query.createdAt = range;
            }
        }

        const total = await activityLogModel.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / safeLimit));
        const skip = (safePage - 1) * safeLimit;

        const logs = await activityLogModel
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .populate("user", "fullName role")
            .lean();

        return res.status(200).json({
            message: "Activity logs fetched",
            logs,
            pagination: {
                total,
                totalPages,
                currentPage: safePage,
                limit: safeLimit,
                nextPage: safePage < totalPages ? safePage + 1 : null,
                prevPage: safePage > 1 ? safePage - 1 : null
            }
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};



const getSingleActivityLog = async (req, res) => {
    try {
        const churchId = req.activeChurch?._id || null;
        const { id } = req.params;
        const query = { _id: id };
        if (churchId) query.church = churchId;

        const log = await activityLogModel
            .findOne(query)
            .populate("user", "fullName role")
            .lean();

        if (!log) {
            return res.status(404).json({ message: "Activity log not found" });
        }

        return res.status(200).json({ message: "Activity log fetched", log });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};



export {getAllActivityLogs, getSingleActivityLog}
