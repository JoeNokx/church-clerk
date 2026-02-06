import departmentModel from "../../models/ministryModel/departmentModel.js";
import Member from "../../models/memberModel.js";
import DepartmentMember from "../../models/ministryModel/departmentMembersModel.js";

const searchMembersToAddToDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const search = String(req.query.search || req.query.q || "").trim();

    const churchId = req.activeChurch?._id || req.user?.church;
    if (!churchId) {
      return res.status(400).json({ message: "Church is missing" });
    }

    if (!search) {
      return res.status(400).json({ message: "Please provide a search term." });
    }

    const department = await departmentModel.findOne({ _id: departmentId, church: churchId }).lean();
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const existingMemberIds = await DepartmentMember.find({ department: departmentId, church: churchId }).distinct("member");
    const regex = new RegExp(search, "i");

    const members = await Member.find({
      church: churchId,
      _id: { $nin: existingMemberIds },
      $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phoneNumber: regex }]
    })
      .sort({ firstName: 1, lastName: 1 })
      .select("firstName lastName phoneNumber email city")
      .limit(30)
      .lean();

    return res.status(200).json({
      message: "Members fetched successfully",
      count: members.length,
      members
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to search members", error: error.message });
  }
};

const createDepartment = async (req, res) => {
    
    try {
        const { name, description, meetingSchedule, mainMeetingDay, meetingTime, meetingVenue, roles, status } = req.body;

        const churchId = req.activeChurch?._id || req.user?.church;

        if (!name) {
            return res.status(400).json({ message: "department name is required" });
        }

        const existing = await departmentModel.findOne({ name, church: churchId });
        if (existing) {
            return res.status(400).json({ message: "department name already exist" });
        }

        let meetingScheduleToSave = Array.isArray(meetingSchedule) ? meetingSchedule : [];

        if (meetingScheduleToSave.length) {
          const invalidMeeting = meetingScheduleToSave.find(
            (m) => !m?.meetingDay || !m?.meetingTime || !m?.meetingVenue
          );
          if (invalidMeeting) {
            return res.status(400).json({ message: "Each meeting must have a day, time, and venue" });
          }
        } else if (mainMeetingDay && meetingTime && meetingVenue) {
          meetingScheduleToSave = [{ meetingDay: mainMeetingDay, meetingTime, meetingVenue }];
        }

        const department = await departmentModel.create({
            church: churchId,
            createdBy: req.user._id,
            name,
            description,
            meetingSchedule: meetingScheduleToSave,
            mainMeetingDay,
            meetingTime,
            meetingVenue,
            roles,
            status
        });

        return res.status(201).json({ message: "department created successfully", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be created", error: error.message });
    }
}

const getAllDepartments = async (req, res) => {
    
    try {
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { church: churchId };

        const departments = await departmentModel
            .find(query)
            .sort({ createdAt: -1 })
            .select("name description meetingSchedule mainMeetingDay meetingTime meetingVenue roles status");

        if (!departments || departments.length === 0) {
            return res.status(200).json({ message: "No departments found", count: 0, departments: [] });
        }

        const departmentsWithCounts = await Promise.all(
          departments.map(async (department) => {
            const memberCount = await DepartmentMember.countDocuments({ department: department._id, church: churchId });
            return { ...department.toObject(), totalMembers: memberCount };
          })
        );

        return res.status(200).json({
          message: "departments found",
          count: departmentsWithCounts.reduce((sum, d) => sum + (d.totalMembers || 0), 0),
          departments: departmentsWithCounts
        });
    } catch (error) {
        return res.status(400).json({ message: "departments could not be found", error: error.message });
    }
}

const getSingleDepartment = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const department = await departmentModel.findOne(query);

        if (!department) {
            return res.status(404).json({ message: "department not found" });
        }

        return res.status(200).json({ message: "department found", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be found", error: error.message });
    }
}

const updateDepartment = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const department = await departmentModel.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if (!department) {
            return res.status(404).json({ message: "department not found" });
        }

        return res.status(200).json({ message: "department updated successfully", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be updated", error: error.message });
    }
}

const deleteDepartment = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const department = await departmentModel.findOneAndDelete(query);

        if (!department) {
            return res.status(404).json({ message: "department not found" });
        }

        return res.status(200).json({ message: "department deleted successfully", department });
    } catch (error) {
        return res.status(400).json({ message: "department could not be deleted", error: error.message });
    }
}

