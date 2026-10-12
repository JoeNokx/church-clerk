require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'nokaeldev@gmail.com' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
  console.log(token);
  process.exit(0);
})();
