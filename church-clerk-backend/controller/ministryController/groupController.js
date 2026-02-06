import Group from "../../models/ministryModel/groupModel.js"

//create group
const createGroup = async (req, res) => {
    
    try {
        const {name,
            description,
            meetingSchedule, // array of { meetingDay, meetingTime and meetingVenue}
          } = req.body;

        if(!name) {
            return res.status(400).json({message: "group name is required"})    
        }

        const existingGroup = await Group.findOne({name, church: req.activeChurch._id});
        if(existingGroup) {
            return res.status(400).json({message: "group name already exist"})
        }

        if(!meetingSchedule || meetingSchedule.length === 0) {
            return res.status(400).json({message: "group meeting schedule is required"})
        }

         // Validate that every item has both day and time
    const invalidMeeting = meetingSchedule.find(
      (m) => !m.meetingDay || !m.meetingTime || !m.meetingVenue
    );
    if (invalidMeeting)
      return res.status(400).json({ message: "Each meeting must have a day and a time" });

        
        const group = await Group.create({
            name,
            description,
            meetingSchedule,
            church: req.activeChurch._id,
            createdBy: req.user._id
        })

        return res.status(201).json({message: "group created successfully", group})
        
    } catch (error) {
        return res.status(400).json({message: "group could not be created", error: error.message})
    }
}



const getAllGroups = async (req, res) => {
    
    try {
        const query = { church: req.activeChurch._id }

        const groups = await Group.find(query)
        .sort({createdAt: -1})
        .select("name description meetingSchedule")

        if (groups.length === 0) {
  return res.status(404).json({ message: "groups not found" });
}

 // Count members for all groups
    const groupsWithCounts = await Promise.all(
  groups.map(async group => {
    const memberCount = await GroupMember.countDocuments({ group: group._id, church: req.activeChurch._id });
    return { ...group.toObject(), totalMembers: memberCount };
  })
);


        return res.status(200).json({
          message: "groups found",
          count: groupsWithCounts.reduce((sum, g) => sum + g.totalMembers, 0),
      groups: groupsWithCounts
        })
    } catch (error) {
        return res.status(400).json({message: "groups could not be found", error: error.message})
    }
}

const getSingleGroup = async (req, res) => {
    
    try {
        const groupId = req.params.id

            if (!groupId) return res.status(400).json({ message: "Group ID is required" });

        const query = {_id: groupId, church: req.activeChurch._id}

        const group = await Group.findOne(query)
        .select("name description meetingSchedule members");

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
          }

          return res.status(200).json({ message: "Group found successfully", group });
    } catch (error) {
        return res.status(400).json({message: "group could not be found", error: error.message})
    }
}

//ADD MEMBERS TO GROUP

import Member from "../../models/memberModel.js"
import GroupMember from "../../models/ministryModel/groupMembersModel.js";

const searchMembersToAddToGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const search = String(req.query.search || req.query.q || "").trim();

    const churchId = req.activeChurch?._id || req.user?.church;
    if (!churchId) {
      return res.status(400).json({ message: "Church is missing" });
    }

    if (!search) {
      return res.status(400).json({ message: "Please provide a search term." });
    }

    const group = await Group.findOne({ _id: groupId, church: churchId }).lean();
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const existingMemberIds = await GroupMember.find({ group: groupId, church: churchId }).distinct("member");

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

