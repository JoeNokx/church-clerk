import cellModel from '../../models/ministryModel/cellModel.js'
import Member from "../../models/memberModel.js";
import CellMember from "../../models/ministryModel/cellMembersModel.js";

const searchMembersToAddToCell = async (req, res) => {
  try {
    const cellId = req.params.id;
    const search = String(req.query.search || req.query.q || "").trim();

    const churchId = req.activeChurch?._id || req.user?.church;
    if (!churchId) {
      return res.status(400).json({ message: "Church is missing" });
    }

    if (!search) {
      return res.status(400).json({ message: "Please provide a search term." });
    }

    const cell = await cellModel.findOne({ _id: cellId, church: churchId }).lean();
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
    }

    const existingMemberIds = await CellMember.find({ cell: cellId, church: churchId }).distinct("member");
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

const createCell = async (req, res) => {
    
    try {
        const { name, description, meetingSchedule, mainMeetingDay, meetingTime, meetingVenue, status } = req.body;

        const churchId = req.activeChurch?._id || req.user?.church;

        if (!name) {
            return res.status(400).json({ message: "cell name is required" });
        }

        const existing = await cellModel.findOne({ name, church: churchId });
        if (existing) {
            return res.status(400).json({ message: "cell name already exist" });
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

        const cell = await cellModel.create({
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

        return res.status(201).json({ message: "cell created successfully", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be created", error: error.message });
    }
}



const getAllCells = async (req, res) => {
    
    try {
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { church: churchId };

        const cells = await cellModel
            .find(query)
            .sort({ createdAt: -1 })
            .select("name description meetingSchedule mainMeetingDay meetingTime meetingVenue status");

        if (!cells || cells.length === 0) {
            return res.status(200).json({ message: "No cells found", count: 0, cells: [] });
        }

        const cellsWithCounts = await Promise.all(
          cells.map(async (cell) => {
            const memberCount = await CellMember.countDocuments({ cell: cell._id, church: churchId });
            return { ...cell.toObject(), totalMembers: memberCount };
          })
        );

        return res.status(200).json({
          message: "cells found",
          count: cellsWithCounts.reduce((sum, c) => sum + (c.totalMembers || 0), 0),
          cells: cellsWithCounts
        });
    } catch (error) {
        return res.status(400).json({ message: "cells could not be found", error: error.message });
    }
}

const getSingleCell = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const cell = await cellModel.findOne(query);

        if (!cell) {
            return res.status(404).json({ message: "cell not found" });
        }

        return res.status(200).json({ message: "cell found", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be found", error: error.message });
    }
}


const updateCell = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const cell = await cellModel.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        });

        if (!cell) {
            return res.status(404).json({ message: "cell not found" });
        }

        return res.status(200).json({ message: "cell updated successfully", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be updated", error: error.message });
    }
}


const deleteCell = async (req, res) => {
    
    try {
        const { id } = req.params;
        const churchId = req.activeChurch?._id || req.user?.church;
        const query = { _id: id, church: churchId };

        const cell = await cellModel.findOneAndDelete(query);
        if (!cell) {
            return res.status(404).json({ message: "cell not found" });
        }

        return res.status(200).json({ message: "cell deleted successfully", cell });
    } catch (error) {
        return res.status(400).json({ message: "cell could not be deleted", error: error.message });
    }
}



const addMemberToCell = async (req, res) => {
  try {
    const cellId = req.params.id;
    const searchMember = (req.body.searchMember || "").trim();
    const memberId = (req.body.memberId || "").trim();
    const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    const role = req.body.role || "member";

    const churchId = req.activeChurch?._id || req.user?.church;

    if (memberIds.length > 0) {
      const cell = await cellModel.findOne({ _id: cellId, church: churchId });
      if (!cell) {
        return res.status(404).json({ message: "Cell not found" });
      }

      const members = await Member.find({ _id: { $in: memberIds }, church: churchId }).select("_id").lean();
      if (!members || members.length === 0) {
        return res.status(404).json({ message: "Members not found" });
      }

      const existing = await CellMember.find({
        cell: cellId,
        church: churchId,
        member: { $in: members.map((m) => m._id) }
      }).distinct("member");

      const existingSet = new Set(existing.map((id) => String(id)));
      const toCreate = members.filter((m) => !existingSet.has(String(m._id)));

      if (toCreate.length === 0) {
        return res.status(400).json({ message: "Members already in this cell" });
      }

      const docs = toCreate.map((m) => ({
        cell: cellId,
        member: m._id,
        role,
        church: churchId,
        createdBy: req.user._id
      }));

      const created = await CellMember.insertMany(docs);

      return res.status(200).json({
        message: "Members added to cell successfully",
        count: created.length,
        members: created
      });
    }

    if (!memberId && !searchMember) {
      return res.status(400).json({ message: "Please provide memberId, memberIds or a name/email/phone to search." });
    }

    const cell = await cellModel.findOne({ _id: cellId, church: churchId });
    if (!cell) {
      return res.status(404).json({ message: "Cell not found" });
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

    const memberExists = await CellMember.findOne({ cell: cellId, church: churchId, member: member._id });
    if (memberExists) {
      return res.status(400).json({ message: "Member already in this cell" });
    }

    const memberCreated = await CellMember.create({
      cell: cellId,
      member: member._id,
      role,
      church: churchId,
      createdBy: req.user._id
    });

    return res.status(200).json({ message: "Member added to cell successfully", memberCreated });
  } catch (error) {
    return res.status(400).json({ message: "member could not be added to cell", error: error.message });
  }
}

const getCellMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const cellId = req.params.id;
    const churchId = req.activeChurch?._id || req.user?.church;

    const totalMembers = await CellMember.countDocuments({ cell: cellId, church: churchId });

    let memberMatch = {};
    if (search) {
      const regex = new RegExp(search, "i");
      memberMatch = {
        $or: [{ firstName: regex }, { lastName: regex }, { phoneNumber: regex }, { email: regex }]
      };
    }

    const cellMembers = await CellMember.find({ cell: cellId, church: churchId })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "member",
        match: memberMatch,
        select: "firstName lastName phoneNumber email joinedAt status"
      })
      .populate("cell", "name");

    const filteredMembers = cellMembers.filter((cm) => cm.member !== null);

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
      message: "Cell members fetched successfully.",
      pagination,
      count: totalMembers,
      members: filteredMembers
    });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
}

