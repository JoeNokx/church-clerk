import Attendance from "../models/attendanceModel.js"


const createAttendance = async (req, res) => {
    
    try {
        
        const {serviceType, serviceDate, serviceTime, totalNumber, mainSpeaker} = req.body;

        if (!serviceType || !serviceDate || !totalNumber) {
            return res.status(400).json({ message: "service type, service date and total number are required" });
          }

          const attendance = await Attendance.create({
            serviceType,
            serviceDate,
            serviceTime,
            totalNumber,
            mainSpeaker,
            church: req.user.church,
            createdBy: req.user._id
          })

          return res.status(201).json({message: "attendance created successfully", attendance})


    } catch (error) {
        return res.status(400).json({message: "attendance could not be created", error: error.message})
    }
}



//get all attendance

const getAllAttendances = async (req, res) => {
  try {
    const { page = 1, limit = 10, serviceType, dateFrom, dateTo } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // MAIN QUERY
    const query = {};

    // Restrict by church for non-admins
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    // Filter by serviceType
    if (serviceType) {
      query.serviceType = serviceType;
    }

 // Filter by date range
if (dateFrom || dateTo) {
  query.serviceDate = {};

  // Filter from a starting date
  if (dateFrom) {
    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0); // Start of the day
    query.serviceDate.$gte = startDate;
  }

  // Filter up to an ending date
  if (dateTo) {
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999); // End of the day
    query.serviceDate.$lte = endDate;
  }
}

    // FETCH ATTENDANCES
    const attendances = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // COUNT TOTAL ATTENDANCES
    const totalAttendances = await Attendance.countDocuments(query);

     // PAGINATION DETAILS
    const totalPages = Math.ceil(totalAttendances / limitNum);
    const pagination = {
      totalResult: totalAttendances,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    // IF NO RESULTS
    if (!attendances || attendances.length === 0) {
      return res.status(200).json({
        message: "No attendance found.",
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
        attendances: [],
      });
    }

   
    // SUCCESS RESPONSE
    return res.status(200).json({
      pagination,
      count: attendances.length,
      attendances,
    });

  } catch (error) {
    return res.status(400).json({
      message: "Could not fetch attendance",
      error: error.message,
    });
  }
};



//update attendance
const updateAttendance = async (req, res) => {
    
    try {
        const {id} = req.params;
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }

        const attendance = await Attendance.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        })

        if(!attendance) {
            return res.status(404).json({message: "attendance not found"})
        }

        return res.status(200).json({message: "attendance updated successfully", attendance})
    } catch (error) {
        return res.status(400).json({message: "attendance could not be updated", error: error.message})
    }
}


const deleteAttendance = async (req, res) => {
    
    try {
         const {id} = req.params;
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }
        
        const attendance = await Attendance.findOneAndDelete(query)

        if(!attendance) {
            return res.status(404).json({message: "attendance not found"})
        }

        return res.status(200).json({message: "attendance deleted successfully", attendance})
    } catch (error) {
        return res.status(400).json({message: "attendance could not be deleted", error: error.message})
    }
}



//VISITORS

// create visitor
import Visitor from "../models/visitorsModel.js";

const createVisitor = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      email,
      location,
      serviceType,
      serviceDate,
      invitedBy,
      status,
      note
    } = req.body;

    if (!fullName || !phoneNumber ||!serviceType) {
      return res.status(400).json({
        message: "fullName, phoneNumber and serviceType are required",
      });
    }

    const visitor = await Visitor.create({
      fullName,
      phoneNumber,
      email,
      location,
      serviceType,
      serviceDate,
      invitedBy,
      status,
      note,
      church: req.user.church,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Visitor created successfully",
      visitor,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Visitor could not be created",
      error: error.message,
    });
  }
};


//get single visitor

const getSingleVisitor = async (req, res) => {
    
    try {
        const {id} = req.params;
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }

        const visitor = await Visitor.findOne(query)

        if(!visitor) {
            return res.status(404).json({message: "visitor not found"})
        }

        return res.status(200).json({message: "visitor found successfully", visitor})


    } catch (error) {
        return res.status(400).json({message: "visitor could not be found", error: error.message})
    }
}

//get all visitors

import Member from "../models/memberModel.js";

const getAllVisitors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // MAIN QUERY
    const query = { };

    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { invitedBy: { $regex: search, $options: "i" } },
      ];
    }

    // FETCH VISITORS
    const visitors = await Visitor.find(query)
    .select("fullName phoneNumber email location serviceType serviceDate invitedBy status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // COUNT TOTAL VISITORS
    const totalVisitors = await Visitor.countDocuments(query);

    // COUNT THIS MONTH VISITORS
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonthVisitors = await Visitor.countDocuments({
      church: req.user.church,
      createdAt: { $gte: startOfMonth },
    });

    // COUNT CONVERTED VISITORS (member exists with same phoneNumber)
 const convertedVisitors = await Member.countDocuments({
  visitorId: { $ne: null },
  church: req.user.church
});

    // IF NO RESULTS
    if (!visitors || visitors.length === 0) {
      return res.status(200).json({
        message: "No visitor found.",
        stats: {
          totalVisitors,
          thisMonthVisitors,
          convertedVisitors,
        },
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
        visitors: [],
      });
    }

    // PAGINATION DETAILS
    const totalPages = Math.ceil(totalVisitors / limitNum);

    const pagination = {
      totalResult: totalVisitors,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    // SUCCESS RESPONSE
    return res.status(200).json({
      stats: {
        totalVisitors,
        thisMonthVisitors,
        convertedVisitors,
      },
      pagination,
      count: visitors.length,
      visitors,
    });

  } catch (error) {
    return res.status(400).json({
      message: "Could not fetch visitors",
      error: error.message,
    });
  }
};



//update visitor
const updateVisitor = async (req, res) => {
    
    try {
        const {id} = req.params;
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }

        const attendance = await Visitor.findOneAndUpdate(query, req.body, {
            new: true,
            runValidators: true
        })

        if(!attendance) {
            return res.status(404).json({message: "visitor not found"})
        }

        return res.status(200).json({message: "visitor updated successfully", attendance})
    } catch (error) {
        return res.status(400).json({message: "visitor could not be updated", error: error.message})
    }
}


const deleteVisitor = async (req, res) => {
    
    try {
         const {id} = req.params;
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }
        
        const attendance = await Visitor.findOneAndDelete(query)

        if(!attendance) {
            return res.status(404).json({message: "visitor not found"})
        }

        return res.status(200).json({message: "visitor deleted successfully", attendance})
    } catch (error) {
        return res.status(400).json({message: "visitor could not be deleted", error: error.message})
    }
}


export {createAttendance, getAllAttendances, updateAttendance, deleteAttendance,
    createVisitor, getSingleVisitor, getAllVisitors, updateVisitor, deleteVisitor
}


