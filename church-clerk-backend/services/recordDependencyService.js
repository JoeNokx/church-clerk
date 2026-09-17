// services/recordDependencyService.js
//
// Shared "is this record deletable?" checks for non-finance modules.
// Finance records have no DELETE route at all; for everything else, a record
// keeps its delete only while nothing else references it and it carries no
// relationships/history of its own.
//
//   annotateDeletable(entityType, docs) -> batched per-row {canDelete, deleteBlockReasons}
//   getDeletionBlockers(entityType, doc) -> array of reason strings (empty = deletable)
//   deletionGuard(entityType, idParam)  -> route middleware, 409 when linked
//
import Member from "../models/memberModel.js";
import Visitor from "../models/visitorsModel.js";
import Event from "../models/eventModel.js";
import EventAttendees from "../models/eventModel/eventAttendeesModel.js";
import TotalEventAttendance from "../models/eventModel/totalEventAttendance.js";
import EventAttendanceFile from "../models/eventModel/eventAttendanceFileModel.js";
import EventOffering from "../models/eventModel/eventOfferingModel.js";
import TitheIndividual from "../models/financeModel/tithesModel/titheIndividualModel.js";
import WelfareContribution from "../models/financeModel/welfareModel/welfareContributionModel.js";
import ServiceIndividualAttendance from "../models/serviceIndividualAttendanceModel.js";
import Ministry from "../models/organisationModel/ministryModel.js";
import MinistryMembers from "../models/organisationModel/ministryMembersModel.js";
import MinistryAttendance from "../models/organisationModel/ministryAttendanceModel.js";
import MinistryIndividualAttendance from "../models/organisationModel/ministryIndividualAttendanceModel.js";
import MinistryOffering from "../models/organisationModel/ministryOfferingModel.js";
import Cell from "../models/organisationModel/cellModel.js";
import CellMembers from "../models/organisationModel/cellMembersModel.js";
import CellAttendance from "../models/organisationModel/cellAttendanceModel.js";
import CellIndividualAttendance from "../models/organisationModel/cellIndividualAttendanceModel.js";
import CellOffering from "../models/organisationModel/cellOfferingModel.js";
import Department from "../models/organisationModel/departmentModel.js";
import DepartmentMembers from "../models/organisationModel/departmentMembersModel.js";
import DepartmentAttendance from "../models/organisationModel/departmentAttendanceModel.js";
import DepartmentIndividualAttendance from "../models/organisationModel/departmentIndividualAttendanceModel.js";
import DepartmentOffering from "../models/organisationModel/departmentOfferingModel.js";
import Group from "../models/organisationModel/groupModel.js";
import GroupMembers from "../models/organisationModel/groupMembersModel.js";
import GroupAttendance from "../models/organisationModel/groupAttendanceModel.js";
import GroupIndividualAttendance from "../models/organisationModel/groupIndividualAttendanceModel.js";
import GroupOffering from "../models/organisationModel/groupOfferingModel.js";
import OutreachEvent from "../models/outreachModel/outreachEventModel.js";
import OutreachProspect from "../models/outreachModel/outreachProspectModel.js";
import OutreachFollowUp from "../models/outreachModel/outreachFollowUpModel.js";
import OutreachTeam from "../models/outreachModel/outreachTeamModel.js";
import AnnouncementMessage from "../models/announcementMessageModel.js";
import AnnouncementMessageDelivery from "../models/announcementMessageDeliveryModel.js";

const nonEmpty = (v) => (Array.isArray(v) ? v.length > 0 : v != null);
const nonEmptyFields = (doc, fields) => fields.filter((f) => nonEmpty(doc[f]));

// org entity factory — ministries/cells/departments/groups share shape
const orgLinks = (field, Members, Attendance, IndividualAttendance, Offering, memberField, eventField) => {
  const links = [
    { model: Members, field, label: "members" },
    { model: Attendance, field, label: "attendance records" },
    { model: IndividualAttendance, field, label: "individual attendance records" },
    { model: Offering, field, label: "offerings" },
    { model: Member, field: memberField, label: "member organisation lists" },
  ];
  if (eventField) links.push({ model: Event, field: eventField, label: "events" });
  return links;
};

