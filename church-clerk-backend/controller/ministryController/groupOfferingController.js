import Offering from "../../models/ministryModel/groupOfferingModel.js";
import Group from "../../models/ministryModel/groupModel.js";    

const createGroupOffering = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date, amount, note } = req.body;

    if(!date || !amount) {
        return res.status(400).json({message: "date and amount are required"})
    }

      // 1. Validate group exists and belongs to this church
    const query = { _id: groupId };
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch._id;
    }

    const group = await Group.findOne(query);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const Offering = await Offering.create({
      group: groupId,
      church: group.church,
      createdBy: req.user._id, 
      date,
      amount,
      note
    });

    res.status(201).json({
      message: "Offering recorded successfully", 
      Offering
    });
  } catch (error) {
    console.log("could not record Offering", error)
    return res.status(500).json({ error: error.message });
  }
};


//get all group Offering
const getAllGroupOfferings = async(req, res) => {
  try {
       const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const { groupId } = req.params;
  const query = { group: groupId };
  
    if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
        query.church = req.activeChurch._id
    }

    const offerings = await Offering.find(query)
      .select("date amount note group createdBy")
          .populate("group", "name")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
    
        // COUNT TOTAL VISITORS
        const totalGroupOfferings = await Offering.countDocuments(query);

       // IF NO RESULTS
    if (!offerings || offerings.length === 0) {
      return res.status(200).json({
        message: "No Offering found.",
        stats: {
          totalGroupOfferings: 0
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
        offerings: [],
      });
    }

    // PAGINATION DETAILS
    const totalPages = Math.ceil(totalGroupOfferings / limitNum);

    const pagination = {
      totalResult: totalGroupOfferings,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    res.status(200).json({
      message: "All group Offerings",
      stats: {
        totalGroupOfferings,
      },
      pagination,
      count: offerings.length,
      offerings
    })


  } catch (error) {
    console.log("could not record Offering", error)
    return res.status(500).json({ error: error.message });
  }
}



//update group Offering

const updateGroupOffering = async(req, res) => {
  try {
    const { groupId, offeringId } = req.params;


    const query = {_id: offeringId, group: groupId}

    if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
        query.church = req.activeChurch._id
    }

const group = await Group.findOne({ _id: groupId });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const offerings = await Offering.findOneAndUpdate( query, req.body, {
        new: true,
        runValidators: true
    })

    if(!offerings) {
        return res.status(404).json({message: "Offering not found"})
    }

    return res.status(200).json({message: "Offering updated successfully", offerings})

  } catch (error) {
    console.log("could not update Offering", error)
    return res.status(500).json({ error: error.message });
  }
}


//delete group Offering

const deleteGroupOffering = async(req, res) => {
    try {
      const {groupId, offeringId} = req.params;

const query = { _id: offeringId, group: groupId };

      if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
          query.church = req.activeChurch._id  
      }

      const group = await Group.findOne({_id: groupId});
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // 2. Delete Offering belonging to that group
    const offerings = await Offering.findOneAndDelete(query);

      if(!offerings) {
          return res.status(404).json({message: "Offering not found"})
      }
      return res.status(200).json({message: "Offering deleted successfully", offerings})

    } catch (error) {
      console.log("could not delete Offering", error)
    return res.status(500).json({ error: error.message });
    }
}


export {createGroupOffering, updateGroupOffering, deleteGroupOffering, getAllGroupOfferings}