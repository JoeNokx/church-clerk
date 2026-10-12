require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'nokaeldev@gmail.com' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
  for (let i = 0; i < 15; i++) {
    try {
      const res = await fetch('http://localhost:5100/api/v1/budgeting/budgets/expense-categories?source=general', { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      const v = body.values || [];
      console.log('n=', v.length);
      for (const want of ['Equipment', 'Utilities', 'Transportation', 'Fundraising', 'Salary', 'Maintenance', 'Hospital', 'Emergency', 'Birthday', 'surprises', '5 additional AC']) {
        console.log(` ${want}: ${v.includes(want)}`);
      }
      process.exit(0);
    } catch { await new Promise(r => setTimeout(r, 5000)); }
  }
  console.log('server never up');
  process.exit(1);
})();