const ENTITY = {
  member: {
    model: Member,
    label: "member",
    self: (doc) => {
      const reasons = [];
      if (doc.visitorId) reasons.push("converted from a visitor record");
      const orgs = nonEmptyFields(doc, ["department", "group", "cell", "ministry"]);
      if (orgs.length) reasons.push(`organisation memberships: ${orgs.join(", ")}`);
      return reasons;
    },
    links: [
      { model: TitheIndividual, field: "member", label: "tithe records" },
      { model: WelfareContribution, field: "member", label: "welfare contributions" },
      { model: MinistryMembers, field: "member", label: "ministry membership" },
      { model: CellMembers, field: "member", label: "cell membership" },
      { model: DepartmentMembers, field: "member", label: "department membership" },
      { model: GroupMembers, field: "member", label: "group membership" },
      { model: ServiceIndividualAttendance, field: "presentMembers", label: "service attendance" },
      { model: ServiceIndividualAttendance, field: "absentMembers", label: "service attendance" },
      { model: MinistryIndividualAttendance, field: "presentMembers", label: "ministry attendance" },
      { model: CellIndividualAttendance, field: "presentMembers", label: "cell attendance" },
      { model: DepartmentIndividualAttendance, field: "presentMembers", label: "department attendance" },
      { model: GroupIndividualAttendance, field: "presentMembers", label: "group attendance" },
      { model: OutreachEvent, field: "member", label: "outreach events" },
      { model: OutreachEvent, field: "coordinator", label: "outreach events" },
      { model: OutreachEvent, field: "teamLeader", label: "outreach events" },
      { model: OutreachEvent, field: "teamMembers", label: "outreach events" },
      { model: OutreachProspect, field: "member", label: "outreach prospects" },
      { model: OutreachProspect, field: "linkedMember", label: "outreach prospects (converted)" },
      { model: OutreachProspect, field: "recordedBy", label: "outreach prospects" },
      { model: OutreachFollowUp, field: "assignedTo", label: "follow-up assignments" },
      { model: OutreachFollowUp, field: "conductedBy", label: "follow-ups" },
      { model: OutreachTeam, field: "members.member", label: "outreach teams" },
      { model: AnnouncementMessageDelivery, field: "member", label: "announcement deliveries" },
    ],
  },

  visitor: {
    model: Visitor,
    label: "visitor",
    self: (doc) => (doc.status === "converted" ? ["converted to a member"] : []),
    links: [
      { model: Member, field: "visitorId", label: "member record (converted)" },
      { model: OutreachProspect, field: "linkedVisitor", label: "outreach prospects" },
    ],
  },

  event: {
    model: Event,
    label: "event",
    self: () => [],
    links: [
      { model: EventAttendees, field: "event", label: "attendees" },
      { model: TotalEventAttendance, field: "event", label: "attendance records" },
      { model: EventAttendanceFile, field: "event", label: "attendance files" },
      { model: EventOffering, field: "event", label: "offerings" },
    ],
  },

  ministry: {
    model: Ministry,
    label: "ministry",
    self: (doc) => (nonEmpty(doc.members) ? ["member list"] : []),
    links: orgLinks("ministry", MinistryMembers, MinistryAttendance, MinistryIndividualAttendance, MinistryOffering, "ministry", null),
  },
  cell: {
    model: Cell,
    label: "cell",
    self: (doc) => (nonEmpty(doc.members) ? ["member list"] : []),
    links: orgLinks("cell", CellMembers, CellAttendance, CellIndividualAttendance, CellOffering, "cell", "cell"),
  },
  department: {
    model: Department,
    label: "department",
    self: (doc) => (nonEmpty(doc.members) ? ["member list"] : []),
    links: orgLinks("department", DepartmentMembers, DepartmentAttendance, DepartmentIndividualAttendance, DepartmentOffering, "department", "department"),
  },
  group: {
    model: Group,
    label: "group",
    self: (doc) => (nonEmpty(doc.members) ? ["member list"] : []),
    links: orgLinks("group", GroupMembers, GroupAttendance, GroupIndividualAttendance, GroupOffering, "group", "group"),
  },

  announcementMessage: {
    model: AnnouncementMessage,
    label: "announcement message",
    self: () => [],
    links: [
      { model: AnnouncementMessageDelivery, field: "message", label: "delivery records" },
    ],
  },

  outreachEvent: {
    model: OutreachEvent,
    label: "outreach event",
    self: (doc) => {
      const r = nonEmptyFields(doc, ["member", "coordinator", "teamLeader", "teamMembers", "teams"]);
      return r.length ? [`assigned team (${r.join(", ")})`] : [];
    },
    links: [
      { model: OutreachProspect, field: "outreachEvent", label: "prospects" },
      { model: OutreachFollowUp, field: "outreachEvent", label: "follow-ups" },
    ],
  },

  outreachProspect: {
    model: OutreachProspect,
    label: "prospect",
    self: (doc) => {
      const reasons = [];
      if (doc.linkedMember) reasons.push("linked member record");
      if (doc.linkedVisitor) reasons.push("linked visitor record");
      return reasons;
    },
    links: [
      { model: OutreachFollowUp, field: "prospect", label: "follow-up records" },
    ],
  },

  outreachTeam: {
    model: OutreachTeam,
    label: "outreach team",
    self: () => [],
    links: [
      { model: OutreachEvent, field: "teams", label: "outreach events" },
    ],
  },

  // individual attendance records carry member check-ins — locked once they
  // contain recorded members (that is their history/relationship)
  serviceIndividualAttendance: {
    model: ServiceIndividualAttendance,
    label: "individual attendance record",
    self: (doc) => {
      const n = (doc.presentMembers?.length || 0) + (doc.absentMembers?.length || 0);
      const reasons = [];
      if (n > 0) reasons.push(`${n} member check-in${n === 1 ? "" : "s"} recorded`);
      if (doc.selfCheckInActive) reasons.push("an active self check-in link");
      return reasons;
    },
    links: [],
  },
  ministryIndividualAttendance: {
    model: MinistryIndividualAttendance,
    label: "ministry individual attendance record",
    self: (doc) => (nonEmpty(doc.presentMembers) ? [`${doc.presentMembers.length} member check-in${doc.presentMembers.length === 1 ? "" : "s"} recorded`] : []),
    links: [],
  },
  cellIndividualAttendance: {
    model: CellIndividualAttendance,
    label: "cell individual attendance record",
    self: (doc) => (nonEmpty(doc.presentMembers) ? [`${doc.presentMembers.length} member check-in${doc.presentMembers.length === 1 ? "" : "s"} recorded`] : []),
    links: [],
  },
  departmentIndividualAttendance: {
    model: DepartmentIndividualAttendance,
    label: "department individual attendance record",
    self: (doc) => (nonEmpty(doc.presentMembers) ? [`${doc.presentMembers.length} member check-in${doc.presentMembers.length === 1 ? "" : "s"} recorded`] : []),
    links: [],
  },
  groupIndividualAttendance: {
    model: GroupIndividualAttendance,
    label: "group individual attendance record",
    self: (doc) => (nonEmpty(doc.presentMembers) ? [`${doc.presentMembers.length} member check-in${doc.presentMembers.length === 1 ? "" : "s"} recorded`] : []),
    links: [],
  },
};

