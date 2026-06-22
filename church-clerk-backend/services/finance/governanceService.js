import ApprovalRequest, { ApprovalStatuses, ApprovalActionTypes } from "../../models/financeModel/governance/approvalRequestModel.js";
import FinancialAdjustment, { AdjustmentStatuses, ImpactLevels } from "../../models/financeModel/governance/financialAdjustmentModel.js";
import FinancialAuditLog from "../../models/financeModel/governance/financialAuditLogModel.js";
import { getSystemSettingsSnapshot } from "../../controller/systemSettingsController.js";
import { getModelForEntity } from "./govModelRegistry.js";

export const GovernanceModules = Object.freeze({
  TITHES: "tithes",
  OFFERINGS: "offerings",
  PLEDGES: "pledges",
  PROJECTS: "projects",
  EXPENSES: "expenses",
  WELFARE: "welfare",
  SPECIAL_FUNDS: "special_funds",
  BUSINESS: "business",
  MINISTRIES: "ministries",
  PROGRAMS: "programs"
});

// Utility: 24-hour window
const isWithin24Hours = (date) => {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  return now - d.getTime() <= 24 * 60 * 60 * 1000;
};

export async function logAudit({ actor, action, church, module, entityType, entityId = null, meta = null }) {
  try {
    await FinancialAuditLog.create({ actor, action, church, module, entityType, entityId, meta });
  } catch (_) {
    // swallow log errors
  }
}

export async function enforceBackdating({ user, churchId, module, entityType, date, reason, fullBody, onApprove }) {
  const isAdmin = ["superadmin", "churchadmin"].includes(String(user?.role || ""));

  // Admins can always backdate freely
  if (isAdmin) return { status: "APPROVED" };

  // Within 24 hours is fine for everyone
  if (isWithin24Hours(date)) return { status: "APPROVED" };

  // Non-admin backdating beyond 24 hours always requires approval
  const safeBody = Object.assign({}, fullBody || {});
  delete safeBody.reason;
  delete safeBody.backdateReason;

  const reqDoc = await ApprovalRequest.create({
    church: churchId,
    module,
    entityType,
    actionType: ApprovalActionTypes.BACKDATE_CREATE,
    requestedBy: user._id,
    reason: String(reason || "").trim() || null,
    payload: { date, fullBody: safeBody }
  });

  await logAudit({ actor: user._id, action: "BACKDATE_REQUESTED", church: churchId, module, entityType, meta: { approvalRequestId: reqDoc._id } });

  return { status: "PENDING_APPROVAL", requestId: reqDoc._id };
}

export async function createAdjustment({ user, churchId, module, entityType, original, patch, reason, impactLevel }) {
  const flags = await getSystemSettingsSnapshot();
  const enforce = Boolean(flags.enforceImmutability);

  // Always create an adjustment entry (auditability), enforcement decides status
  const difference = buildDifference(original, patch);
  const isHigh = String(impactLevel || "").toUpperCase() === ImpactLevels.HIGH;

  const base = {
    church: churchId,
    module,
    entityType,
    originalId: original._id,
    originalSnapshot: original,
    correctedFields: patch,
    difference,
    reason: String(reason || "").trim() || "Correction",
    impactLevel: isHigh ? ImpactLevels.HIGH : ImpactLevels.MINOR,
    createdBy: user._id
  };

  if (!enforce) {
    const adj = await FinancialAdjustment.create({ ...base, status: AdjustmentStatuses.APPLIED, appliedAt: new Date() });
    await logAudit({ actor: user._id, action: "ADJUSTMENT_APPLIED", church: churchId, module, entityType, entityId: original._id, meta: { adjustmentId: adj._id } });
    return { status: "APPROVED", adjustmentId: adj._id };
  }

  // When enforcement is ON, ALL adjustments require admin approval regardless of impact level
  const reqDoc = await ApprovalRequest.create({
    church: churchId,
    module,
    entityType,
    actionType: ApprovalActionTypes.ADJUSTMENT_HIGH_IMPACT,
    requestedBy: user._id,
    reason: String(reason || "").trim(),
    payload: { originalId: original._id, patch, originalSnapshot: original }
  });

  const adj = await FinancialAdjustment.create({ ...base, status: AdjustmentStatuses.PENDING_APPROVAL, approvalRequestId: reqDoc._id });
  await logAudit({ actor: user._id, action: "ADJUSTMENT_REQUESTED", church: churchId, module, entityType, entityId: original._id, meta: { adjustmentId: adj._id, approvalRequestId: reqDoc._id } });
  return { status: "PENDING_APPROVAL", adjustmentId: adj._id, requestId: reqDoc._id };
}

function buildDifference(original, patch) {
  try {
    const diff = {};
    const keys = Object.keys(patch || {});
    for (const k of keys) {
      diff[k] = { from: original?.[k], to: patch?.[k] };
    }
    return diff;
  } catch (_) {
    return null;
  }
}

export async function approveRequest({ requestId, approverId }) {
  const reqDoc = await ApprovalRequest.findById(requestId);
  if (!reqDoc || reqDoc.status !== ApprovalStatuses.PENDING_APPROVAL) {
    throw new Error("Request not found or not pending");
  }
  reqDoc.status = ApprovalStatuses.APPROVED;
  reqDoc.approverId = approverId;
  reqDoc.decidedAt = new Date();
  await reqDoc.save();

  if (reqDoc.actionType === ApprovalActionTypes.ADJUSTMENT_HIGH_IMPACT) {
    const adjustments = await FinancialAdjustment.find({ approvalRequestId: reqDoc._id }).lean();
    const Model = getModelForEntity(reqDoc.module, reqDoc.entityType);
    for (const adj of adjustments) {
      if (Model && adj.originalId && adj.correctedFields) {
        await Model.findByIdAndUpdate(adj.originalId, { $set: adj.correctedFields }).catch(() => {});
      }
    }
    await FinancialAdjustment.updateMany(
      { approvalRequestId: reqDoc._id },
      { $set: { status: AdjustmentStatuses.APPLIED, appliedAt: new Date() } }
    );
  }

  if (reqDoc.actionType === ApprovalActionTypes.BACKDATE_CREATE) {
    const Model = getModelForEntity(reqDoc.module, reqDoc.entityType);
    if (Model && reqDoc.payload?.fullBody) {
      await Model.create({
        ...reqDoc.payload.fullBody,
        church: reqDoc.church,
        createdBy: reqDoc.requestedBy,
        _backdateApprovalId: reqDoc._id
      }).catch(() => {});
    }
  }

  await logAudit({ actor: approverId, action: "APPROVAL_APPROVED", church: reqDoc.church, module: reqDoc.module, entityType: reqDoc.entityType, meta: { requestId } });
  return { status: "APPROVED" };
}

export async function rejectRequest({ requestId, approverId, reason }) {
  const reqDoc = await ApprovalRequest.findById(requestId);
  if (!reqDoc || reqDoc.status !== ApprovalStatuses.PENDING_APPROVAL) {
    throw new Error("Request not found or not pending");
  }
  reqDoc.status = ApprovalStatuses.REJECTED;
  reqDoc.approverId = approverId;
  reqDoc.decidedAt = new Date();
  await reqDoc.save();

  await FinancialAdjustment.updateMany(
    { approvalRequestId: reqDoc._id },
    { $set: { status: AdjustmentStatuses.REJECTED } }
  );

  await logAudit({ actor: approverId, action: "APPROVAL_REJECTED", church: reqDoc.church, module: reqDoc.module, entityType: reqDoc.entityType, meta: { requestId, reason: String(reason || "").trim() } });
  return { status: "REJECTED" };
}
