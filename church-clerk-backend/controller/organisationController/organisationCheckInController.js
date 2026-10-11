import CellIndividualAttendance from "../../models/organisationModel/cellIndividualAttendanceModel.js";
import DepartmentIndividualAttendance from "../../models/organisationModel/departmentIndividualAttendanceModel.js";
import MinistryIndividualAttendance from "../../models/organisationModel/ministryIndividualAttendanceModel.js";
import GroupIndividualAttendance from "../../models/organisationModel/groupIndividualAttendanceModel.js";
import CellMember from "../../models/organisationModel/cellMembersModel.js";
import DepartmentMember from "../../models/organisationModel/departmentMembersModel.js";
import MinistryMember from "../../models/organisationModel/ministryMembersModel.js";
import GroupMember from "../../models/organisationModel/groupMembersModel.js";
import Member from "../../models/memberModel.js";

const ATTENDANCE_STATUSES = ["active", "dormant", "temporarily_away"];

const LOOKUPS = [
  { model: CellIndividualAttendance, memberModel: CellMember, entityField: "cell", entityType: "cell" },
  { model: DepartmentIndividualAttendance, memberModel: DepartmentMember, entityField: "department", entityType: "department" },
  { model: MinistryIndividualAttendance, memberModel: MinistryMember, entityField: "ministry", entityType: "ministry" },
  { model: GroupIndividualAttendance, memberModel: GroupMember, entityField: "group", entityType: "group" }
];

const findByToken = async (token) => {
  for (const lookup of LOOKUPS) {
    const doc = await lookup.model
      .findOne({ selfCheckInToken: token, selfCheckInActive: true })
      .populate("church", "name pastor city country")
      .populate(lookup.entityField, "name")
      .lean();
    if (doc) return { attendance: doc, ...lookup };
  }
  return null;
};

const getOrgAttendanceByCheckInToken = async (req, res) => {
  try {
    const { token } = req.params;
    const found = await findByToken(token);
    if (!found) {
      return res.status(404).json({ message: "Check-in link is invalid or has been revoked." });
    }
    const { attendance, entityField, entityType } = found;
    return res.status(200).json({
      attendance: {
        date: attendance.date,
        serviceType: attendance.serviceType,
        church: attendance.church,
        entityName: attendance[entityField]?.name || "",
        entityType
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const orgMemberCheckIn = async (req, res) => {
  try {
    const { token } = req.params;
    const { phoneNumber } = req.body;
    if (!phoneNumber || !String(phoneNumber).trim()) {
      return res.status(400).json({ message: "Phone number is required." });
    }

    const found = await findByToken(token);
    if (!found) {
      return res.status(404).json({ message: "Check-in link is invalid or has been revoked." });
    }
    const { attendance, model, memberModel, entityField, entityType } = found;
    const churchId = attendance.church?._id || attendance.church;
    const entityId = attendance[entityField]?._id || attendance[entityField];

    const member = await Member.findOne({
      church: churchId,
      phoneNumber: String(phoneNumber).trim(),
      status: { $in: ATTENDANCE_STATUSES }
    }).lean();
    if (!member) {
      return res.status(404).json({ message: "No member found with this phone number." });
    }

    const belongs = await memberModel.exists({ church: churchId, member: member._id, [entityField]: entityId });
    if (!belongs) {
      const entityName = attendance[entityField]?.name || `this ${entityType}`;
      return res.status(404).json({ message: `You are not a member of ${entityName}.` });
    }

    const alreadyPresent = (Array.isArray(attendance.presentMembers) ? attendance.presentMembers : [])
      .some((pid) => String(pid) === String(member._id));
    if (alreadyPresent) {
      return res.status(200).json({
        message: `You are already marked as present, ${member.firstName}!`,
        alreadyCheckedIn: true,
        memberName: `${member.firstName} ${member.lastName}`
      });
    }

    await model.findByIdAndUpdate(attendance._id, {
      $addToSet: { presentMembers: member._id },
      $pull: { absentMembers: member._id }
    });

    return res.status(200).json({
      message: `Welcome, ${member.firstName}! You have been marked as present.`,
      memberName: `${member.firstName} ${member.lastName}`
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export { getOrgAttendanceByCheckInToken, orgMemberCheckIn };
