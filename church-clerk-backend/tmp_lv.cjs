require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const oid = (s) => new mongoose.Types.ObjectId(s);
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const CHURCH = '69a9f4c38ede9b7f3bac7191';
  // what field does lookupvalues use for church?
  const doc = await db.collection('lookupvalues').findOne({ kind: 'expenseCategory' });
  console.log('lookup doc fields:', Object.keys(doc), '| church:', doc.church, '| churchId:', doc.churchId);
  const user = await db.collection('users').findOne({ email: 'nokaeldev@gmail.com' });
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const res = await fetch('http://localhost:5100/api/v1/budgeting/budgets/expense-categories?source=general', { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  console.log('endpoint values:', JSON.stringify(body.values));
  console.log('has lookup-only "new test":', (body.values || []).includes('new test'));
  process.exit(0);
})();