// MEMBERS

const addMemberToDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const searchMember = (req.body.searchMember || "").trim();
    const memberId = (req.body.memberId || "").trim();
    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    const role = req.body.role || "member";

    const churchId = req.activeChurch?._id || req.user?.church;

    if (memberIds.length > 0) {
      const department = await departmentModel.findOne({ _id: departmentId, church: churchId });
      if (!department) {
        return res.status(404).json({ message: "Department not found" });
      }

      const members = await Member.find({ _id: { $in: memberIds }, church: churchId }).select("_id").lean();
      if (!members || members.length === 0) {
        return res.status(404).json({ message: "Members not found" });
      }

      const existing = await DepartmentMember.find({
        department: departmentId,
        church: churchId,
        member: { $in: members.map((m) => m._id) }
      }).distinct("member");

      const existingSet = new Set(existing.map((id) => String(id)));
      const toCreate = members.filter((m) => !existingSet.has(String(m._id)));

      if (toCreate.length === 0) {
        return res.status(400).json({ message: "Members already in this department" });
      }

      const docs = toCreate.map((m) => ({
        department: departmentId,
        member: m._id,
        role,
        church: churchId,
        createdBy: req.user._id
      }));

      const created = await DepartmentMember.insertMany(docs);

      return res.status(200).json({
        message: "Members added to department successfully",
        count: created.length,
        members: created
      });
    }

    if (!memberId && !searchMember) {
      return res.status(400).json({ message: "Please provide memberId, memberIds or a name/email/phone to search." });
    }

    const department = await departmentModel.findOne({ _id: departmentId, church: churchId });
    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const member = memberId
      ? await Member.findOne({ _id: memberId, church: churchId })
      : await Member.findOne({
          church: churchId,
          $or: [
            { firstName: { $regex: searchMember, $options: "i" } },
            { lastName: { $regex: searchMember, $options: "i" } },
            { email: { $regex: searchMember, $options: "i" } },
            { phoneNumber: { $regex: searchMember, $options: "i" } }
          ]
        });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const memberExists = await DepartmentMember.findOne({ department: departmentId, church: churchId, member: member._id });
    if (memberExists) {
      return res.status(400).json({ message: "Member already in this department" });
    }

    const memberCreated = await DepartmentMember.create({
      department: departmentId,
      member: member._id,
      role,
      church: churchId,
      createdBy: req.user._id
    });

    return res.status(200).json({ message: "Member added to department successfully", memberCreated });
  } catch (error) {
    return res.status(400).json({ message: "member could not be added to department", error: error.message });
  }
};

const getDepartmentMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const departmentId = req.params.id;
    const churchId = req.activeChurch?._id || req.user?.church;

    const totalMembers = await DepartmentMember.countDocuments({ department: departmentId, church: churchId });

    let memberMatch = {};
    if (search) {
      const regex = new RegExp(search, "i");
      memberMatch = {
        $or: [{ firstName: regex }, { lastName: regex }, { phoneNumber: regex }, { email: regex }]
      };
    }

    const departmentMembers = await DepartmentMember.find({ department: departmentId, church: churchId })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "member",
        match: memberMatch,
        select: "firstName lastName phoneNumber email joinedAt status"
      })
      .populate("department", "name");

    const filteredMembers = departmentMembers.filter((dm) => dm.member !== null);

    const totalPages = Math.ceil(totalMembers / limitNum);
    const pagination = {
      totalResult: totalMembers,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    if (!filteredMembers || filteredMembers.length === 0) {
      return res.status(200).json({
        message: "No member found.",
        pagination: {
          totalResult: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null
        },
        count: 0,
        members: []
      });
    }

    return res.status(200).json({
      message: "Department members fetched successfully.",
      pagination,
      count: totalMembers,
      members: filteredMembers
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

const updateDepartmentMemberRole = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const memberId = req.params.memberId;
    const { role } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const query = { department: departmentId, member: memberId, church: churchId };

    const departmentMember = await DepartmentMember.findOne(query);
    if (!departmentMember) return res.status(404).json({ message: "department member not found" });

    const updatedMember = await DepartmentMember.findOneAndUpdate(query, { role }, { new: true })
      .populate("member", "firstName lastName phoneNumber email joinedAt status")
      .populate("department", "name");

    if (!updatedMember) {
      return res.status(404).json({ message: "Member not in this department" });
    }

    return res.status(200).json({ message: "Member role updated successfully", departmentMember: updatedMember });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update member role", error: error.message });
  }
};

const removeMemberFromDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const memberId = req.params.memberId;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { department: departmentId, member: memberId, church: churchId };

    const departmentMember = await DepartmentMember.findOneAndDelete(query);
    if (!departmentMember) return res.status(404).json({ message: "department member not found" });

    return res.status(200).json({ message: "Member removed from department successfully", departmentMember });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove member", error: error.message });
  }
};

// MEETINGS

const addDepartmentMeeting = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const { meetingDay, meetingTime, meetingVenue } = req.body;
    const churchId = req.activeChurch?._id || req.user?.church;

    if (!meetingDay || !meetingTime || !meetingVenue) {
      return res.status(400).json({ message: "meetingDay, meetingTime, and meetingVenue are required" });
    }

    const department = await departmentModel.findOne({ _id: departmentId, church: churchId });
    if (!department) return res.status(404).json({ message: "Department not found" });

    department.meetingSchedule = Array.isArray(department.meetingSchedule) ? department.meetingSchedule : [];
    department.meetingSchedule.push({ meetingDay, meetingTime, meetingVenue });
    await department.save();

    return res.status(201).json({ message: "Meeting added successfully", meetingSchedule: department.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not add meeting", error: error.message });
  }
};

const updateDepartmentMeeting = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const meetingId = req.params.meetingId;
    const { meetingDay, meetingTime, meetingVenue } = req.body;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await departmentModel.findOne({ _id: departmentId, church: churchId });
    if (!department) return res.status(404).json({ message: "Department not found" });

    const meeting = department.meetingSchedule?.id(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meetingDay) meeting.meetingDay = meetingDay;
    if (meetingTime) meeting.meetingTime = meetingTime;
    if (meetingVenue) meeting.meetingVenue = meetingVenue;

    await department.save();

    return res.status(200).json({ message: "Meeting updated successfully", meetingSchedule: department.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not update meeting", error: error.message });
  }
};

const deleteDepartmentMeeting = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const meetingId = req.params.meetingId;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await departmentModel.findOne({ _id: departmentId, church: churchId });
    if (!department) return res.status(404).json({ message: "Department not found" });

    department.meetingSchedule?.pull({ _id: meetingId });
    await department.save();

    return res.status(200).json({ message: "Meeting deleted successfully", meetingSchedule: department.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete meeting", error: error.message });
  }
};

const getDepartmentMeetings = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const churchId = req.activeChurch?._id || req.user?.church;

    const department = await departmentModel.findOne({ _id: departmentId, church: churchId }).select("meetingSchedule");
    if (!department) return res.status(404).json({ message: "Department not found" });

    return res.status(200).json({ message: "Meetings retrieved successfully", meetingSchedule: department.meetingSchedule || [] });
  } catch (error) {
    return res.status(500).json({ message: "Could not retrieve meetings", error: error.message });
  }
};

export {
  createDepartment,
  getAllDepartments,
  getSingleDepartment,
  updateDepartment,
  deleteDepartment,
  addMemberToDepartment,
  searchMembersToAddToDepartment,
  getDepartmentMembers,
  updateDepartmentMemberRole,
  removeMemberFromDepartment,
  addDepartmentMeeting,
  updateDepartmentMeeting,
  deleteDepartmentMeeting,
  getDepartmentMeetings
}