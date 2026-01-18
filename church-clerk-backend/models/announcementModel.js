const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  church: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  targetAudience: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unit'
    }
  ],
  message: {
    type: String,
    required: true
  },
  sendMethod: {
    type: String,
    enum: ['Email', 'SMS']
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Announcement', announcementSchema);
