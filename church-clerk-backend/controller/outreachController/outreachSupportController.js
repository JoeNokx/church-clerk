import OutreachSupport from "../../models/outreachModel/outreachSupportModel.js";
import OutreachEvent from "../../models/outreachModel/outreachEventModel.js";
import Member from "../../models/memberModel.js";
import Visitor from "../../models/visitorsModel.js";
import { generateReferenceId } from "../../utils/generateReferenceId.js";

const isPrivileged = (req) => req.user.role === "superadmin" || req.user.role === "supportadmin";

const resolveEvent = async (req) => {
  const query = { _id: req.params.eventId };
  if (!isPrivileged(req)) query.church = req.activeChurch._id;
  return OutreachEvent.findOne(query).lean();
};

const findPerson = async (req, memberId, visitorId, searchMember) => {
  const churchId = req.activeChurch._id;
  if (memberId) {
    const member = await Member.findOne({ _id: memberId, church: churchId });
    return member ? { member: member._id } : null;
  }
  if (visitorId) {
    const visitor = await Visitor.findOne({ _id: visitorId, church: churchId });
    return visitor ? { visitor: visitor._id } : null;
  }
  if (!searchMember) return null;
  const regex = { $regex: searchMember, $options: "i" };
  const member = await Member.findOne({
    church: churchId,
    $or: [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phoneNumber: regex }
    ]
  });
  if (member) return { member: member._id };
  const visitor = await Visitor.findOne({
    church: churchId,
    $or: [{ fullName: regex }, { email: regex }, { phoneNumber: regex }]
  });
  return visitor ? { visitor: visitor._id } : null;
};

const createOutreachSupport = async (req, res) => {
  try {
    const event = await resolveEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Outreach event not found" });
    }

    const searchMember = (req.body.searchMember || "").trim();
    const memberId = String(req.body.memberId || "").trim();
    const visitorId = String(req.body.visitorId || "").trim();
    const { amount, date, paymentMethod, note, entries } = req.body;

    if (Array.isArray(entries) && entries.length) {
      const missingPerson = entries.find((e) => !e?.memberId && !e?.visitorId && !String(e?.name || "").trim());
      if (missingPerson) {
        return res.status(400).json({ message: "Each entry requires a member, visitor, or name." });
      }

      const entryMemberIds = [...new Set(entries.map((e) => String(e?.memberId || "").trim()).filter(Boolean))];
      const entryVisitorIds = [...new Set(entries.map((e) => String(e?.visitorId || "").trim()).filter(Boolean))];

      const [foundMembers, foundVisitors] = await Promise.all([
        Member.find({ _id: { $in: entryMemberIds }, church: req.activeChurch._id }).select("_id"),
        Visitor.find({ _id: { $in: entryVisitorIds }, church: req.activeChurch._id }).select("_id")
      ]);
      const foundMemberIds = new Set(foundMembers.map((m) => String(m._id)));
      const foundVisitorIds = new Set(foundVisitors.map((v) => String(v._id)));
      if (entryMemberIds.some((id) => !foundMemberIds.has(id)) || entryVisitorIds.some((id) => !foundVisitorIds.has(id))) {
        return res.status(404).json({ message: "One or more people were not found" });
      }

      const invalidEntry = entries.find((e) => !e?.amount || Number(e.amount) <= 0 || !e?.date);
      if (invalidEntry) {
        return res.status(400).json({ message: "Each entry requires an amount and a date." });
      }

      const docs = await OutreachSupport.insertMany(
        await Promise.all(
          entries.map(async (e) => ({
            event: event._id,
            member: e.memberId || undefined,
            visitor: e.visitorId || undefined,
            name: (e.memberId || e.visitorId) ? undefined : (typeof e.name === "string" ? e.name.trim() : e.name),
            amount: Number(e.amount),
            date: e.date,
            paymentMethod: e.paymentMethod || "Cash",
            note: typeof e.note === "string" ? e.note.trim() : e.note,
            church: event.church,
            createdBy: req.user._id,
            referenceId: await generateReferenceId("OSP")
          }))
        )
      );

      return res.status(201).json({
        message: `${docs.length} support record(s) created successfully`,
        count: docs.length,
        supportRecords: docs
      });
    }

    if (!amount || Number(amount) <= 0 || !date) {
      return res.status(400).json({ message: "Amount and date are required." });
    }

    let person = await findPerson(req, memberId, visitorId, searchMember);
    if (!person) {
      if (memberId || visitorId || searchMember) {
        return res.status(404).json({ message: "Member or visitor not found" });
      }
      const giverName = String(req.body.name || "").trim();
      if (giverName) person = { name: giverName };
    }
    if (!person) {
      return res.status(400).json({ message: "Please select a member or visitor, or enter a name." });
    }

    const support = await OutreachSupport.create({
      event: event._id,
      ...person,
      amount: Number(amount),
      date,
      paymentMethod,
      note: typeof note === "string" ? note.trim() : note,
      church: event.church,
      createdBy: req.user._id
    });

    return res.status(201).json({ message: "Support recorded successfully", support });
  } catch (error) {
    return res.status(400).json({ message: "Support could not be recorded", error: error.message });
  }
};

