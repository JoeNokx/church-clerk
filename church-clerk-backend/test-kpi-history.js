// Real end-to-end verification of member status history + getAllMembersKPI.
// Creates synthetic members under throwaway church ObjectIds, runs the actual
// controller function, then deletes all test artifacts. Run: node test-kpi-history.js
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import Member from "./models/memberModel.js";
import MemberStatusHistory from "./models/memberStatusHistoryModel.js";
import { getAllMembersKPI } from "./controller/memberController.js";

const now = new Date();
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
const lastMonth = new Date(startOfMonth);
lastMonth.setDate(lastMonth.getDate() - 15); // mid previous month

const CHURCH_A = new mongoose.Types.ObjectId(); // fresh tracking (no pre-boundary history)
const CHURCH_B = new mongoose.Types.ObjectId(); // mature history + transitions
const CHURCH_C = new mongoose.Types.ObjectId(); // 45 -> 50 growth
const CHURCH_D = new mongoose.Types.ObjectId(); // legacy member, no history
const USER = new mongoose.Types.ObjectId();
const TEST_CHURCHES = [CHURCH_A, CHURCH_B, CHURCH_C, CHURCH_D];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, cond, extra = "") => {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
};

const runKpi = (churchId) =>
  new Promise((resolve, reject) => {
    const req = { activeChurch: { _id: churchId } };
    const res = {
      status(code) { this.code = code; return this; },
      json(body) { resolve({ code: this.code, body }); return this; }
    };
    Promise.resolve(getAllMembersKPI(req, res)).catch(reject);
  });

const mkMember = (church, status, n) =>
  Member.create({ church, firstName: "TestKPI", lastName: `M${n}`, phoneNumber: `02440000${String(n).padStart(3, "0")}`, createdBy: USER, status, memberId: `KPI-T-${n}` });

const backdate = (memberId, date) =>
  Member.collection.updateOne({ _id: memberId }, { $set: { createdAt: date } });

