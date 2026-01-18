import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  church: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Conference', 'Service', 'Worship', 'Prayers', 'Outreach', 'Bible Study', 'Serminary', 'Retreat', 'Workshop', 'Camp Meeting']
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
   cell: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cell'
  },
   group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  description: {
    type: String
  },
  dateFrom: {
  type: Date,
  required: true
},
dateTo: {
  type: Date
},
  time: String,
  venue: {
    type: String,
    required: true
  },
 
  organizers: [{type: String, trim: true}],
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {timestamps: true});

export default mongoose.model('Event', eventSchema);
