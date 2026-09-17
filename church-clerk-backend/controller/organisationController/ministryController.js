import ministryModel from '../../models/organisationModel/ministryModel.js'
import Member from "../../models/memberModel.js";
import MinistryMember from "../../models/organisationModel/ministryMembersModel.js";
import { annotateDeletable } from "../../services/recordDependencyService.js";

const searchMembersToAddToMinistry = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const search = String(req.query.search || req.query.q || "").trim();

    const churchId = req.activeChurch?._id || req.user?.church;
    if (!churchId) {
      return res.status(400).json({ message: "Church is missing" });
    }

    if (!search) {
      return res.status(400).json({ message: "Please provide a search term." });
    }

    const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId }).lean();
    if (!ministry) {
      return res.status(404).json({ message: "Ministry not found" });
    }

    const existingMemberIds = await MinistryMember.find({ ministry: ministryId, church: churchId }).distinct("member");
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

const createMinistry = async (req, res) => {
    
    try {
        const { name, description, meetingSchedule, mainMeetingDay, meetingTime, meetingVenue, status } = req.body;

        const churchId = req.activeChurch?._id || req.user?.church;

        if (!name) {
            return res.status(400).json({ message: "ministry name is required" });
        }

        const existing = await ministryModel.findOne({ name, church: churchId });
        if (existing) {
            return res.status(400).json({ message: "ministry name already exist" });
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

        const ministry = await ministryModel.create({
            church: churchId,
            createdBy: req.user._id,
            name,
            description,
            meetingSchedule: meetingScheduleToSave,
            mainMeetingDay,
            meetingTime,
            meetingVenue,
            status
        });

        return res.status(201).json({ message: "ministry created successfully", ministry });
    } catch (error) {
        return res.status(400).json({ message: "ministry could not be created", error: error.message });
    }
}



const getAllMinistries = async (req, res) => {
    
    try {
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { church: churchId };

        const ministries = await ministryModel
            .find(query)
            .sort({ createdAt: -1 })
            .select("name description meetingSchedule mainMeetingDay meetingTime meetingVenue status members church");

        if (!ministries || ministries.length === 0) {
            return res.status(200).json({ message: "No ministries found", count: 0, ministries: [] });
        }

        const ministriesWithCounts = await Promise.all(
          ministries.map(async (ministry) => {
            const memberCount = await MinistryMember.countDocuments({ ministry: ministry._id, church: churchId });
            return { ...ministry.toObject(), totalMembers: memberCount };
          })
        );

        return res.status(200).json({
          message: "ministries found",
          count: ministriesWithCounts.reduce((sum, m) => sum + (m.totalMembers || 0), 0),
          ministries: await annotateDeletable("ministry", ministriesWithCounts, churchId)
        });
    } catch (error) {
        return res.status(400).json({ message: "ministries could not be found", error: error.message });
    }
}

const getSingleMinistry = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const ministry = await ministryModel.findOne(query);

        if (!ministry) {
            return res.status(404).json({ message: "ministry not found" });
        }

        const [annotatedMinistry] = await annotateDeletable("ministry", [ministry], churchId);

        return res.status(200).json({ message: "ministry found", ministry: annotatedMinistry });
    } catch (error) {
        return res.status(400).json({ message: "ministry could not be found", error: error.message });
    }
}


const updateMinistry = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const ministry = await ministryModel.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if (!ministry) {
            return res.status(404).json({ message: "ministry not found" });
        }

        return res.status(200).json({ message: "ministry updated successfully", ministry });
    } catch (error) {
        return res.status(400).json({ message: "ministry could not be updated", error: error.message });
    }
}


const deleteMinistry = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const ministry = await ministryModel.findOneAndDelete(query);
        if (!ministry) {
            return res.status(404).json({ message: "ministry not found" });
        }

        return res.status(200).json({ message: "ministry deleted successfully", ministry });
    } catch (error) {
        return res.status(400).json({ message: "ministry could not be deleted", error: error.message });
    }
}



const addMemberToMinistry = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const searchMember = (req.body.searchMember || "").trim();
    const memberId = (req.body.memberId || "").trim();
    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    const role = req.body.role || "member";

    const churchId = req.activeChurch?._id || req.user?.church;

    if (memberIds.length > 0) {
      const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId });
      if (!ministry) {
        return res.status(404).json({ message: "Ministry not found" });
      }

      const members = await Member.find({ _id: { $in: memberIds }, church: churchId }).select("_id").lean();
      if (!members || members.length === 0) {
        return res.status(404).json({ message: "Members not found" });
      }

      const existing = await MinistryMember.find({
        ministry: ministryId,
        church: churchId,
        member: { $in: members.map((m) => m._id) }
      }).distinct("member");

      const existingSet = new Set(existing.map((id) => String(id)));
      const toCreate = members.filter((m) => !existingSet.has(String(m._id)));

      if (toCreate.length === 0) {
        return res.status(400).json({ message: "Members already in this ministry" });
      }

      const docs = toCreate.map((m) => ({
        ministry: ministryId,
        member: m._id,
        role,
        church: churchId,
        createdBy: req.user._id
      }));

      const created = await MinistryMember.insertMany(docs);

      await Member.updateMany(
        { _id: { $in: toCreate.map((m) => m._id) }, church: churchId },
        { $addToSet: { ministry: ministryId } }
      );

      return res.status(200).json({
        message: "Members added to ministry successfully",
        count: created.length,
        members: created
      });
    }

    if (!memberId && !searchMember) {
      return res.status(400).json({ message: "Please provide memberId, memberIds or a name/email/phone to search." });
    }

    const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId });
    if (!ministry) {
      return res.status(404).json({ message: "Ministry not found" });
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

    const memberExists = await MinistryMember.findOne({ ministry: ministryId, church: churchId, member: member._id });
    if (memberExists) {
      return res.status(400).json({ message: "Member already in this ministry" });
    }

    const memberCreated = await MinistryMember.create({
      ministry: ministryId,
      member: member._id,
      role,
      church: churchId,
      createdBy: req.user._id
    });

    await Member.findByIdAndUpdate(member._id, { $addToSet: { ministry: ministryId } });

    return res.status(200).json({ message: "Member added to ministry successfully", memberCreated });
  } catch (error) {
    return res.status(400).json({ message: "member could not be added to ministry", error: error.message });
  }
}

const getMinistryMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const ministryId = req.params.id;
    const churchId = req.activeChurch?._id || req.user?.church;

    const totalMembers = await MinistryMember.countDocuments({ ministry: ministryId, church: churchId });

    let memberMatch = {};
    if (search) {
      const regex = new RegExp(search, "i");
      memberMatch = {
        $or: [{ firstName: regex }, { lastName: regex }, { phoneNumber: regex }, { email: regex }]
      };
    }

    const ministryMembers = await MinistryMember.find({ ministry: ministryId, church: churchId })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "member",
        match: memberMatch,
        select: "firstName lastName phoneNumber email joinedAt status"
      })
      .populate("ministry", "name");

    const filteredMembers = ministryMembers.filter((mm) => mm.member !== null);

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
      message: "Ministry members fetched successfully.",
      pagination,
      count: totalMembers,
      members: filteredMembers
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}

const updateMinistryMemberRole = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const memberId = req.params.memberId;
    const { role } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const query = { ministry: ministryId, member: memberId, church: churchId };
    const ministryMember = await MinistryMember.findOne(query);
    if (!ministryMember) return res.status(404).json({ message: "ministry member not found" });

    const updatedMember = await MinistryMember.findOneAndUpdate(query, { role }, { new: true })
      .populate("member", "firstName lastName phoneNumber email joinedAt status")
      .populate("ministry", "name");

    if (!updatedMember) {
      return res.status(404).json({ message: "Member not in this ministry" });
    }

    return res.status(200).json({ message: "Member role updated successfully", ministryMember: updatedMember });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update member role", error: error.message });
  }
}

const removeMemberFromMinistry = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const memberId = req.params.memberId;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { ministry: ministryId, member: memberId, church: churchId };
    const ministryMember = await MinistryMember.findOneAndDelete(query);
    if (!ministryMember) return res.status(404).json({ message: "ministry member not found" });

    await Member.findByIdAndUpdate(memberId, { $pull: { ministry: ministryId } });

    return res.status(200).json({ message: "Member removed from ministry successfully", ministryMember });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove member", error: error.message });
  }
}

const addMinistryMeeting = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const { meetingDay, meetingTime, meetingVenue } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    if (!meetingDay || !meetingTime || !meetingVenue) {
      return res.status(400).json({ message: "meetingDay, meetingTime, and meetingVenue are required" });
    }

    const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId });
    if (!ministry) return res.status(404).json({ message: "Ministry not found" });

    ministry.meetingSchedule = Array.isArray(ministry.meetingSchedule) ? ministry.meetingSchedule : [];
    ministry.meetingSchedule.push({ meetingDay, meetingTime, meetingVenue });
    await ministry.save();

    return res.status(201).json({ message: "Meeting added successfully", meetingSchedule: ministry.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not add meeting", error: error.message });
  }
}

const updateMinistryMeeting = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const meetingId = req.params.meetingId;
    const { meetingDay, meetingTime, meetingVenue } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId });
    if (!ministry) return res.status(404).json({ message: "Ministry not found" });

    const meeting = ministry.meetingSchedule?.id(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meetingDay) meeting.meetingDay = meetingDay;
    if (meetingTime) meeting.meetingTime = meetingTime;
    if (meetingVenue) meeting.meetingVenue = meetingVenue;

    await ministry.save();

    return res.status(200).json({ message: "Meeting updated successfully", meetingSchedule: ministry.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not update meeting", error: error.message });
  }
}

const deleteMinistryMeeting = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const meetingId = req.params.meetingId;

    const churchId = req.activeChurch?._id || req.user?.church;

    const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId });
    if (!ministry) return res.status(404).json({ message: "Ministry not found" });

    ministry.meetingSchedule?.pull({ _id: meetingId });
    await ministry.save();

    return res.status(200).json({ message: "Meeting deleted successfully", meetingSchedule: ministry.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete meeting", error: error.message });
  }
}

const getMinistryMeetings = async (req, res) => {
  try {
    const ministryId = req.params.id;
    const churchId = req.activeChurch?._id || req.user?.church;

    const ministry = await ministryModel.findOne({ _id: ministryId, church: churchId }).select("meetingSchedule");
    if (!ministry) return res.status(404).json({ message: "Ministry not found" });

    return res.status(200).json({ message: "Meetings retrieved successfully", meetingSchedule: ministry.meetingSchedule || [] });
  } catch (error) {
    return res.status(500).json({ message: "Could not retrieve meetings", error: error.message });
  }
}


export {
  createMinistry,
  getAllMinistries,
  getSingleMinistry,
  updateMinistry,
  deleteMinistry,
  addMemberToMinistry,
  searchMembersToAddToMinistry,
  getMinistryMembers,
  updateMinistryMemberRole,
  removeMemberFromMinistry,
  addMinistryMeeting,
  updateMinistryMeeting,
  deleteMinistryMeeting,
  getMinistryMeetings
}