const seedHistory = (member, toStatus, changedAt) =>
  MemberStatusHistory.create({ church: member.church, member: member._id, fromStatus: null, toStatus, changedAt, source: "baseline" });

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("connected");

  try {
    // ---- Scenario A: fresh deploy — new members, transition, expect NO comparison data
    let n = 0;
    const a1 = await mkMember(CHURCH_A, "active", n++);
    const a2 = await mkMember(CHURCH_A, "active", n++);
    const a3 = await mkMember(CHURCH_A, "active", n++);
    await sleep(300);

    let hist = await MemberStatusHistory.find({ church: CHURCH_A }).sort({ member: 1, changedAt: 1 }).lean();
    check("A: create hooks wrote 3 'create' history rows", hist.length === 3 && hist.every((h) => h.source === "create"));

    await Member.findOneAndUpdate({ _id: a1._id }, { status: "dormant" });
    await sleep(300);
    hist = await MemberStatusHistory.find({ church: CHURCH_A }).lean();
    const trans = hist.filter((h) => h.source === "transition");
    check("A: active->dormant wrote transition row (from=active,to=dormant)",
      trans.length === 1 && trans[0].fromStatus === "active" && trans[0].toStatus === "dormant");

    let r = await runKpi(CHURCH_A);
    let kpi = r.body.memberKPI;
    // all members created this month -> nothing existed at boundary -> prev = zeros
    check("A: new-this-month members -> hasComparisonData=true, previous all zeros",
      kpi.hasComparisonData === true && kpi.previous?.totalMembers === 0 && kpi.previous?.activeMembers === 0 && kpi.previous?.inactiveMembers === 0 && kpi.previous?.formerMembers === 0);
    check("A: 0->positive change is null (no divide-by-zero), diff = current",
      kpi.change?.totalMembers === null && kpi.diff?.totalMembers === 3 && kpi.diff?.activeMembers === 2 && kpi.diff?.inactiveMembers === 1);
    check("A: current counts correct (3 total, 2 active, 1 inactive)",
      kpi.totalMembers === 3 && kpi.activeMembers === 2 && kpi.inactiveMembers === 1 && kpi.formerMembers === 0);

    // ---- Scenario B: mature history, transitions this month
    n = 100;
    const b1 = await mkMember(CHURCH_B, "dormant", n++);   // was active at boundary, now dormant
    const b2 = await mkMember(CHURCH_B, "active", n++);    // was dormant at boundary, now active
    const b3 = await mkMember(CHURCH_B, "transferred", n++); // still former
    const b4 = await mkMember(CHURCH_B, "left_church", n++); // still former
    const b5 = await mkMember(CHURCH_B, "active", n++);    // joined THIS month
    await sleep(300);
    for (const [m, s] of [[b1, "active"], [b2, "dormant"], [b3, "transferred"], [b4, "left_church"]]) {
      await backdate(m._id, lastMonth);
      await seedHistory(m, s, lastMonth);
    }
    // b5 keeps createdAt=now (not part of boundary set); its 'create' entry is post-boundary

    r = await runKpi(CHURCH_B);
    kpi = r.body.memberKPI;
    check("B: hasComparisonData=true", kpi.hasComparisonData === true, JSON.stringify(kpi.previous));
    check("B: previous = {4,1,1,2}", kpi.previous?.totalMembers === 4 && kpi.previous?.activeMembers === 1 && kpi.previous?.inactiveMembers === 1 && kpi.previous?.formerMembers === 2);
    check("B: current = {5,2,1,2}", kpi.totalMembers === 5 && kpi.activeMembers === 2 && kpi.inactiveMembers === 1 && kpi.formerMembers === 2);
    check("B: diff = {+1,+1,0,0}", kpi.diff?.totalMembers === 1 && kpi.diff?.activeMembers === 1 && kpi.diff?.inactiveMembers === 0 && kpi.diff?.formerMembers === 0);
    check("B: change total=+25%, active=+100%, inactive=0, former=0",
      Math.abs(kpi.change?.totalMembers - 25) < 1e-9 && Math.abs(kpi.change?.activeMembers - 100) < 1e-9 && kpi.change?.inactiveMembers === 0 && kpi.change?.formerMembers === 0);
    check("B: reconcile current (5 = 2+1+2)", kpi.totalMembers === kpi.activeMembers + kpi.inactiveMembers + kpi.formerMembers);

    // multiple transitions within the month: b1 active->dormant->transferred
    await Member.findOneAndUpdate({ _id: b1._id }, { status: "transferred" });
    await sleep(300);
    r = await runKpi(CHURCH_B);
    kpi = r.body.memberKPI;
    check("B2: multi-hop still uses boundary status (prev unchanged)",
      kpi.previous?.activeMembers === 1 && kpi.previous?.inactiveMembers === 1 && kpi.previous?.formerMembers === 2);
    check("B2: current reflects final status (former=3, inactive=0)",
      kpi.inactiveMembers === 0 && kpi.formerMembers === 3 && kpi.activeMembers === 2 && kpi.totalMembers === 5);

    // ---- Scenario C: 45 -> 50 growth (spec example)
    n = 200;
    const cMembers = [];
    for (let i = 0; i < 45; i++) cMembers.push(await mkMember(CHURCH_C, "active", n++));
    await sleep(500);
    // backdate members + their create-history to last month
    for (const m of cMembers) {
      await backdate(m._id, lastMonth);
      await MemberStatusHistory.collection.updateOne({ member: m._id, source: "create" }, { $set: { changedAt: lastMonth } });
    }
    for (let i = 0; i < 5; i++) await mkMember(CHURCH_C, "active", n++); // joined this month
    await sleep(300);

    r = await runKpi(CHURCH_C);
    kpi = r.body.memberKPI;
    check("C: prev 45 -> current 50, diff +5", kpi.previous?.totalMembers === 45 && kpi.totalMembers === 50 && kpi.diff?.totalMembers === 5);
    check("C: change = +11.11%", Math.abs(kpi.change?.totalMembers - (5 / 45) * 100) < 1e-9, `got ${kpi.change?.totalMembers}`);

    // zero counts + unchanged: church D2 reuse—former 0->0
    check("C: former 0->0 gives change=0,diff=0", kpi.change?.formerMembers === 0 && kpi.diff?.formerMembers === 0);

    // ---- Scenario D: legacy member, no pre-boundary history at all
    n = 300;
    const d1 = await mkMember(CHURCH_D, "active", n++);
    await backdate(d1._id, lastMonth);
    await MemberStatusHistory.deleteMany({ member: d1._id }); // simulate pre-tracking record
    r = await runKpi(CHURCH_D);
    kpi = r.body.memberKPI;
    check("D: legacy member -> hasComparisonData=false, previous=null", kpi.hasComparisonData === false && kpi.previous === null);
    const baseline = await MemberStatusHistory.findOne({ member: d1._id, source: "baseline" }).lean();
    check("D: lazy baseline row written stamped now", !!baseline && new Date(baseline.changedAt) >= startOfMonth);

    // boundary coverage again next call for D still false (baseline is post-boundary)
    r = await runKpi(CHURCH_D);
    check("D: still no comparison after seeding", r.body.memberKPI.hasComparisonData === false);

    // ---- zero->positive: church E? use a fresh id inline
    const CHURCH_E = new mongoose.Types.ObjectId();
    TEST_CHURCHES.push(CHURCH_E);
    r = await runKpi(CHURCH_E);
    kpi = r.body.memberKPI;
    check("E: empty church -> all zeros, no crash", kpi.totalMembers === 0 && kpi.activeMembers === 0);
  } finally {
    await Member.deleteMany({ church: { $in: TEST_CHURCHES } });
    await MemberStatusHistory.deleteMany({ church: { $in: TEST_CHURCHES } });
    await mongoose.disconnect();
  }

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
