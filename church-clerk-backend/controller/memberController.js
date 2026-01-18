import Member from "../models/memberModel.js"
import Church from "../models/churchModel.js"
import Visitor from "../models/visitorsModel.js"

import GroupMember from "../models/ministryModel/groupMembersModel.js"
import { checkAndHandleMemberLimit } from "../utils/memberLimitUtils.js";


const createMember = async (req, res) => {
    
    try {

        const {firstName, lastName, email, visitorId, phoneNumber, gender, occupation, nationality, status, note, dateOfBirth, churchRole, dateJoined, streetAddress, city, region, country, maritalStatus, department, group: groupIds, cell
 } = req.body;

            if(!firstName || !lastName || !phoneNumber) {
                return res.status(400).json({message: "first name, last name and phone number are required"})
            }

          // Get logged-in user's church and userId
    const churchId = req.user.church;
    const createdBy = req.user._id;


    if (!churchId) {
      return res.status(400).json({ message: "User has no church assigned." });
    }

    // Fetch church document
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    
      const prefix = church.name
  .trim()
  .split(/\s+/)             // split by spaces
  .map(word => word.replace(/[^a-zA-Z]/g, "")[0].toUpperCase()) // remove non-letters, take first letter
  .join("");

    // 6. Increment memberCount atomically
    const updatedChurch = await Church.findByIdAndUpdate(
      churchId,
      { $inc: { memberCount: 1 } }, // increment memberCount
      { new: true } // return updated doc
    );

    // 7. Generate memberId: PREFIX + padded number
    const paddedNumber = String(updatedChurch.memberCount).padStart(6, "0");
    const memberId = `${prefix}-${paddedNumber}`; // e.g., "GBC-000001"

            const member = await Member.create({
                // Personal information
                memberId,     //auto-generated
                firstName,
                lastName,
                email,
                phoneNumber,
                gender,
                occupation,
                nationality,
                status,
                note,
                dateOfBirth,
                churchRole,
                dateJoined,
                visitorId: visitorId || null,   // store visitorId if sent
                // Address
                streetAddress,
                city,
                region,
                country,
                maritalStatus,

                // ministry
                department,
                cell,
                 group: groupIds || [], 
                
                      // Tenant ownership
                createdBy,
                church: churchId
            })

             // If this member was created from a visitor → update visitor status
    if (visitorId) {
      await Visitor.findByIdAndUpdate(visitorId, {
        status: "converted",
      });
    }
              // If any group IDs are provided, add member to those groups
   if (groupIds && groupIds.length > 0) {
  await Promise.all(groupIds.map(groupId => 
    GroupMember.create({
      group: groupId,
      member: member._id,
      role: "Member",
      church: member.church,
      createdBy: req.user._id
    })
  ));
}


// after member is created
await checkAndHandleMemberLimit({
  churchId: req.activeChurch._id,
  totalMembers: await Member.countDocuments({
    church: req.activeChurch._id
  })
});


        return res.status(201).json({message: "member created successfully", member})
    } catch (error) {
        return res.status(400).json({message: "member could not be created", error: error.message})
    }
}



const getAllMembers = async (req, res) => {
    
    try {

         const {
      page = 1,
      limit = 10,
      search = "",
      department,
      group,
      cell,
      status, // active | inactive
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

        const baseQuery = {}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            baseQuery.church = req.user.church
        }

        // Query for filtered member list
    const query = { ...baseQuery };

        if (search) {
      const regex = { $regex: search, $options: "i" };
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { phoneNumber: regex },
        { email: regex },
        { city: regex },
        { memberId: regex }
      ];
    }

    // Exact filters
// if (department) query.department = department;
// if (group) query.group = group;
// if (cell) query.cell = cell;

// Status filter: active, inactive, or all
if (status && status !== "all") {
  query.status = status; // "active" or "inactive"
}

// Department filter: dynamic predefined or user-added
if (department && department !== "all departments") {
  query.department = { $in: [department] };
}

if (group && group !== "all groups") {
  query.group = { $in: [group] };
}

if (cell && cell !== "all cells") {
  query.cell = { $in: [cell] };
}


        const members = await Member.find(query)
        .sort({ createdAt: -1 })
        .select("firstName lastName phoneNumber email dateJoined churchRole city status")
        .skip(skip)
        .limit(limitNum);

      
const totalMembers = await Member.countDocuments(baseQuery);


    // Pagination info
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

     
        if (!members || members.length === 0) {
      return res.status(200).json({
        message: "No members found.",
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
            members: []
          
  });
    }

//SUCCESS RESPONSE
        console.log("members fetched successfully")
        return res.status(200).json({
            message: "members retrieved successfully", 
            pagination,
            count: members.length,
            members

        })
        
    } catch (error) {
        console.log("members could not be fetched", error)
        res.status(400).json({message: "member could not be fetched", error: error.message})

    }
}


const getSingleMember = async (req, res) => {
    
    try {
        
        const memberId = req.params.id;
        const query = {_id: memberId}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }

        const member = await Member.findOne(query)
        .populate("church", "name")
        .populate("cell", "name role status")
        .populate("group", "name role status")
        .populate("department", "name role status")
       
        
        const memberStatus = member.status;

        if(!member) {
            return res.status(404).json({message: "member not found"})
        }

      
    return res.status(200).json({
      message: "Member retrieved successfully",
      member,
      memberStatus: memberStatus
     
    });
    } catch (error) {
                console.log("member could not be fetched", error)
        return res.status(400).json({message: "member could not be created", error: error.message})
   
    }
}


//UPDATE MEMBER
const updateMember = async (req, res) => {
    
    try {
        const memberId = req.params.id;
        const query = {_id: memberId}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }

        const member = await Member.findOneAndUpdate(query, req.body, {new: true, runValidators: true})

         if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
        return res.status(200).json({
            message: "member updated successfully", 
            member
        })

        
    } catch (error) {
        console.log("member could not be updated", error)
        return res.status(400).json({message: "member could not be updated", error: error.message})
   
    }
}


const deleteMember = async (req, res) => {
    
    try {
         const memberId = req.params.id;
        const query = {_id: memberId}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.user.church
        }

        const member = await Member.findOneAndDelete(query);

         if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
        return res.status(200).json({
            message: "member deleted successfully", 
            member
        })
    } catch (error) {
         console.log("member could not be deleted", error)
        return res.status(400).json({message: "member could not be deleted", error: error.message})
   
    }
}


//get members KPI


const getAllMembersKPI = async (req, res) => {
  try {

    // MAIN QUERY
    const query = {};

    // Restrict by church for non-admins
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.user.church;
    }

    // Start of current month
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

    // ---- MEMBER KPIs ----
    const [
      totalMembers,
      currentMembers,
      inactiveMembers,
      newMembersThisMonth
    ] = await Promise.all([
      Member.countDocuments(query),
      Member.countDocuments({ ...query, status: "active" }),
      Member.countDocuments({ ...query, status: "inactive" }),
      Member.countDocuments({
        ...query,
        dateJoined: { $gte: startOfMonth }
      })
    ]);

    return res.status(200).json({
      message: "Member KPI fetched successfully",
      memberKPI: {
        totalMembers,
        currentMembers,
        inactiveMembers,
        newMembersThisMonth
      }
    });

  } catch (error) {
    return res.status(400).json({
      message: "Member KPI could not be fetched",
      error: error.message
    });
  }
};



export {createMember, getAllMembers, getSingleMember, updateMember, deleteMember, getAllMembersKPI}