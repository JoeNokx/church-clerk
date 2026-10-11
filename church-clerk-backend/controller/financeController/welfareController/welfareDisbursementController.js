import WelfareDisbursements from "../../../models/financeModel/welfareModel/welfareDisbursementModel.js"
import Member from "../../../models/memberModel.js"
import { uploadReceiptImage, destroyReceiptImage, receiptImageDownloadUrl, validateReceiptImage } from "../../../services/receiptService.js";

const createWelfareDisbursement = async (req, res) => {
    
    try {
        const {
        beneficiaryName,
        category,
        amount,
        date,
        description,
        paymentMethod,
        member
        } = req.body;

        const memberId = String(member || "").trim();
        if (memberId) {
          const foundMember = await Member.findOne({ _id: memberId, church: req.activeChurch._id }).select("_id");
          if (!foundMember) {
            return res.status(404).json({ message: "Member not found" });
          }
        }

        let receipt;
        if (req.file) {
          const fileError = validateReceiptImage(req.file);
          if (fileError) {
            return res.status(400).json({ message: fileError });
          }
          receipt = await uploadReceiptImage(req.file, `church-clerk/welfare/${req.activeChurch._id}/disbursements`);
        }

        const welfareDisbursement = await WelfareDisbursements.create({
        beneficiaryName,
        category,
        amount,
        date,
        description,
        paymentMethod,
        ...(memberId ? { member: memberId } : {}),
        ...(receipt ? { receipt } : {}),
        church: req.activeChurch._id,
        createdBy: req.user._id
        });

        return res.status(201).json({
        message: "Welfare disbursement created successfully",
        welfareDisbursement
        });
    } catch (error) {
        return res.status(400).json({ message: "Welfare disbursement could not be created", error: error.message });
    }
}



const getAllWelfareDisbursement = async (req, res) => {
    
    try {
        const { page = 1, limit = 10, category, search = "", dateFrom, dateTo, recordedBy } = req.query;
                                        
                        const pageNum = Math.max(1, parseInt(page, 10) || 1);
                        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
                        const skip = (pageNum - 1) * limitNum;
                    
                        // MAIN QUERY
                        const query = {};
                    
                        // Restrict by church for non-admins
                        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
                            query.church = req.activeChurch._id;
                        }
                    
                        //search by beneficiary name
                        if (search) {
                            query.$or = [{ beneficiaryName: { $regex: search, $options: "i" } }];
                        }

                        // Filter by recordedBy (via createdBy user fullName)
                        if (recordedBy) {
                            const User = (await import("../../../models/userModel.js")).default;
                            const matchingUsers = await User.find({
                                fullName: { $regex: recordedBy, $options: "i" }
                            }).select("_id");
                            const recordedByUserIds = matchingUsers.map(u => u._id);
                            query.createdBy = { $in: recordedByUserIds.length ? recordedByUserIds : [null] };
                        }

                        // Filter by category
                        if (category) {
                            query.category = category;
                        }
                    
                        // Filter by date range
                    if (dateFrom || dateTo) {
                        query.date = {};
                    
                        // Filter from a starting date
                        if (dateFrom) {
                        const startDate = new Date(dateFrom);
                        startDate.setHours(0, 0, 0, 0); // Start of the day
                        query.date.$gte = startDate;
                        }
                    
                        // Filter up to an ending date
                        if (dateTo) {
                        const endDate = new Date(dateTo);
                        endDate.setHours(23, 59, 59, 999); // End of the day
                        query.date.$lte = endDate;
                        }
                    }
                    
                        // FETCH welfare Disbursement 
                        const welfareDisbursement = await WelfareDisbursements.find(query)
                        .select("beneficiaryName member category amount date description paymentMethod receipt createdBy referenceId createdAt")
                        .populate("member", "firstName lastName phoneNumber email")
                        .populate("createdBy", "fullName")
                            .sort({ createdAt: -1 })
                            .skip(skip)
                            .limit(limitNum)
                    
                          
                        // COUNT TOTAL welfare Disbursement
                        const totalwelfareDisbursement = await WelfareDisbursements.countDocuments(query);
                    
                            // PAGINATION DETAILS
                        const totalPages = Math.ceil(totalwelfareDisbursement / limitNum);
                        const pagination = {
                            totalResult: totalwelfareDisbursement,
                            totalPages,
                            currentPage: pageNum,
                            hasPrev: pageNum > 1,
                            hasNext: pageNum < totalPages,
                            prevPage: pageNum > 1 ? pageNum - 1 : null,
                            nextPage: pageNum < totalPages ? pageNum + 1 : null,
                        };
                    
                        // IF NO RESULTS
                        if (!welfareDisbursement || welfareDisbursement.length === 0) {
                            return res.status(200).json({
                            message: "No welfare Disbursement record found.",
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
                            welfareDisbursement: [],
                            });
                        }
                    
                        
                        // SUCCESS RESPONSE
                        console.log("welfare Disbursement fetched successfully")
                        return res.status(200).json({
                            message: "welfare Disbursement fetched successfully",
                            pagination,
                            count: welfareDisbursement.length,
                            welfareDisbursement,
                        });
    } catch (error) {
        return res.status(400).json({ message: "welfare Disbursement could not be fetched", error: error.message });
    }
}
 