const addMemberToGroup = async (req, res) => {
    
    try {
        const groupId = req.params.id
    const searchMember = (req.body.searchMember || "").trim()
      const memberId = (req.body.memberId || "").trim();
      const memberIds = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
      const role = req.body.role || "member";

      const churchId = req.activeChurch?._id || req.user?.church;
      if (!churchId) {
        return res.status(400).json({ message: "Church is missing" });
      }

          if (memberIds.length > 0) {
            const query = { _id: groupId, church: churchId };

            const group = await Group.findOne(query);
            if (!group) {
              return res.status(404).json({ message: "Group not found" });
            }

            const members = await Member.find({ _id: { $in: memberIds }, church: churchId }).select("_id").lean();
            if (!members || members.length === 0) {
              return res.status(404).json({ message: "Members not found" });
            }

            const existing = await GroupMember.find({
              group: groupId,
              church: churchId,
              member: { $in: members.map((m) => m._id) }
            }).distinct("member");

            const existingSet = new Set(existing.map((id) => String(id)));
            const toCreate = members.filter((m) => !existingSet.has(String(m._id)));

            if (toCreate.length === 0) {
              return res.status(400).json({ message: "Members already in this group" });
            }

            const docs = toCreate.map((m) => ({
              group: groupId,
              member: m._id,
              role,
              church: churchId,
              createdBy: req.user._id
            }));

            const created = await GroupMember.insertMany(docs);

            return res.status(200).json({
              message: "Members added to group successfully",
              count: created.length,
              members: created
            });
          }

          if (!memberId && !searchMember) {
      return res.status(400).json({ message: "Please provide memberId, memberIds or a name/email/phone to search." });
    }

        const query = {_id: groupId, church: churchId}
        
        const group = await Group.findOne(query)
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
          }

          //search member by name, email or phone
          const member = memberId
            ? await Member.findOne({ _id: memberId, church: churchId })
            : await Member.findOne({
                church: churchId,
                $or: [
                  { firstName: { $regex: searchMember, $options: "i" } },
                  { lastName: { $regex: searchMember, $options: "i" } },
                  { email: { $regex: searchMember, $options: "i" } },
                  { phoneNumber: { $regex: searchMember, $options: "i" } },
                ],
              })

          if (!member) {
            return res.status(404).json({ message: "Member not found" });
          }

          //check if member is already in group
           const memberExists = await GroupMember.findOne({
      group: groupId, church: churchId,
      member: member._id
    });

    if (memberExists) {
      return res.status(400).json({ message: "Member already in this group" });
    }

    const memberCreated =  await GroupMember.create({ 
      group: groupId,
      member: member._id,
      role,
    church: churchId,
    createdBy: req.user._id
    });

          return res.status(200).json({ message: "Member added to group successfully", memberCreated });
        
    } catch (error) {
        return res.status(400).json({message: "member could not be added to group", error: error.message})
    }
}

//get all members in a group with pagination and search
// GET ALL GROUP MEMBERS
const getGroupMembers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const groupId = req.params.id;

        // 1️⃣ Total members (all, ignore search)
    const totalMembers = await GroupMember.countDocuments({ group: groupId, church: req.activeChurch._id });

    // 2️⃣ Build search filter for populated members
    let memberMatch = {};
    if (search) {
      const regex = new RegExp(search, "i");
      memberMatch = {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phoneNumber: regex },
          { email: regex },
        ]
      };
    }
    

   
    // 3️⃣ Fetch paginated members with search
    const groupMembers = await GroupMember.find({ group: groupId, church: req.activeChurch._id })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: "member",
        match: memberMatch, // search applied here
        select: "firstName lastName phoneNumber email joinedAt",
      })
      .populate("group", "name");

    // 4️⃣ Filter out null members caused by search
    const filteredMembers = groupMembers.filter(gm => gm.member !== null);

    
    // PAGINATION DETAILS
    const totalPages = Math.ceil(filteredMembers.length / limitNum);
    const pagination = {
      totalResult: totalMembers, // total always = all members
      totalPages: Math.ceil(totalMembers / limitNum),
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < Math.ceil(totalMembers / limitNum),
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < Math.ceil(totalMembers / limitNum) ? pageNum + 1 : null,
    };

  
    // IF NO RESULTS
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
          nextPage: null,
        },
        count: 0,
        members: [],
      });
    }

    // SUCCESS RESPONSE
    return res.status(200).json({
      message: "Group members fetched successfully.",
      pagination,
      count: totalMembers,
      members: filteredMembers,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};




//update member role in a group
const updateMemberRole = async (req, res) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ message: "Role is required" });
    }

    const query = { group: groupId, member: memberId, church: req.activeChurch._id };

    const groupMember = await GroupMember.findOne(query);
    if (!groupMember) return res.status(404).json({ message: "group not found" });

    // Update role directly in GroupMember
    const updatedMember = await GroupMember.findOneAndUpdate(
      query,
      { role },
      { new: true }
    )
      .populate("member", "firstName lastName phoneNumber email joinedAt status")
      .populate("group", "name");

    if (!updatedMember) {
      return res.status(404).json({ message: "Member not in this group" });
    }

    return res.status(200).json({
      message: "Member role updated successfully",
      groupMember: updatedMember,
    })

  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to update member role", error: error.message });
  }
};

 
//remove member from group

const removeMemberFromGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const memberId = req.params.memberId;

    const query = { group: groupId, member: memberId, church: req.activeChurch._id };

    const groupMember = await GroupMember.findOneAndDelete(query);
    if (!groupMember) return res.status(404).json({ message: "group member not found" });

   
    return res
      .status(200)
      .json({ message: "Member removed from group successfully", groupMember });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Failed to remove member", error: error.message });
  }
};



