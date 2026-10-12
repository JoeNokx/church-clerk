require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const kinds = await db.collection('lookupvalues').distinct('kind');
  console.log('ALL kinds:', JSON.stringify(kinds, null, 1));
  const exp = kinds.filter(k => /expense|spent|disburs|cost/i.test(k));
  console.log('expense-ish kinds:', exp);
  for (const k of exp) {
    const vals = await db.collection('lookupvalues').distinct('value', { kind: k });
    console.log(` ${k}:`, vals.length, JSON.stringify(vals.slice(0, 12)));
  }
  process.exit(0);
})();
