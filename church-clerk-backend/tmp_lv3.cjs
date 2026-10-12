require('dotenv').config();
const mongoose = require('mongoose');
const oid = (s) => new mongoose.Types.ObjectId(s);
const CHURCH = '69a9f4c38ede9b7f3bac7191';
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const kinds = ['expenseCategory', 'welfareDisbursementCategory', 'businessExpenseCategory'];
  // raw driver query
  const raw = await db.collection('lookupvalues').find({ churchId: oid(CHURCH), kind: { $in: kinds } }).toArray();
  console.log('raw churchId=ObjectId:', raw.length, raw.map(r => r.value));
  // what if churchId arrives as a string from req.activeChurch?
  const raw2 = await db.collection('lookupvalues').find({ churchId: CHURCH, kind: { $in: kinds } }).toArray();
  console.log('raw churchId=string:', raw2.length);
  // mongoose model
  const LookupValue = (await import('./models/lookupValueModel.js')).default;
  const rows = await LookupValue.find({ churchId: oid(CHURCH), kind: { $in: kinds } }).select('value').lean();
  console.log('model churchId=ObjectId:', rows.length, rows.map(r => r.value));
  const rows2 = await LookupValue.find({ churchId: CHURCH, kind: { $in: kinds } }).select('value').lean();
  console.log('model churchId=string:', rows2.length);
  process.exit(0);
})();