//update group
const updateGroup = async (req, res) => {
    
    try {
        
        const groupId = req.params.id
        const query = {_id: groupId, church: req.activeChurch._id}

        const group = await Group.findOneAndUpdate(query, req.body, {new: true, runValidators: true});

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
          }

          return res.status(200).json({ message: "Group updated successfully", group });

    } catch (error) {
        return res.status(400).json({message: "group could not be updated", error: error.message})
    }
}


const deleteGroup = async (req, res) => {
    
    try {
        const groupId = req.params.id
        const query = {_id: groupId, church: req.activeChurch._id}

        const group = await Group.findOneAndDelete(query);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
          }

          return res.status(200).json({ message: "Group deleted successfully" });
    } catch (error) {
        return res.status(400).json({message: "group could not be deleted", error: error.message})
    }
}


//EVVERYTHING ABOUT MEETING SCHEDULE

// Add a new meeting to a group
const addMeeting = async (req, res) => {
  try {
    const groupId = req.params.id;
    const { meetingDay, meetingTime, meetingVenue } = req.body;

    if (!meetingDay || !meetingTime || !meetingVenue) {
      return res
        .status(400)
        .json({ message: "meetingDay, meetingTime, and meetingVenue are required" });
    }

    const query = { _id: groupId, church: req.activeChurch._id };

    const group = await Group.findOne(query);
    if (!group) return res.status(404).json({ message: "Group not found" });

    group.meetingSchedule.push({ meetingDay, meetingTime, meetingVenue });
    await group.save();

    return res
      .status(201)
      .json({ message: "Meeting added successfully", meetingSchedule: group.meetingSchedule });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not add meeting", error: error.message });
  }
};

// Update a meeting in a group
const updateMeeting = async (req, res) => {
  try {
    const groupId = req.params.id;
    const meetingId = req.params.meetingId;
    const { meetingDay, meetingTime, meetingVenue } = req.body;

    const query = { _id: groupId, church: req.activeChurch._id };

    const group = await Group.findOne(query);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const meeting = group.meetingSchedule.id(meetingId);
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meetingDay) meeting.meetingDay = meetingDay;
    if (meetingTime) meeting.meetingTime = meetingTime;
    if (meetingVenue) meeting.meetingVenue = meetingVenue;

    await group.save();

    return res
      .status(200)
      .json({ message: "Meeting updated successfully", meetingSchedule: group.meetingSchedule });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not update meeting", error: error.message });
  }
};

// Delete a meeting from a group
// Delete a meeting
const deleteMeeting = async (req, res) => {
  try {
    const groupId = req.params.id;
    const meetingId = req.params.meetingId;

    const query = { _id: groupId, church: req.activeChurch._id };

    const group = await Group.findOne(query);
    if (!group) return res.status(404).json({ message: "Group not found" });

    // Remove meeting by ID using pull
    group.meetingSchedule.pull({ _id: meetingId });

    await group.save();

    return res
      .status(200)
      .json({ message: "Meeting deleted successfully", meetingSchedule: group.meetingSchedule });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not delete meeting", error: error.message });
  }
};

// Get all meetings for a group
const getMeetings = async (req, res) => {
  try {
    const groupId = req.params.id;

    const query = { _id: groupId, church: req.activeChurch._id };

    const group = await Group.findOne(query).select("meetingSchedule");
    if (!group) return res.status(404).json({ message: "Group not found" });

    return res.status(200).json({
      message: "Meetings retrieved successfully",
      meetingSchedule: group.meetingSchedule,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Could not retrieve meetings", error: error.message });
  }
};


// SUMMARY DASHBOARD
import Cell from "../../models/ministryModel/cellModel.js";
import Department from "../../models/ministryModel/departmentModel.js";

const getMinistryKPI = async (req, res) => {
  try {
    const ministryQuery = { church: req.activeChurch._id };

    // Run all counts in parallel
    const [totalGroups, totalCells, totalDepartments] = await Promise.all([
      Group.countDocuments(ministryQuery),
      Cell.countDocuments(ministryQuery),
      Department.countDocuments(ministryQuery),
    ]);

    const totalMinistry = totalGroups + totalCells + totalDepartments;

    return res.status(200).json({
      message: "Ministry KPI fetched successfully",
      summary: {
        totalGroups,
        totalCells,
        totalDepartments,
        totalMinistry,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not fetch MinistryKPI",
      error: error.message,
    });
  }
};






export {createGroup, getAllGroups, getSingleGroup, updateGroup, deleteGroup, searchMembersToAddToGroup, addMemberToGroup, updateMemberRole, removeMemberFromGroup, getGroupMembers, addMeeting, updateMeeting, deleteMeeting, getMeetings, getMinistryKPI }
