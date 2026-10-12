require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const user = await db.collection('users').findOne({ email: 'nokaeldev@gmail.com' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
  for (let i = 0; i < 12; i++) {
    try {
      const res = await fetch('http://localhost:5100/api/v1/budgeting/budgets/expense-categories?source=general', { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      console.log('values n=', (body.values||[]).length);
      console.log(JSON.stringify(body.values));
      console.log('has "new test":', (body.values||[]).includes('new test'));
      process.exit(0);
    } catch (e) { await new Promise(r => setTimeout(r, 5000)); }
  }
  console.log('server never came up');
  process.exit(1);
})();