const updateCellMemberRole = async (req, res) => {
  try {
    const cellId = req.params.id;
    const memberId = req.params.memberId;
    const { role } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const query = { cell: cellId, member: memberId, church: churchId };
    const cellMember = await CellMember.findOne(query);
    if (!cellMember) return res.status(404).json({ message: "cell member not found" });

    const updatedMember = await CellMember.findOneAndUpdate(query, { role }, { new: true })
      .populate("member", "firstName lastName phoneNumber email joinedAt status")
      .populate("cell", "name");

    if (!updatedMember) {
      return res.status(404).json({ message: "Member not in this cell" });
    }

    return res.status(200).json({ message: "Member role updated successfully", cellMember: updatedMember });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update member role", error: error.message });
  }
}

const removeMemberFromCell = async (req, res) => {
  try {
    const cellId = req.params.id;
    const memberId = req.params.memberId;
    const churchId = req.activeChurch?._id || req.user?.church;

    const query = { cell: cellId, member: memberId, church: churchId };
    const cellMember = await CellMember.findOneAndDelete(query);
    if (!cellMember) return res.status(404).json({ message: "cell member not found" });

    return res.status(200).json({ message: "Member removed from cell successfully", cellMember });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove member", error: error.message });
  }
}

const addCellMeeting = async (req, res) => {
  try {
    const cellId = req.params.id;
    const { meetingDay, meetingTime, meetingVenue } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    if (!meetingDay || !meetingTime || !meetingVenue) {
      return res.status(400).json({ message: "meetingDay, meetingTime, and meetingVenue are required" });
    }

    const cell = await cellModel.findOne({ _id: cellId, church: churchId });
    if (!cell) return res.status(404).json({ message: "Cell not found" });

    cell.meetingSchedule = Array.isArray(cell.meetingSchedule) ? cell.meetingSchedule : [];
    cell.meetingSchedule.push({ meetingDay, meetingTime, meetingVenue });
    await cell.save();

    return res.status(201).json({ message: "Meeting added successfully", meetingSchedule: cell.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not add meeting", error: error.message });
  }
}

const updateCellMeeting = async (req, res) => {
  try {
    const cellId = req.params.id;
    const meetingId = req.params.meetingId;
    const { meetingDay, meetingTime, meetingVenue } = req.body;

    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await cellModel.findOne({ _id: cellId, church: churchId });
    if (!cell) return res.status(404).json({ message: "Cell not found" });

    const meeting = cell.meetingSchedule?.id(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meetingDay) meeting.meetingDay = meetingDay;
    if (meetingTime) meeting.meetingTime = meetingTime;
    if (meetingVenue) meeting.meetingVenue = meetingVenue;

    await cell.save();

    return res.status(200).json({ message: "Meeting updated successfully", meetingSchedule: cell.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not update meeting", error: error.message });
  }
}

const deleteCellMeeting = async (req, res) => {
  try {
    const cellId = req.params.id;
    const meetingId = req.params.meetingId;

    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await cellModel.findOne({ _id: cellId, church: churchId });
    if (!cell) return res.status(404).json({ message: "Cell not found" });

    cell.meetingSchedule?.pull({ _id: meetingId });
    await cell.save();

    return res.status(200).json({ message: "Meeting deleted successfully", meetingSchedule: cell.meetingSchedule });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete meeting", error: error.message });
  }
}

const getCellMeetings = async (req, res) => {
  try {
    const cellId = req.params.id;
    const churchId = req.activeChurch?._id || req.user?.church;

    const cell = await cellModel.findOne({ _id: cellId, church: churchId }).select("meetingSchedule");
    if (!cell) return res.status(404).json({ message: "Cell not found" });

    return res.status(200).json({ message: "Meetings retrieved successfully", meetingSchedule: cell.meetingSchedule || [] });
  } catch (error) {
    return res.status(500).json({ message: "Could not retrieve meetings", error: error.message });
  }
}


export {
  createCell,
  getAllCells,
  getSingleCell,
  updateCell,
  deleteCell,
  addMemberToCell,
  searchMembersToAddToCell,
  getCellMembers,
  updateCellMemberRole,
  removeMemberFromCell,
  addCellMeeting,
  updateCellMeeting,
  deleteCellMeeting,
  getCellMeetings
}