const idSet = (vals) => new Set(vals.map(String));

// Reasons a record cannot be deleted (empty array = deletable).
export const getDeletionBlockers = async (entityType, doc) => {
  const spec = ENTITY[entityType];
  if (!spec) return [];
  const churchId = doc.church;
  const id = doc._id;
  const reasons = [...spec.self(doc)];
  for (const link of spec.links) {
    const n = await link.model.countDocuments({ church: churchId, [link.field]: id });
    if (n > 0) reasons.push(`${n} ${link.label}`);
  }
  return reasons;
};

// Adds canDelete (+ deleteBlockReasons when locked) to each row. Batched: one
// distinct() per link field, not per row. Accepts mongoose docs or plain
// objects; returns plain objects so new fields serialize in the response.
// churchId should be passed explicitly — list endpoints often .select() a
// subset of fields that excludes `church`.
export const annotateDeletable = async (entityType, docs, churchId) => {
  const spec = ENTITY[entityType];
  const rows = (docs || []).map((d) => (d && d.toObject ? d.toObject() : d));
  if (!spec || rows.length === 0) {
    rows.forEach((d) => { if (d) d.canDelete = true; });
    return rows;
  }
  const church = churchId || rows[0].church;
  const ids = rows.map((d) => d._id);
  const linkedSets = await Promise.all(
    spec.links.map(async (link) => ({
      label: link.label,
      set: idSet(await link.model.distinct(link.field, {
        church,
        [link.field]: { $in: ids },
      })),
    }))
  );
  for (const row of rows) {
    const key = String(row._id);
    const reasons = spec.self(row);
    for (const { label, set } of linkedSets) {
      if (set.has(key)) reasons.push(label);
    }
    row.canDelete = reasons.length === 0;
    if (reasons.length) row.deleteBlockReasons = reasons;
  }
  return rows;
};

// Route middleware: 409 with reasons when the record is linked. Unknown/missing
// records pass through so the controller keeps its own 404 handling.
export const deletionGuard = (entityType, idParam = "id") => async (req, res, next) => {
  try {
    const spec = ENTITY[entityType];
    if (!spec) return next();
    const doc = await spec.model.findOne({
      _id: req.params[idParam],
      church: req.activeChurch?._id,
    });
    if (!doc) return next();
    const reasons = await getDeletionBlockers(entityType, doc);
    if (reasons.length > 0) {
      return res.status(409).json({
        message: `Cannot delete ${spec.label}: it is linked to ${reasons.join("; ")}`,
        deleteBlockReasons: reasons,
      });
    }
    return next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