const updateWelfareDisbursement = async (req, res) => {
    
    try {
        const {id} = req.params
        const query = {_id: id}

        
        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id
        }

        const { removeReceipt, receipt: _receiptBody, church: _church, createdBy: _createdBy, ...restBody } = req.body || {};
        const updatePayload = { ...restBody };

        const memberUpdate = String(updatePayload.member || "").trim();
        if (updatePayload.member !== undefined && memberUpdate) {
          const foundMember = await Member.findOne({ _id: memberUpdate, church: req.activeChurch._id }).select("_id");
          if (!foundMember) {
            return res.status(404).json({ message: "Member not found" });
          }
          updatePayload.member = memberUpdate;
        } else if (updatePayload.member !== undefined) {
          updatePayload.member = null;
        }

        let newReceipt;
        if (req.file) {
          const fileError = validateReceiptImage(req.file);
          if (fileError) {
            return res.status(400).json({ message: fileError });
          }
          newReceipt = await uploadReceiptImage(req.file, `church-clerk/welfare/${req.activeChurch._id}/disbursements`);
          updatePayload.receipt = newReceipt;
        } else if (String(removeReceipt || "") === "true") {
          updatePayload.receipt = null;
        }

        const previous = await WelfareDisbursements.findOne(query).select("receipt");

        const welfareDisbursement = await WelfareDisbursements.findOneAndUpdate(query, updatePayload, {
            new: true,
            runValidators: true
        })

        if(!welfareDisbursement) {
            if (newReceipt) await destroyReceiptImage(newReceipt);
            return res.status(404).json({message: "Welfare disbursement not found"})
        }

        if ((newReceipt || String(removeReceipt || "") === "true") && previous?.receipt?.publicId) {
            await destroyReceiptImage(previous.receipt);
        }

        return res.status(200).json({message: "Welfare disbursement updated successfully", welfareDisbursement})
    } catch (error) {
        return res.status(400).json({message: "Welfare disbursement could not be updated", error: error.message})
    }
}


const deleteWelfareDisbursement = async (req, res) => {
    
    try {
        const {id} = req.params
        const query = {_id: id}

        if(req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id
        }

        const welfareDisbursement = await WelfareDisbursements.findOneAndDelete(query)

        if(!welfareDisbursement) {
            return res.status(404).json({message: "Welfare disbursement not found"})
        }

        if (welfareDisbursement?.receipt?.publicId) {
            await destroyReceiptImage(welfareDisbursement.receipt);
        }

        return res.status(200).json({message: "Welfare disbursement deleted successfully", welfareDisbursement})

    } catch (error) {
        return res.status(400).json({message: "Welfare disbursement could not be deleted", error: error.message})
    }
}




const downloadWelfareDisbursementReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const query = { _id: id };

        if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
            query.church = req.activeChurch._id;
        }

        const disbursement = await WelfareDisbursements.findOne(query).select("receipt").lean();
        if (!disbursement?.receipt?.publicId) {
            return res.status(404).json({ message: "Receipt not found" });
        }

        return res.redirect(receiptImageDownloadUrl(disbursement.receipt));
    } catch (error) {
        return res.status(400).json({ message: "Receipt could not be downloaded", error: error.message });
    }
};



export {createWelfareDisbursement, getAllWelfareDisbursement, updateWelfareDisbursement, deleteWelfareDisbursement, downloadWelfareDisbursementReceipt }