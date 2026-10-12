require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const docs = await db.collection('lookupvalues').find({ kind: 'expenseCategory' }).toArray();
  docs.forEach(d => console.log(JSON.stringify({ v: d.value, churchId: d.churchId, createdBy: d.createdBy })));
  // and welfare
  const w = await db.collection('lookupvalues').find({ kind: 'welfareDisbursementCategory' }).toArray();
  w.forEach(d => console.log('welfare:', JSON.stringify({ v: d.value, churchId: d.churchId })));
  process.exit(0);
})();
