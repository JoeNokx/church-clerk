// models/Member.js
import mongoose from "mongoose";
import MemberStatusHistory from "./memberStatusHistoryModel.js";

const memberSchema = new mongoose.Schema({

  // Personal information
  memberId: { type: String, unique: true, trim: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  gender: { type: String, enum: ['male', 'female'] },
  occupation: { type: String, trim: true },
  nationality: { type: String, trim: true },
  ageGroup: { type: String, enum: ['children', 'teenagers', 'youth', 'adult', 'elderly'], trim: true },
  status: { type: String, enum: ['active', 'dormant', 'transferred', 'left_church', 'deceased', 'temporarily_away', 'inactive', 'visitor', 'former'], default: 'active' },
  previousStatus: { type: String, enum: ['active', 'dormant', 'transferred', 'left_church', 'deceased', 'temporarily_away', 'inactive', 'visitor', 'former'] },
  statusChangedAt: { type: Date },
  photoUrl: { type: String, trim: true },
  note: {type: String, trim: true},
  dateOfBirth: Date,

  //address
  streetAddress: { type: String, trim: true },
  city: { type: String, trim: true },
  region: { type: String, trim: true },
  country: { type: String, default: 'Ghana' },
  maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed', 'other'] },

  visitorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Visitor",
  default: null,
  },

  // Relationships to organisation models
  department: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],         // department
  group: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // group
  cell: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cell' }],         // small group
  ministry: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ministry' }], // ministry

  //church information
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  churchRole: { type: String, trim: true },
  dateJoined: {type: Date, default: Date.now},

  //creator
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

memberSchema.pre("save", async function () {
  this._isNewRecord = this.isNew;
  if (this.isNew) {
    this.statusChangedAt = new Date();
    return;
  }
  if (this.isModified("status")) {
    const prior = await this.constructor.findById(this._id).select("status").lean();
    if (prior && String(prior.status) !== String(this.status)) {
      this._priorStatusForHistory = prior.status;
      this.previousStatus = prior.status;
      this.statusChangedAt = new Date();
    }
  }
});

memberSchema.post("save", async function (doc) {
  try {
    if (doc._isNewRecord) {
      await MemberStatusHistory.create({
        church: doc.church, member: doc._id,
        fromStatus: null, toStatus: doc.status,
        changedAt: doc.statusChangedAt || new Date(), source: "create"
      });
    } else if (doc._priorStatusForHistory !== undefined) {
      await MemberStatusHistory.create({
        church: doc.church, member: doc._id,
        fromStatus: doc._priorStatusForHistory, toStatus: doc.status,
        changedAt: doc.statusChangedAt || new Date(), source: "transition"
      });
    }
  } catch (e) {
    console.error("MemberStatusHistory write failed:", e?.message || e);
  }
});

memberSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate() || {};
  const nextStatus = update.status ?? update.$set?.status;
  if (nextStatus === undefined) return;
  const current = await this.model.findOne(this.getQuery()).select("status").lean();
  if (current && String(current.status) !== String(nextStatus)) {
    const stamp = new Date();
    this._statusTransition = { from: current.status, to: nextStatus, at: stamp };
    if (update.$set) {
      update.$set.statusChangedAt = stamp;
      update.$set.previousStatus = current.status;
    } else {
      update.statusChangedAt = stamp;
      update.previousStatus = current.status;
    }
    this.setUpdate(update);
  }
});

memberSchema.post("findOneAndUpdate", async function (doc) {
  const transition = this._statusTransition;
  if (!doc || !transition) return;
  try {
    await MemberStatusHistory.create({
      church: doc.church, member: doc._id,
      fromStatus: transition.from, toStatus: transition.to,
      changedAt: transition.at, source: "transition"
    });
  } catch (e) {
    console.error("MemberStatusHistory write failed:", e?.message || e);
  }
});

// virtual fullName
memberSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

//for unique member id
memberSchema.index({ memberId: 1, church: 1 }, { unique: true });

// Compound indexes for common query patterns (dashboard KPI, widgets, analytics)
memberSchema.index({ church: 1, status: 1 });
memberSchema.index({ church: 1, dateJoined: 1 });
memberSchema.index({ church: 1, createdAt: -1 });

export default mongoose.model('Member', memberSchema);
