import Member from "../models/memberModel.js";
import Visitor from "../models/visitorsModel.js";
import Attendance from "../models/attendanceModel.js";
import Department from "../models/ministryModel/departmentModel.js";
import Cell from "../models/ministryModel/cellModel.js";
import Group from "../models/ministryModel/groupModel.js";
import Event from "../models/eventModel.js";
import Announcement from "../models/announcementModel.js";
import TitheIndividual from "../models/financeModel/tithesModel/titheIndividualModel.js";
import Budget from "../models/financeModel/budgetingModel.js";
import ChurchProject from "../models/financeModel/projectModel/churchProjectModel.js";
import Offering from "../models/financeModel/offeringModel.js";
import WelfareDisbursement from "../models/financeModel/welfareModel/welfareDisbursementModel.js";
import Pledge from "../models/financeModel/pledgeModel/pledgeModel.js";
import BusinessVentures from "../models/financeModel/businessModel/businessVenturesModel.js";
import GeneralExpenses from "../models/generalExpenseModel.js";

const LIMIT = 5;

const can = (permissions, moduleKey) => {
  if (!permissions) return false;
  if (permissions.super === true) return true;
  return Boolean(permissions?.[moduleKey]?.read);
};

const safeRegex = (q) => {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped, "i");
};

export const globalSearch = async (req, res) => {
  try {
    const churchId = req.activeChurch?._id;
    if (!churchId) {
      return res.status(400).json({ message: "Church context required" });
    }

    const q = String(req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.status(200).json({ results: {} });
    }

    const perms = req.permissions || {};
    const regex = safeRegex(q);
    const base = { church: churchId };
    const results = {};

    const tasks = [];

    // Members
    if (can(perms, "members")) {
      tasks.push(
        Member.find({
          ...base,
          $or: [
            { firstName: regex },
            { lastName: regex },
            { memberId: regex },
            { email: regex },
            { phoneNumber: regex },
          ],
        })
          .select("_id firstName lastName memberId photoUrl status phoneNumber")
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.members = rows.map((r) => ({
                _id: r._id,
                title: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
                subtitle: r.phoneNumber || "",
                badge: r.status || "",
                photoUrl: r.photoUrl || null,
                module: "members",
              }));
            }
          })
      );
    }

    // Visitors
    if (can(perms, "visitors")) {
      tasks.push(
        Visitor.find({
          ...base,
          $or: [{ fullName: regex }, { phoneNumber: regex }, { email: regex }],
        })
          .select("_id fullName phoneNumber status serviceDate")
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.visitors = rows.map((r) => ({
                _id: r._id,
                title: r.fullName || "—",
                subtitle: r.phoneNumber || "",
                badge: r.status || "visitor",
                module: "visitors",
              }));
            }
          })
      );
    }

    // Attendance
    if (can(perms, "attendance")) {
      tasks.push(
        Attendance.find({ ...base, serviceType: regex })
          .select("_id serviceType serviceDate totalNumber")
          .sort({ serviceDate: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.attendance = rows.map((r) => ({
                _id: r._id,
                title: r.serviceType || "—",
                subtitle: r.serviceDate
                  ? new Date(r.serviceDate).toLocaleDateString()
                  : "",
                badge: r.totalNumber != null ? `${r.totalNumber} attendees` : "",
                module: "attendance",
              }));
            }
          })
      );
    }

    // Departments
    if (can(perms, "ministry")) {
      tasks.push(
        Department.find({
          ...base,
          $or: [{ name: regex }, { description: regex }],
        })
          .select("_id name description status")
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.departments = rows.map((r) => ({
                _id: r._id,
                title: r.name || "—",
                subtitle: r.description || "",
                badge: r.status || "",
                module: "departments",
              }));
            }
          })
      );

      // Cells
      tasks.push(
        Cell.find({
          ...base,
          $or: [{ name: regex }, { description: regex }],
        })
          .select("_id name description status")
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.cells = rows.map((r) => ({
                _id: r._id,
                title: r.name || "—",
                subtitle: r.description || "",
                badge: r.status || "",
                module: "cells",
              }));
            }
          })
      );

      // Groups
      tasks.push(
        Group.find({
          ...base,
          $or: [{ name: regex }, { description: regex }],
        })
          .select("_id name description")
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.groups = rows.map((r) => ({
                _id: r._id,
                title: r.name || "—",
                subtitle: r.description || "",
                module: "groups",
              }));
            }
          })
      );
    }

    // Events
    if (can(perms, "events")) {
      tasks.push(
        Event.find({
          ...base,
          $or: [
            { title: regex },
            { description: regex },
            { venue: regex },
            { category: regex },
          ],
        })
          .select("_id title category dateFrom venue")
          .sort({ dateFrom: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.events = rows.map((r) => ({
                _id: r._id,
                title: r.title || "—",
                subtitle: r.venue || "",
                badge: r.category || "",
                date: r.dateFrom,
                module: "events",
              }));
            }
          })
      );
    }

    // Announcements
    if (can(perms, "announcements")) {
      tasks.push(
        Announcement.find({
          ...base,
          $or: [{ title: regex }, { message: regex }],
        })
          .select("_id title message createdAt")
          .sort({ createdAt: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.announcements = rows.map((r) => ({
                _id: r._id,
                title: r.title || "—",
                subtitle: r.message
                  ? String(r.message).slice(0, 80)
                  : "",
                date: r.createdAt,
                module: "announcements",
              }));
            }
          })
      );
    }

    // Tithe
    if (can(perms, "tithe")) {
      tasks.push(
        TitheIndividual.find({
          ...base,
          $or: [{ payerName: regex }, { paymentMethod: regex }, { referenceId: regex }],
        })
          .select("_id payerName amount date paymentMethod referenceId")
          .sort({ date: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.tithe = rows.map((r) => ({
                _id: r._id,
                title: r.payerName || "Unknown Payer",
                subtitle: r.referenceId || r.paymentMethod || "",
                badge: r.amount != null ? `GH₵ ${Number(r.amount).toLocaleString()}` : "",
                date: r.date,
                module: "tithe",
              }));
            }
          })
      );
    }

    // Budgeting
    if (can(perms, "budgeting")) {
      tasks.push(
        Budget.find({ ...base, $or: [{ name: regex }, { referenceId: regex }] })
          .select("_id name fiscalYear status referenceId")
          .sort({ createdAt: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.budgeting = rows.map((r) => ({
                _id: r._id,
                title: r.name || "—",
                subtitle: r.referenceId || (r.fiscalYear ? `FY ${r.fiscalYear}` : ""),
                badge: r.status || "",
                module: "budgeting",
              }));
            }
          })
      );
    }

    // Church Projects
    if (can(perms, "churchProjects")) {
      tasks.push(
        ChurchProject.find({
          ...base,
          $or: [{ name: regex }, { description: regex }, { referenceId: regex }],
        })
          .select("_id name description targetAmount status referenceId")
          .sort({ createdAt: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.churchProjects = rows.map((r) => ({
                _id: r._id,
                title: r.name || "—",
                subtitle: r.referenceId || (r.description ? String(r.description).slice(0, 80) : ""),
                badge: r.status || "",
                module: "churchProjects",
              }));
            }
          })
      );
    }

    // Offerings
    if (can(perms, "offerings")) {
      tasks.push(
        Offering.find({
          ...base,
          $or: [{ serviceType: regex }, { offeringType: regex }, { referenceId: regex }],
        })
          .select("_id serviceType offeringType serviceDate amount referenceId")
          .sort({ serviceDate: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.offerings = rows.map((r) => ({
                _id: r._id,
                title: r.offeringType || r.serviceType || "—",
                subtitle: r.referenceId || r.serviceType || "",
                badge: r.amount != null ? `GH₵ ${Number(r.amount).toLocaleString()}` : "",
                date: r.serviceDate,
                module: "offerings",
              }));
            }
          })
      );
    }

    // Welfare
    if (can(perms, "welfare")) {
      tasks.push(
        WelfareDisbursement.find({
          ...base,
          $or: [
            { beneficiaryName: regex },
            { category: regex },
            { description: regex },
            { referenceId: regex },
          ],
        })
          .select("_id beneficiaryName category amount date referenceId")
          .sort({ date: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.welfare = rows.map((r) => ({
                _id: r._id,
                title: r.beneficiaryName || "—",
                subtitle: r.referenceId || r.category || "",
                badge: r.amount != null ? `GH₵ ${Number(r.amount).toLocaleString()}` : "",
                date: r.date,
                module: "welfare",
              }));
            }
          })
      );
    }

    // Pledges
    if (can(perms, "pledges")) {
      tasks.push(
        Pledge.find({
          ...base,
          $or: [{ name: regex }, { phoneNumber: regex }, { referenceId: regex }],
        })
          .select("_id name phoneNumber amount pledgeDate status referenceId")
          .sort({ pledgeDate: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.pledges = rows.map((r) => ({
                _id: r._id,
                title: r.name || "—",
                subtitle: r.referenceId || r.phoneNumber || "",
                badge: r.status || "",
                module: "pledges",
              }));
            }
          })
      );
    }

    // Business Ventures
    if (can(perms, "businessVentures")) {
      tasks.push(
        BusinessVentures.find({
          ...base,
          $or: [
            { businessName: regex },
            { description: regex },
            { manager: regex },
            { referenceId: regex },
          ],
        })
          .select("_id businessName description manager startDate referenceId")
          .sort({ startDate: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.businessVentures = rows.map((r) => ({
                _id: r._id,
                title: r.businessName || "—",
                subtitle: r.referenceId || (r.manager ? `Manager: ${r.manager}` : (r.description || "")),
                module: "businessVentures",
              }));
            }
          })
      );
    }

    // General Expenses
    if (can(perms, "expenses")) {
      tasks.push(
        GeneralExpenses.find({
          ...base,
          $or: [{ category: regex }, { description: regex }, { referenceId: regex }],
        })
          .select("_id category description amount date paymentMethod referenceId")
          .sort({ date: -1 })
          .limit(LIMIT)
          .lean()
          .then((rows) => {
            if (rows.length) {
              results.expenses = rows.map((r) => ({
                _id: r._id,
                title: r.category || "—",
                subtitle: r.referenceId || r.description || r.paymentMethod || "",
                badge: r.amount != null ? `GH₵ ${Number(r.amount).toLocaleString()}` : "",
                date: r.date,
                module: "expenses",
              }));
            }
          })
      );
    }

    await Promise.allSettled(tasks);

    return res.status(200).json({ results });
  } catch (error) {
    console.error("Global search error:", error);
    return res.status(500).json({ message: "Search failed", error: error.message });
  }
};
