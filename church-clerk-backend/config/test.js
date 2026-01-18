const larvis ={
  "fullName": "Larvis Blessing",
  "email": "larvis@example.com",
  "phoneNumber": "05460225643",
  "password": "larvis0012345",
  "role": "",
  "churchName": "Grace-Life Church"
}


const giles = {
  "fullName": "Giles Sekyi",
  "email": "giles@example.com",
  "phoneNumber": "05434225643",
  "password": "giless0012345",
  "role": "churchadmin",
  "churchName": "God is our Light Church"
}

const edward = {
  "fullName": "Edwark K. Yalley",
  "email": "edward@example.com",
  "phoneNumber": "05435125643",
  "password": "edward0012345",
  "role": "churchadmin",
  "churchName": "Kingdom Labourers Ministry"
}

const superadmin = {
  "fullName": "Clement Quaye",
  "email": "clement@example.com",
  "phoneNumber": "05435755643",
  "password": "clement0012345",
  "role": "superadmin"
}

const binnah =  {
  "fullName": "Joseph Binnah",
  "email": "joseph@example.com",
  "phoneNumber": "05035125643",
  "password": "joeseph0012345",
  "role": "churchadmin",
  "churchName": "Grace Connect"
}



// {
//     "message": "Event created successfully.",
//     "event": {
//         "church": "6918a14719640edd8f724a32",
//         "title": "Grace Life Musice",
//         "category": "Worship",
//         "description": "program hosted by Life Celebrant.",
//         "dateFrom": "2025-12-24T00:00:00.000Z",
//         "time": "16:00",
//         "venue": "Mighty Auditorium, Apowa",
//         "organizers": "Ann Eshun",
//         "createdBy": "6918a14719640edd8f724a34",
//         "_id": "6919d84166a64e15dea245d8",
//         "attendees": [],
//         "createdAt": "2025-11-16T13:57:21.889Z",
//         "updatedAt": "2025-11-16T13:57:21.889Z",
//         "__v": 0
//     }
// }


import Member from "../../models/memberModel.js";
import Tithe from "../../models/titheModel.js";
import Welfare from "../../models/welfareModel.js";
import SpecialFund from "../../models/specialFundModel.js";
import ChurchProject from "../../models/churchProjectModel.js";

const getSingleMember = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const memberId = req.params.id;
    const query = { _id: memberId };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    // Fetch member info
    const member = await Member.findOne(query)
      .populate("church", "name")
      .populate("cell", "name role status")
      .populate("group", "name role status")
      .populate("department", "name role status");

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    // Fetch all contributions
    const [tithes, welfare, specialFunds, churchProjects] = await Promise.all([
      Tithe.find({ member: memberId }),
      Welfare.find({ member: memberId }),
      SpecialFund.find({ member: memberId }),
      ChurchProject.find({ member: memberId }),
    ]);

    // Totals per type
    const totalTithe = tithes.reduce((sum, t) => sum + t.amount, 0);
    const totalWelfare = welfare.reduce((sum, w) => sum + w.amount, 0);
    const totalSpecialFund = specialFunds.reduce((sum, s) => sum + s.amount, 0);
    const totalChurchProject = churchProjects.reduce((sum, c) => sum + c.amount, 0);

    const totalContributions = totalTithe + totalWelfare + totalSpecialFund + totalChurchProject;

    // Merge contributions into unified structure
    let contributions = [];

    tithes.forEach(t => contributions.push({
      type: "Tithe",
      amount: t.amount,
      date: t.date,
      paymentMethod: t.paymentMethod
    }));

    welfare.forEach(w => contributions.push({
      type: "Welfare",
      amount: w.amount,
      date: w.date,
      paymentMethod: w.paymentMethod
    }));

    specialFunds.forEach(s => contributions.push({
      type: "Special Fund",
      amount: s.amount,
      date: s.date,
      paymentMethod: s.paymentMethod
    }));

    churchProjects.forEach(c => contributions.push({
      type: "Church Project",
      amount: c.amount,
      date: c.date,
      paymentMethod: c.paymentMethod
    }));

    // Sort contributions by date descending
    contributions.sort((a, b) => b.date - a.date);

    // Paginate the merged contributions
    const totalItems = contributions.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const paginatedContributions = contributions.slice(skip, skip + limitNum);

    const pagination = {
      totalItems,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      limit: limitNum
    };

    return res.status(200).json({
      message: "Member retrieved successfully",
      member,
      memberStatus: member.status,
      totals: {
        totalTithe,
        totalWelfare,
        totalSpecialFund,
        totalChurchProject,
        totalContributions
      },
      contributions: paginatedContributions,
      pagination
    });

  } catch (error) {
    console.log("Member could not be fetched:", error);
    return res.status(400).json({
      message: "Member could not be retrieved",
      error: error.message,
    });
  }
};


/**
 * Removes sensitive fields from req.body before updating a document
 * @param {Object} body - The request body
 * @param {Array} fields - Array of field names to remove
 * @returns {Object} sanitized object
 */
export const sanitizeUpdate = (body, fields = []) => {
  const updateData = { ...body };
  fields.forEach(field => delete updateData[field]);
  return updateData;
};

import { sanitizeUpdate } from "../utils/sanitizeUpdate.js";

const updateGroupAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const query = { _id: id };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    // Sanitize req.body
    const updateData = sanitizeUpdate(req.body, ['group', 'church', 'createdBy']);

    const attendance = await Attendance.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true
    });

    if (!attendance) {
      return res.status(404).json({ message: "attendance not found" });
    }

    return res.status(200).json({
      message: "attendance updated successfully",
      attendance,
    });
  } catch (error) {
    console.log("could not record attendance", error);
    return res.status(500).json({ error: error.message });
  }
};


export {larvis, giles, edward, getSingleMember};