const getOutreachSupport = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", dateFrom, dateTo } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const event = await resolveEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Outreach event not found" });
    }

    const query = { church: event.church, event: event._id };

    if (search) {
      const regex = { $regex: search, $options: "i" };
      const [members, visitors] = await Promise.all([
        Member.find({ church: event.church, $or: [{ firstName: regex }, { lastName: regex }] }).select("_id"),
        Visitor.find({ church: event.church, fullName: regex }).select("_id")
      ]);
      const memberIds = members.map((m) => m._id);
      const visitorIds = visitors.map((v) => v._id);
      query.$or = [
        { member: { $in: memberIds.length ? memberIds : [null] } },
        { visitor: { $in: visitorIds.length ? visitorIds : [null] } },
        { name: regex }
      ];
    }

    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        query.date.$gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.date.$lte = endDate;
      }
    }

    const [support, totalSupport, summary] = await Promise.all([
      OutreachSupport.find(query)
        .select("member visitor name amount date paymentMethod note createdBy referenceId createdAt")
        .populate("member", "firstName lastName email phoneNumber")
        .populate("visitor", "fullName email phoneNumber")
        .populate("createdBy", "fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      OutreachSupport.countDocuments(query),
      OutreachSupport.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ]);

    const totalPages = Math.ceil(totalSupport / limitNum);
    const pagination = {
      totalResult: totalSupport,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null
    };

    return res.status(200).json({
      message: "Support records fetched successfully",
      pagination,
      count: support.length,
      summary: { total: summary?.[0]?.total || 0 },
      support
    });
  } catch (error) {
    return res.status(400).json({ message: "Support records could not be fetched", error: error.message });
  }
};

const updateOutreachSupport = async (req, res) => {
  try {
    const event = await resolveEvent(req);
    if (!event) {
      return res.status(404).json({ message: "Outreach event not found" });
    }

    const { amount, date, paymentMethod, note, memberId, visitorId, name } = req.body;
    const update = {};

    if (memberId) {
      const member = await Member.findOne({ _id: memberId, church: event.church });
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      update.member = member._id;
      update.visitor = null;
      update.name = null;
    } else if (visitorId) {
      const visitor = await Visitor.findOne({ _id: visitorId, church: event.church });
      if (!visitor) {
        return res.status(404).json({ message: "Visitor not found" });
      }
      update.visitor = visitor._id;
      update.member = null;
      update.name = null;
    } else if (name !== undefined) {
      const giverName = String(name || "").trim();
      if (!giverName) {
        return res.status(400).json({ message: "Name is required." });
      }
      update.name = giverName;
      update.member = null;
      update.visitor = null;
    }

    if (amount !== undefined) {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "Amount is required." });
      }
      update.amount = Number(amount);
    }
    if (date !== undefined) update.date = date;
    if (paymentMethod !== undefined) update.paymentMethod = paymentMethod;
    if (note !== undefined) update.note = typeof note === "string" ? note.trim() : note;

    const support = await OutreachSupport.findOneAndUpdate(
      { _id: req.params.supportId, church: event.church, event: event._id },
      update,
      { new: true, runValidators: true }
    );

    if (!support) {
      return res.status(404).json({ message: "Support record not found" });
    }

    return res.status(200).json({ message: "Support record updated successfully", support });
  } catch (error) {
    return res.status(400).json({ message: "Support record could not be updated", error: error.message });
  }
};

const searchPeopleForSupport = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    if (!search) {
      return res.status(200).json({ message: "No search term provided", people: [] });
    }

    const regex = { $regex: search, $options: "i" };
    const churchId = req.activeChurch._id;

    const [members, visitors] = await Promise.all([
      Member.find({
        church: churchId,
        $or: [
          { firstName: regex },
          { lastName: regex },
          { phoneNumber: regex },
          { email: regex },
          { city: regex },
          { memberId: regex }
        ]
      })
        .select("firstName lastName phoneNumber email city")
        .limit(10)
        .lean(),
      Visitor.find({
        church: churchId,
        $or: [
          { fullName: regex },
          { phoneNumber: regex },
          { email: regex },
          { location: regex }
        ]
      })
        .select("fullName phoneNumber email location")
        .limit(10)
        .lean()
    ]);

    const people = [
      ...members.map((m) => ({
        _id: m._id,
        type: "member",
        displayName: `${m.firstName || ""} ${m.lastName || ""}`.trim(),
        phoneNumber: m.phoneNumber,
        email: m.email,
        city: m.city
      })),
      ...visitors.map((v) => ({
        _id: v._id,
        type: "visitor",
        displayName: v.fullName,
        phoneNumber: v.phoneNumber,
        email: v.email,
        city: v.location
      }))
    ];

    return res.status(200).json({ message: "People fetched successfully", people });
  } catch (error) {
    return res.status(400).json({ message: "People could not be fetched", error: error.message });
  }
};

export {
  createOutreachSupport,
  getOutreachSupport,
  updateOutreachSupport,
  searchPeopleForSupport
};
