// models/Member.js
import mongoose from "mongoose";

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
  status: { type: String, enum: ['active', 'inactive', 'visitor', 'former'], default: 'active' },
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

  // Relationships to ministry models
  department: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],         // department
  group: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }], // ministry
  cell: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cell' }],         // small group

  //church information
  church: { type: mongoose.Schema.Types.ObjectId, ref: 'Church', required: true },
  churchRole: { type: String, trim: true },
  dateJoined: {type: Date, default: Date.now},

  //creator
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, {
  timestamps: true
});

// virtual fullName
memberSchema.virtual('fullName').get(function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ');
});

memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

//for unique member id
memberSchema.index({ memberId: 1, church: 1 }, { unique: true });

export default mongoose.model('Member', memberSchema);
