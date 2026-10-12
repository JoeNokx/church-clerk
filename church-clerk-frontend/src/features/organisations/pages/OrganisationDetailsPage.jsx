import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import BackButton from "../../../shared/components/BackButton/index.jsx";
import FilterBar from "../../../shared/components/FilterBar/index.jsx";
import MobileFilterBar from "../../../shared/components/MobileFilterBar/index.jsx";
import DateRangeFilter from "../../../shared/components/DateRangeFilter/index.jsx";
import Pagination from "../../../shared/components/Pagination/index.jsx";

import ChurchContext from "../../church/church.store.js";
import PermissionContext from "../../permissions/permission.store.js";
import { formatMoney } from "../../../shared/utils/formatMoney.js";
import TableKebabMenu from "../../../shared/components/TableKebabMenu/index.jsx";
import PageTabs from "../../../shared/components/PageTabs/index.jsx";
import Button from "../../../shared/components/Button/index.jsx";
import EmptyState from "../../../shared/components/EmptyState/index.jsx";
import { truncateMobileName, truncateDesktopName } from "../../../shared/utils/truncateTableText.js";
import { useGuardedAction } from "../../../shared/context/SubscriptionLockContext.jsx";
import ScopedExpensesTab from "../../../shared/components/ScopedExpensesTab/index.jsx";
import AddLookupValueButton from "../../lookups/components/AddLookupValueButton.jsx";
import { useLookupValues } from "../../lookups/hooks/useLookupValues.js";

import {
  getGroup,
  addGroupMember,
  searchGroupMembersToAdd,
  getGroupMembers,
  updateGroupMemberRole,
  removeGroupMember
} from "../../group/services/group.api.js";

import {
  createGroupIndividualAttendance,
  getGroupIndividualAttendances,
  getGroupIndividualAttendance,
  updateGroupIndividualAttendance,
  deleteGroupIndividualAttendance
} from "../../group/attendance/services/groupAttendance.api.js";
import { createGroupOffering, getGroupOfferings, updateGroupOffering } from "../../group/offering/services/groupOffering.api.js";
import { getOrgContributions, createOrgContribution, updateOrgContribution, deleteOrgContribution } from "../services/organisationContributions.api.js";
import { getOrgCheckInLinkStatus, generateOrgCheckInLink, revokeOrgCheckInLink } from "../services/organisationAttendanceCheckin.api.js";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://app.churchclerkapp.com";

const FALLBACK_SERVICE_TYPES = [
  "Sunday Service",
  "Sunday First Service",
  "Sunday Second Service",
  "Sunday Third Service",
  "Sunday Fourth Service",
  "Sunday Fifth Service",
  "Special Program",
  "Worship Service",
  "Bible Study",
  "Children Service",
  "Midweek Service",
  "Prayer Meeting"
];

import {
  getDepartment,
  addDepartmentMember,
  searchDepartmentMembersToAdd,
  getDepartmentMembers,
  updateDepartmentMemberRole,
  removeDepartmentMember,
  createDepartmentIndividualAttendance,
  getDepartmentIndividualAttendances,
  getDepartmentIndividualAttendance,
  updateDepartmentIndividualAttendance,
  deleteDepartmentIndividualAttendance,
  createDepartmentOffering,
  getDepartmentOfferings,
  updateDepartmentOffering
} from "../../department/services/department.api.js";

import {
  getCell,
  addCellMember,
  searchCellMembersToAdd,
  getCellMembers,
  updateCellMemberRole,
  removeCellMember,
  createCellIndividualAttendance,
  getCellIndividualAttendances,
  getCellIndividualAttendance,
  updateCellIndividualAttendance,
  deleteCellIndividualAttendance,
  createCellOffering,
  getCellOfferings,
  updateCellOffering
} from "../../cell/services/cell.api.js";

import {
  getMinistry,
  addMinistryMember,
  searchMinistryMembersToAdd,
  getMinistryMembers,
  updateMinistryMemberRole,
  removeMinistryMember,
  createMinistryIndividualAttendance,
  getMinistryIndividualAttendances,
  getMinistryIndividualAttendance,
  updateMinistryIndividualAttendance,
  deleteMinistryIndividualAttendance,
  createMinistryOffering,
  getMinistryOfferings,
  updateMinistryOffering
} from "../../ministry/services/ministry.api.js";

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

const PAYMENT_METHODS = ["Cash", "Mobile Money", "Bank Transfer", "Cheque"];

function Chip({ color = "gray", children }) {
  const styles =
    color === "blue"
      ? "bg-blue-100 text-blue-700"
      : color === "orange"
        ? "bg-orange-100 text-orange-700"
        : color === "purple"
          ? "bg-purple-100 text-purple-700"
          : color === "pink"
            ? "bg-pink-100 text-pink-700"
            : "bg-gray-100 text-gray-700";

  return <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${styles} text-xs`}>{children}</span>;
}

function normalizeMeetingSchedule(item) {
  const ms = item?.meetingSchedule;
  if (Array.isArray(ms)) return ms;

  const day = safeText(item?.mainMeetingDay).trim();
  const time = safeText(item?.meetingTime).trim();
  const venue = safeText(item?.meetingVenue).trim();
  if (day && time && venue) {
    return [{ meetingDay: day, meetingTime: time, meetingVenue: venue }];
  }
  return [];
}

function formatTimeWithAmPm(timeStr) {
  if (!timeStr) return "—";
  const t = String(timeStr).trim();
  if (/am|pm/i.test(t)) return t.toUpperCase();
  const parts = t.split(":");
  if (parts.length < 2) return t;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDay(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}

function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
        </div>
        <div className="px-4 md:px-5 lg:px-6 py-4 text-gray-700 text-sm">{message}</div>
        <div className="flex items-center justify-end gap-3 px-4 md:px-5 lg:px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-red-700 text-sm"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SimpleModal({ open, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 md:px-5 lg:px-6 py-4 rounded-t-xl">
          <div className="font-semibold text-gray-900 text-sm">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-4 md:p-6 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function OrganisationDetailsPage() {
  const guarded = useGuardedAction();
  const location = useLocation();
  const { toPage } = useDashboardNavigator();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const churchStore = useContext(ChurchContext);
  const { can } = useContext(PermissionContext) || {};
  const canViewMembers = useMemo(() => (typeof can === "function" ? can("members", "view") : false), [can]);
  const canEdit = churchStore?.activeChurch?._id ? churchStore?.activeChurch?.canEdit !== false : true;
  const currency = String(churchStore?.activeChurch?.currency || "").trim().toUpperCase() || "GHS";

  const id = params.get("id") || "";
  const type = (params.get("type") || "group").toLowerCase();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [entity, setEntity] = useState(null);

  const [activeTab, setActiveTab] = useState("members");

  // members
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [memberPage, setMemberPage] = useState(1);
  const [memberLimit, setMemberLimit] = useState(20);
  const [memberPagination, setMemberPagination] = useState(null);

  const debouncedMemberSearch = useDebouncedValue(memberSearch, 250);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberValue, setAddMemberValue] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("member");
  const [addMemberJoinedAt, setAddMemberJoinedAt] = useState("");
  const [addMemberSaving, setAddMemberSaving] = useState(false);
  const [isSubmittingAddMember, setIsSubmittingAddMember] = useState(false);
  const [addMemberError, setAddMemberError] = useState("");

  const [addMemberCandidatesLoading, setAddMemberCandidatesLoading] = useState(false);
  const [addMemberCandidatesError, setAddMemberCandidatesError] = useState("");
  const [addMemberCandidates, setAddMemberCandidates] = useState([]);
  const [addMemberQueue, setAddMemberQueue] = useState([]);
  const [addMemberSelected, setAddMemberSelected] = useState(null);

  const debouncedAddMemberValue = useDebouncedValue(addMemberValue, 250);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalMemberId, setRoleModalMemberId] = useState("");
  const [roleModalValue, setRoleModalValue] = useState("");
  const [roleModalError, setRoleModalError] = useState("");
  const [isSubmittingRole, setIsSubmittingRole] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMeta, setConfirmMeta] = useState(null); // { kind, payload }

  // attendance
  const [individualAttendanceLoading, setIndividualAttendanceLoading] = useState(false);
  const [individualAttendanceError, setIndividualAttendanceError] = useState("");
  const [individualAttendances, setIndividualAttendances] = useState([]);
  const [individualAttendancePagination, setIndividualAttendancePagination] = useState(null);
  const [attPage, setAttPage] = useState(1);
  const [attLimit, setAttLimit] = useState(20);

  const [individualAttendanceOpen, setIndividualAttendanceOpen] = useState(false);
  const [individualAttendanceMode, setIndividualAttendanceMode] = useState("create");
  const [individualAttendanceEditing, setIndividualAttendanceEditing] = useState(null);
  const [individualAttendanceDate, setIndividualAttendanceDate] = useState("");
  const [individualAttendanceServiceType, setIndividualAttendanceServiceType] = useState("");
  const [individualAttendanceExpected, setIndividualAttendanceExpected] = useState("");
  const [individualServiceTypeFilter, setIndividualServiceTypeFilter] = useState("");
  const [individualAttendanceSaving, setIndividualAttendanceSaving] = useState(false);
  const [isSubmittingIndividualAttendance, setIsSubmittingIndividualAttendance] = useState(false);
  const [individualAttendanceFormError, setIndividualAttendanceFormError] = useState("");

  const [individualMarkingOpen, setIndividualMarkingOpen] = useState(false);
  const [individualMarkingSearch, setIndividualMarkingSearch] = useState("");
  const [individualMarkingPage, setIndividualMarkingPage] = useState(1);
  const [individualMarkingPageSize, setIndividualMarkingPageSize] = useState(20);
  const [individualMarkingSelected, setIndividualMarkingSelected] = useState([]);
  const [individualMarkingAbsent, setIndividualMarkingAbsent] = useState([]);
  const [individualMarkingSaving, setIndividualMarkingSaving] = useState(false);
  const [individualMarkingError, setIndividualMarkingError] = useState("");
  const [individualMarkingSuccess, setIndividualMarkingSuccess] = useState("");

  const [individualLinkModalOpen, setIndividualLinkModalOpen] = useState(false);
  const [individualLinkToken, setIndividualLinkToken] = useState(null);
  const [individualLinkActive, setIndividualLinkActive] = useState(false);
  const [individualLinkLoading, setIndividualLinkLoading] = useState(false);
  const [individualLinkError, setIndividualLinkError] = useState("");
  const [individualLinkCopied, setIndividualLinkCopied] = useState(false);

  const individualCheckInLink = individualLinkToken ? `${BASE_URL}/attend/org/${individualLinkToken}` : null;

  const [individualMembersLoading, setIndividualMembersLoading] = useState(false);
  const [individualMembers, setIndividualMembers] = useState([]); // { id, name, phoneNumber, location }

  const [individualViewLoading, setIndividualViewLoading] = useState(false);
  const [individualViewing, setIndividualViewing] = useState(null);
  const [individualViewError, setIndividualViewError] = useState("");
  const [individualViewTab, setIndividualViewTab] = useState("present");
  const [individualViewPageSize, setIndividualViewPageSize] = useState(20);
  const [individualViewPresentPage, setIndividualViewPresentPage] = useState(1);
  const [individualViewAbsentPage, setIndividualViewAbsentPage] = useState(1);
  const [individualViewUnmarkedPage, setIndividualViewUnmarkedPage] = useState(1);

  const { values: lookupServiceTypes, reload: reloadServiceTypes } = useLookupValues("serviceType");
  const serviceTypeOptions = lookupServiceTypes?.length ? lookupServiceTypes : FALLBACK_SERVICE_TYPES;

  // contributions
  const [contributionLoading, setContributionLoading] = useState(false);
  const [contributionError, setContributionError] = useState("");
  const [contributions, setContributions] = useState([]);
  const [contributionPagination, setContributionPagination] = useState(null);
  const [contributionPage, setContributionPage] = useState(1);
  const [contributionLimit, setContributionLimit] = useState(20);
  const [contributionSearch, setContributionSearch] = useState("");
  const [contributionDateFrom, setContributionDateFrom] = useState("");
  const [contributionDateTo, setContributionDateTo] = useState("");
  const [contributionViewOpen, setContributionViewOpen] = useState(false);
  const [contributionViewRow, setContributionViewRow] = useState(null);

  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionMode, setContributionMode] = useState("create");
  const [contributionEditing, setContributionEditing] = useState(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionDate, setContributionDate] = useState("");
  const [contributionPaymentMethod, setContributionPaymentMethod] = useState("Cash");
  const [contributionNote, setContributionNote] = useState("");
  const [contributionMemberQuery, setContributionMemberQuery] = useState("");
  const [contributionMemberOptions, setContributionMemberOptions] = useState([]);
  const [contributionMemberSearching, setContributionMemberSearching] = useState(false);
  const [contributionSelectedMember, setContributionSelectedMember] = useState(null);
  const [isSubmittingContribution, setIsSubmittingContribution] = useState(false);
  const [contributionFormError, setContributionFormError] = useState("");

  // offerings
  const [offeringLoading, setOfferingLoading] = useState(false);
  const [offeringError, setOfferingError] = useState("");
  const [offerings, setOfferings] = useState([]);
  const [offeringPagination, setOfferingPagination] = useState(null);
  const [offeringPage, setOfferingPage] = useState(1);
  const [offeringLimit, setOfferingLimit] = useState(20);

  const [offeringOpen, setOfferingOpen] = useState(false);
  const [offeringMode, setOfferingMode] = useState("create");
  const [offeringEditing, setOfferingEditing] = useState(null);
  const [offeringDate, setOfferingDate] = useState("");
  const [offeringType, setOfferingType] = useState("");
  const [offeringRecordType, setOfferingRecordType] = useState("offering");
  const [offeringAmount, setOfferingAmount] = useState("");
  const [offeringNote, setOfferingNote] = useState("");
  const [offeringSaving, setOfferingSaving] = useState(false);
  const [isSubmittingOffering, setIsSubmittingOffering] = useState(false);
  const [offeringFormError, setOfferingFormError] = useState("");
  const [offeringSearch, setOfferingSearch] = useState("");
  const [offeringViewOpen, setOfferingViewOpen] = useState(false);
  const [offeringViewRow, setOfferingViewRow] = useState(null);

  const [individualAttendanceSearch, setIndividualAttendanceSearch] = useState("");
  const [individualAttendanceSpeaker, setIndividualAttendanceSpeaker] = useState("");

  const [memberDateFrom, setMemberDateFrom] = useState("");
  const [memberDateTo, setMemberDateTo] = useState("");
  const [indivDateFrom, setIndivDateFrom] = useState("");
  const [indivDateTo, setIndivDateTo] = useState("");
  const [offeringDateFrom, setOfferingDateFrom] = useState("");
  const [offeringDateTo, setOfferingDateTo] = useState("");

  const { values: lookupOfferingTypes, reload: reloadOfferingTypes } = useLookupValues("offeringType");
  const offeringTypeOptions = lookupOfferingTypes?.length
    ? lookupOfferingTypes
    : ["first offering", "second offering", "third offering", "fourth offering", "fifth offering"];

  const title = type === "cell" ? "Cell" : type === "department" ? "Department" : type === "ministry" ? "Ministry" : "Group";

  const loadEntity = useCallback(async () => {
    if (!id) {
      setError("Id is missing");
      return;
    }

    setLoading(true);
    setError("");
    setEntity(null);

    try {
      if (type === "department") {
        const res = await getDepartment(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.department || payload);
      } else if (type === "cell") {
        const res = await getCell(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.cell || payload);
      } else if (type === "ministry") {
        const res = await getMinistry(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.ministry || payload);
      } else {
        const res = await getGroup(id);
        const payload = res?.data?.data ?? res?.data;
        setEntity(payload?.group || payload);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || `Failed to load ${title}`);
    } finally {
      setLoading(false);
    }
  }, [id, type, title]);

  const debouncedOfferingSearch = useDebouncedValue(offeringSearch, 350);
  const debouncedIndividualAttendanceSearch = useDebouncedValue(individualAttendanceSearch, 350);
  const debouncedContributionSearch = useDebouncedValue(contributionSearch, 350);

  const loadMembers = useCallback(async () => {
    if (!id) return;
    setMemberLoading(true);
    setMemberError("");

    const params = {
      page: memberPage,
      limit: memberLimit,
      search: debouncedMemberSearch || "",
      dateFrom: memberDateFrom || undefined,
      dateTo: memberDateTo || undefined
    };

    try {
      let res;
      if (type === "department") res = await getDepartmentMembers(id, params);
      else if (type === "cell") res = await getCellMembers(id, params);
      else if (type === "ministry") res = await getMinistryMembers(id, params);
      else res = await getGroupMembers(id, params);
      const payload = res?.data?.data ?? res?.data;
      setMembers(Array.isArray(payload?.members) ? payload.members : []);
      setMemberPagination(payload?.pagination || null);
    } catch (e) {
      setMemberError(e?.response?.data?.message || e?.message || "Failed to load members");
      setMembers([]);
      setMemberPagination(null);
    } finally {
      setMemberLoading(false);
    }
  }, [id, type, memberPage, memberLimit, debouncedMemberSearch, memberDateFrom, memberDateTo]);

  const loadContributions = useCallback(async () => {
    if (!id) return;
    setContributionLoading(true);
    setContributionError("");

    try {
      const res = await getOrgContributions(type, id, {
        page: contributionPage,
        limit: contributionLimit,
        search: debouncedContributionSearch || undefined,
        dateFrom: contributionDateFrom || undefined,
        dateTo: contributionDateTo || undefined
      });
      const payload = res?.data?.data ?? res?.data;
      setContributions(Array.isArray(payload?.contributions) ? payload.contributions : []);
      setContributionPagination(payload?.pagination || null);
    } catch (e) {
      setContributionError(e?.response?.data?.message || e?.message || "Failed to load contributions");
      setContributions([]);
      setContributionPagination(null);
    } finally {
      setContributionLoading(false);
    }
  }, [id, type, contributionPage, contributionLimit, debouncedContributionSearch, contributionDateFrom, contributionDateTo]);

  const loadIndividualAttendances = useCallback(async (params) => {
    if (!id) return;
    setIndividualAttendanceLoading(true);
    setIndividualAttendanceError("");

    try {
      let res;
      if (type === "department") res = await getDepartmentIndividualAttendances(id, params);
      else if (type === "cell") res = await getCellIndividualAttendances(id, params);
      else if (type === "ministry") res = await getMinistryIndividualAttendances(id, params);
      else res = await getGroupIndividualAttendances(id, params);

      const payload = res?.data?.data ?? res?.data;
      setIndividualAttendances(Array.isArray(payload?.attendances) ? payload.attendances : []);
      setIndividualAttendancePagination(payload?.pagination || null);
    } catch (e) {
      setIndividualAttendanceError(e?.response?.data?.message || e?.message || "Failed to load attendance");
      setIndividualAttendances([]);
      setIndividualAttendancePagination(null);
    } finally {
      setIndividualAttendanceLoading(false);
    }
  }, [id, type]);

  const loadOfferings = useCallback(async () => {
    if (!id) return;
    setOfferingLoading(true);
    setOfferingError("");

    const params = {
      page: offeringPage,
      limit: offeringLimit,
      search: debouncedOfferingSearch || undefined,
      dateFrom: offeringDateFrom || undefined,
      dateTo: offeringDateTo || undefined
    };

    try {
      let res;
      if (type === "department") res = await getDepartmentOfferings(id, params);
      else if (type === "cell") res = await getCellOfferings(id, params);
      else if (type === "ministry") res = await getMinistryOfferings(id, params);
      else res = await getGroupOfferings(id, params);
      const payload = res?.data?.data ?? res?.data;
      setOfferings(Array.isArray(payload?.offerings) ? payload.offerings : []);
      setOfferingPagination(payload?.pagination || null);
    } catch (e) {
      setOfferingError(e?.response?.data?.message || e?.message || "Failed to load offerings");
      setOfferings([]);
      setOfferingPagination(null);
    } finally {
      setOfferingLoading(false);
    }
  }, [id, type, offeringPage, offeringLimit, debouncedOfferingSearch, offeringDateFrom, offeringDateTo]);

  useEffect(() => {
    loadEntity();
  }, [loadEntity]);

  useEffect(() => {
    if (activeTab === "members") loadMembers();
    if (activeTab === "offerings") loadOfferings();
    if (activeTab === "contributions") loadContributions();
  }, [activeTab, loadMembers, loadOfferings, loadContributions]);

  const reloadAttendances = useCallback(() => loadIndividualAttendances({
    page: attPage,
    limit: attLimit,
    search: debouncedIndividualAttendanceSearch || undefined,
    serviceType: individualServiceTypeFilter || undefined,
    dateFrom: indivDateFrom || undefined,
    dateTo: indivDateTo || undefined
  }), [loadIndividualAttendances, attPage, attLimit, debouncedIndividualAttendanceSearch, individualServiceTypeFilter, indivDateFrom, indivDateTo]);

  useEffect(() => {
    if (activeTab !== "attendance") return;
    reloadAttendances();
  }, [activeTab, reloadAttendances]);



  const filteredIndividualAttendances = individualAttendances;


  const goBack = () => {
    const tab = type === "cell" ? "cells" : type === "department" ? "departments" : type === "ministry" ? "ministries" : "groups";
    toPage("organisations", { tab });
  };

  const typeColor = type === "group" ? "blue" : type === "cell" ? "orange" : type === "ministry" ? "pink" : "purple";

  const addMemberSubmit = async (e) => {
    e.preventDefault();
    if (isSubmittingAddMember) return;
    setIsSubmittingAddMember(true);
    setAddMemberError("");

    const entries = [...addMemberQueue];
    if (addMemberSelected && !entries.some((entry) => String(entry?.member?._id) === String(addMemberSelected?._id))) {
      entries.push({ member: addMemberSelected, role: addMemberRole, joinedAt: addMemberJoinedAt });
    }

    if (!entries.length) {
      setIsSubmittingAddMember(false);
      setAddMemberError("Please add at least one member.");
      return;
    }

    setAddMemberSaving(true);
    try {
      for (const entry of entries) {
        const payload = { memberIds: [entry?.member?._id].filter(Boolean), role: entry?.role || "member" };
        if (entry?.joinedAt) payload.joinedAt = entry.joinedAt;

        if (type === "department") {
          await addDepartmentMember(id, payload);
        } else if (type === "cell") {
          await addCellMember(id, payload);
        } else if (type === "ministry") {
          await addMinistryMember(id, payload);
        } else {
          await addGroupMember(id, payload);
        }
      }

      setAddMemberOpen(false);
      setAddMemberValue("");
      setAddMemberRole("member");
      setAddMemberJoinedAt("");
      setAddMemberCandidates([]);
      setAddMemberCandidatesError("");
      setAddMemberQueue([]);
      setAddMemberSelected(null);
      await loadMembers();
    } catch (e2) {
      setAddMemberError(e2?.response?.data?.message || e2?.message || "Failed to add member");
    } finally {
      setAddMemberSaving(false);
      setIsSubmittingAddMember(false);
    }
  };

  const addMemberToQueue = () => {
    setAddMemberError("");
    if (!addMemberSelected?._id) {
      setAddMemberError("Select a member first.");
      return;
    }
    const memberId = String(addMemberSelected._id);
    if (existingMemberIds.has(memberId)) {
      setAddMemberError("This person is already a member.");
      return;
    }
    if (addMemberQueue.some((entry) => String(entry?.member?._id) === memberId)) {
      setAddMemberError("This member is already queued.");
      return;
    }
    setAddMemberQueue((prev) => [...prev, { member: addMemberSelected, role: addMemberRole || "member", joinedAt: addMemberJoinedAt || "" }]);
    setAddMemberSelected(null);
    setAddMemberValue("");
    setAddMemberCandidates([]);
  };

  const loadAllMembersForIndividualAttendance = useCallback(async () => {
    if (!id) return;
    setIndividualMembersLoading(true);
    setIndividualMembers([]);

    try {
      let res;
      const params = { page: 1, limit: 5000, search: "" };
      if (type === "department") res = await getDepartmentMembers(id, params);
      else if (type === "cell") res = await getCellMembers(id, params);
      else if (type === "ministry") res = await getMinistryMembers(id, params);
      else res = await getGroupMembers(id, params);

      const payload = res?.data?.data ?? res?.data;
      const rows = Array.isArray(payload?.members) ? payload.members : [];
      const mapped = rows
        .map((m) => {
          const member = m?.member || {};
          const name = `${safeText(member?.firstName)} ${safeText(member?.lastName)}`.trim();
          const id2 = String(member?._id || "");
          if (!id2) return null;
          return {
            id: id2,
            name: name || "-",
            phoneNumber: member?.phoneNumber || "",
            location: [member?.streetAddress, member?.city].filter(Boolean).join(", ")
          };
        })
        .filter(Boolean);

      mapped.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      setIndividualMembers(mapped);
    } catch {
      setIndividualMembers([]);
    } finally {
      setIndividualMembersLoading(false);
    }
  }, [id, type]);

  const openIndividualAttendanceForm = (mode, row) => {
    setIndividualAttendanceFormError("");
    setIndividualAttendanceMode(mode);
    setIndividualAttendanceEditing(row || null);
    setIndividualAttendanceDate((row?.date || "").slice(0, 10));
    setIndividualAttendanceSpeaker(safeText(row?.mainSpeaker));
    setIndividualAttendanceServiceType(row?.serviceType || "");
    setIndividualAttendanceExpected(row?.expectedCount != null ? String(row.expectedCount) : "");
    setIndividualAttendanceOpen(true);
  };

  const submitIndividualAttendance = async (e) => {
    e.preventDefault();
    if (isSubmittingIndividualAttendance) return;
    setIsSubmittingIndividualAttendance(true);
    setIndividualAttendanceFormError("");

    if (!individualAttendanceDate) {
      setIsSubmittingIndividualAttendance(false);
      setIndividualAttendanceFormError("Date is required");
      return;
    }
    if (!String(individualAttendanceServiceType || "").trim()) {
      setIsSubmittingIndividualAttendance(false);
      setIndividualAttendanceFormError("Service type is required");
      return;
    }

    const payload = {
      date: individualAttendanceDate,
      serviceType: String(individualAttendanceServiceType || "").trim(),
      mainSpeaker: individualAttendanceSpeaker,
      expectedCount: individualAttendanceExpected === "" ? 0 : Math.max(0, Number(individualAttendanceExpected) || 0),
      presentMembers: individualAttendanceMode === "edit"
        ? (Array.isArray(individualAttendanceEditing?.presentMembers)
            ? individualAttendanceEditing.presentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
            : [])
        : [],
      absentMembers: individualAttendanceMode === "edit"
        ? (Array.isArray(individualAttendanceEditing?.absentMembers)
            ? individualAttendanceEditing.absentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
            : [])
        : []
    };

    setIndividualAttendanceSaving(true);
    try {
      if (individualAttendanceMode === "edit") {
        const attendanceId = individualAttendanceEditing?._id;
        if (!attendanceId) return;
        if (type === "department") await updateDepartmentIndividualAttendance(id, attendanceId, payload);
        else if (type === "cell") await updateCellIndividualAttendance(id, attendanceId, payload);
        else if (type === "ministry") await updateMinistryIndividualAttendance(id, attendanceId, payload);
        else await updateGroupIndividualAttendance(id, attendanceId, payload);
        setIndividualAttendanceOpen(false);
        setIndividualAttendanceEditing(null);
        await reloadAttendances();
        if (individualViewing?._id === attendanceId) await openIndividualView({ _id: attendanceId });
      } else {
        let res;
        if (type === "department") res = await createDepartmentIndividualAttendance(id, payload);
        else if (type === "cell") res = await createCellIndividualAttendance(id, payload);
        else if (type === "ministry") res = await createMinistryIndividualAttendance(id, payload);
        else res = await createGroupIndividualAttendance(id, payload);
        const newRecord = res?.data?.attendance;
        setIndividualAttendanceOpen(false);
        setIndividualAttendanceEditing(null);
        await reloadAttendances();
        if (newRecord?._id) await openIndividualView(newRecord);
      }
    } catch (e2) {
      setIndividualAttendanceFormError(e2?.response?.data?.message || e2?.message || "Failed to save attendance");
    } finally {
      setIndividualAttendanceSaving(false);
      setIsSubmittingIndividualAttendance(false);
    }
  };

  const openIndividualView = async (row) => {
    const attendanceId = row?._id;
    if (!attendanceId) return;
    setIndividualViewError("");
    setIndividualViewing(null);
    setIndividualViewTab("present");
    setIndividualViewPresentPage(1);
    setIndividualViewAbsentPage(1);
    setIndividualViewUnmarkedPage(1);
    setIndividualMarkingSearch("");
    setIndividualMarkingPage(1);
    setIndividualMarkingError("");
    setIndividualMarkingSuccess("");
    setIndividualLinkToken(null);
    setIndividualLinkActive(false);
    setIndividualLinkError("");
    setIndividualLinkCopied(false);
    setIndividualViewLoading(true);
    void loadAllMembersForIndividualAttendance();

    try {
      let res;
      if (type === "department") res = await getDepartmentIndividualAttendance(id, attendanceId);
      else if (type === "cell") res = await getCellIndividualAttendance(id, attendanceId);
      else if (type === "ministry") res = await getMinistryIndividualAttendance(id, attendanceId);
      else res = await getGroupIndividualAttendance(id, attendanceId);

      const payload = res?.data?.data ?? res?.data;
      const rec = payload?.attendance || payload;
      setIndividualViewing(rec);
      const presIds = Array.isArray(rec?.presentMembers)
        ? rec.presentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
        : [];
      const absIds = Array.isArray(rec?.absentMembers)
        ? rec.absentMembers.map((x) => String(x?._id || x || "")).filter(Boolean)
        : [];
      setIndividualMarkingSelected(presIds);
      setIndividualMarkingAbsent(absIds);
      try {
        const lRes = await getOrgCheckInLinkStatus(type, id, attendanceId);
        setIndividualLinkToken(lRes?.data?.token || null);
        setIndividualLinkActive(lRes?.data?.active || false);
      } catch { /* check-in link status is optional */ }
    } catch (e) {
      setIndividualViewError(e?.response?.data?.message || e?.message || "Failed to load attendance");
      setIndividualViewing(null);
    } finally {
      setIndividualViewLoading(false);
    }
  };

  const saveIndividualMarking = async () => {
    if (!individualViewing?._id) return;
    setIndividualMarkingSaving(true);
    setIndividualMarkingError("");
    setIndividualMarkingSuccess("");
    try {
      const payload = {
        date: (individualViewing.date || "").slice(0, 10),
        serviceType: individualViewing.serviceType || "",
        mainSpeaker: individualViewing.mainSpeaker || "",
        presentMembers: individualMarkingSelected,
        absentMembers: individualMarkingAbsent
      };
      if (type === "department") await updateDepartmentIndividualAttendance(id, individualViewing._id, payload);
      else if (type === "cell") await updateCellIndividualAttendance(id, individualViewing._id, payload);
      else if (type === "ministry") await updateMinistryIndividualAttendance(id, individualViewing._id, payload);
      else await updateGroupIndividualAttendance(id, individualViewing._id, payload);

      let res;
      if (type === "department") res = await getDepartmentIndividualAttendance(id, individualViewing._id);
      else if (type === "cell") res = await getCellIndividualAttendance(id, individualViewing._id);
      else if (type === "ministry") res = await getMinistryIndividualAttendance(id, individualViewing._id);
      else res = await getGroupIndividualAttendance(id, individualViewing._id);
      const rec = res?.data?.data?.attendance || res?.data?.attendance || res?.data?.data || res?.data;
      setIndividualViewing(rec);
      setIndividualMarkingSuccess("Attendance saved successfully.");
      setTimeout(() => setIndividualMarkingSuccess(""), 3000);
      await reloadAttendances();
    } catch (e) {
      setIndividualMarkingError(e?.response?.data?.message || e?.message || "Failed to save.");
    } finally {
      setIndividualMarkingSaving(false);
    }
  };

  const searchAddMemberCandidates = useCallback(async () => {
    const q = String(debouncedAddMemberValue || "").trim();
    setAddMemberCandidatesError("");

    if (!q) {
      setAddMemberCandidates([]);
      return;
    }

    setAddMemberCandidatesLoading(true);
    try {
      let res;
      if (type === "department") res = await searchDepartmentMembersToAdd(id, { search: q });
      else if (type === "cell") res = await searchCellMembersToAdd(id, { search: q });
      else if (type === "ministry") res = await searchMinistryMembersToAdd(id, { search: q });
      else res = await searchGroupMembersToAdd(id, { search: q });

      const payload = res?.data?.data ?? res?.data;
      const rows = Array.isArray(payload?.members) ? payload.members : [];
      setAddMemberCandidates(rows);
    } catch (e2) {
      setAddMemberCandidatesError(e2?.response?.data?.message || e2?.message || "Failed to search members");
      setAddMemberCandidates([]);
    } finally {
      setAddMemberCandidatesLoading(false);
    }
  }, [debouncedAddMemberValue, id, type]);

  useEffect(() => {
    if (!addMemberOpen) return;
    searchAddMemberCandidates();
  }, [addMemberOpen, searchAddMemberCandidates, debouncedAddMemberValue]);

  const openConfirm = (kind, payload) => {
    setConfirmMeta({ kind, payload });
    setConfirmOpen(true);
  };

  const confirmTitle = useMemo(() => {
    if (confirmMeta?.kind === "remove-member") return "Confirm";
    return "Confirm";
  }, [confirmMeta]);

  const confirmLabel = useMemo(() => {
    if (confirmMeta?.kind === "remove-member") return "Remove";
    return "Delete";
  }, [confirmMeta]);

  const confirmMessage = useMemo(() => {
    if (confirmMeta?.kind === "remove-member") {
      const name = safeText(confirmMeta?.payload?.memberName).trim();
      if (name) return `Are you sure you want to remove ${name}`;
      return "Are you sure you want to remove this member?";
    }
    return "Are you sure you want to proceed?";
  }, [confirmMeta]);

  const confirmAction = async () => {
    const meta = confirmMeta;
    setConfirmOpen(false);
    setConfirmMeta(null);

    if (!meta?.kind) return;

    try {
      if (meta.kind === "remove-member") {
        const memberId = meta.payload?.memberId || meta.payload;
        if (type === "department") await removeDepartmentMember(id, memberId);
        else if (type === "cell") await removeCellMember(id, memberId);
        else if (type === "ministry") await removeMinistryMember(id, memberId);
        else await removeGroupMember(id, memberId);
        await loadMembers();
      }

      if (meta.kind === "delete-individual-attendance") {
        const attendanceId = meta.payload;
        if (type === "department") await deleteDepartmentIndividualAttendance(id, attendanceId);
        else if (type === "cell") await deleteCellIndividualAttendance(id, attendanceId);
        else if (type === "ministry") await deleteMinistryIndividualAttendance(id, attendanceId);
        else await deleteGroupIndividualAttendance(id, attendanceId);
        setIndividualViewing((prev) => (prev?._id === attendanceId ? null : prev));
        await reloadAttendances();
      }

      if (meta.kind === "delete-contribution") {
        await deleteOrgContribution(type, id, meta.payload);
        await loadContributions();
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Action failed");
    }
  };

  const openRoleModal = (memberId, currentRole) => {
    setRoleModalError("");
    setRoleModalMemberId(String(memberId || ""));
    setRoleModalValue(String(currentRole || ""));
    setRoleModalOpen(true);
  };

  const submitRoleModal = async (e) => {
    e.preventDefault();
    if (isSubmittingRole) return;
    setIsSubmittingRole(true);
    setRoleModalError("");
    const memberId = roleModalMemberId;
    const role = String(roleModalValue || "").trim();
    if (!memberId) { setIsSubmittingRole(false); return; }
    if (!role) {
      setIsSubmittingRole(false);
      setRoleModalError("Role is required.");
      return;
    }

    try {
      if (type === "department") await updateDepartmentMemberRole(id, memberId, { role });
      else if (type === "cell") await updateCellMemberRole(id, memberId, { role });
      else if (type === "ministry") await updateMinistryMemberRole(id, memberId, { role });
      else await updateGroupMemberRole(id, memberId, { role });

      await loadMembers();
      setRoleModalOpen(false);
    } catch (e2) {
      setRoleModalError(e2?.response?.data?.message || e2?.message || "Failed to update role");
    } finally {
      setIsSubmittingRole(false);
    }
  };

  const openContributionForm = (mode, row) => {
    setContributionFormError("");
    setContributionMode(mode);
    setContributionEditing(row || null);
    setContributionAmount(row?.amount ?? "");
    setContributionDate((row?.date || "").slice(0, 10));
    setContributionPaymentMethod(row?.paymentMethod || "Cash");
    setContributionNote(safeText(row?.note));
    setContributionMemberQuery("");
    setContributionMemberOptions([]);
    setContributionSelectedMember(row?.member || null);
    setContributionOpen(true);
  };

  const submitContribution = async (e) => {
    e.preventDefault();
    if (isSubmittingContribution) return;
    setIsSubmittingContribution(true);
    setContributionFormError("");

    if (contributionMode !== "edit" && !contributionSelectedMember?._id) {
      setIsSubmittingContribution(false);
      setContributionFormError("Please search and select a member.");
      return;
    }

    if (!contributionDate) {
      setIsSubmittingContribution(false);
      setContributionFormError("Date is required.");
      return;
    }

    if (!contributionAmount || Number(contributionAmount) <= 0) {
      setIsSubmittingContribution(false);
      setContributionFormError("Amount is required.");
      return;
    }

    const payload = {
      amount: Number(contributionAmount),
      date: contributionDate,
      paymentMethod: contributionPaymentMethod,
      note: String(contributionNote || "").trim()
    };

    try {
      if (contributionMode === "edit") {
        const contributionId = contributionEditing?._id;
        if (!contributionId) return;
        await updateOrgContribution(type, id, contributionId, payload);
      } else {
        await createOrgContribution(type, id, { ...payload, memberId: contributionSelectedMember._id });
      }

      setContributionOpen(false);
      setContributionEditing(null);
      await loadContributions();
    } catch (e2) {
      setContributionFormError(e2?.response?.data?.message || e2?.message || "Failed to save contribution");
    } finally {
      setIsSubmittingContribution(false);
    }
  };

  const debouncedContributionMemberQuery = useDebouncedValue(contributionMemberQuery, 250);

  useEffect(() => {
    if (!contributionOpen || contributionMode === "edit") return undefined;

    const q = String(debouncedContributionMemberQuery || "").trim();

    let cancelled = false;
    const id2 = setTimeout(async () => {
      if (!q) {
        if (!cancelled) setContributionMemberOptions([]);
        return;
      }
      setContributionMemberSearching(true);
      try {
        let res;
        const params = { search: q, limit: 8 };
        if (type === "department") res = await getDepartmentMembers(id, params);
        else if (type === "cell") res = await getCellMembers(id, params);
        else if (type === "ministry") res = await getMinistryMembers(id, params);
        else res = await getGroupMembers(id, params);
        const payload = res?.data?.data ?? res?.data;
        const rows = (Array.isArray(payload?.members) ? payload.members : [])
          .map((row) => row?.member)
          .filter((m) => m?._id);
        if (!cancelled) setContributionMemberOptions(rows);
      } catch {
        if (!cancelled) setContributionMemberOptions([]);
      } finally {
        if (!cancelled) setContributionMemberSearching(false);
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(id2); };
  }, [contributionOpen, contributionMode, debouncedContributionMemberQuery, id, type]);

  const openOfferingForm = (mode, row) => {
    setOfferingFormError("");
    setOfferingMode(mode);
    setOfferingEditing(row || null);
    setOfferingDate((row?.date || "").slice(0, 10));
    setOfferingType(safeText(row?.offeringType));
    setOfferingRecordType(row?.recordType === "seed" ? "seed" : "offering");
    setOfferingAmount(row?.amount ?? "");
    setOfferingNote(safeText(row?.note));
    setOfferingOpen(true);
  };

  const submitOffering = async (e) => {
    e.preventDefault();
    if (isSubmittingOffering) return;
    setIsSubmittingOffering(true);
    setOfferingFormError("");

    if (!String(offeringType || "").trim()) {
      setIsSubmittingOffering(false);
      setOfferingFormError(offeringRecordType === "seed" ? "Seed name is required" : "Offering type is required");
      return;
    }

    if (!offeringDate) {
      setIsSubmittingOffering(false);
      setOfferingFormError("date is required");
      return;
    }

    if (!offeringAmount || Number(offeringAmount) <= 0) {
      setIsSubmittingOffering(false);
      setOfferingFormError("amount is required");
      return;
    }

    const payload = {
      date: offeringDate,
      offeringType: String(offeringType || "").trim(),
      recordType: offeringRecordType,
      amount: Number(offeringAmount),
      note: offeringNote
    };

    setOfferingSaving(true);
    try {
      if (offeringMode === "edit") {
        const offeringId = offeringEditing?._id;
        if (!offeringId) return;
        if (type === "department") await updateDepartmentOffering(id, offeringId, payload);
        else if (type === "cell") await updateCellOffering(id, offeringId, payload);
        else if (type === "ministry") await updateMinistryOffering(id, offeringId, payload);
        else await updateGroupOffering(id, offeringId, payload);
      } else {
        if (type === "department") await createDepartmentOffering(id, payload);
        else if (type === "cell") await createCellOffering(id, payload);
        else if (type === "ministry") await createMinistryOffering(id, payload);
        else await createGroupOffering(id, payload);
      }

      setOfferingOpen(false);
      setOfferingEditing(null);
      await loadOfferings();
    } catch (e2) {
      setOfferingFormError(e2?.response?.data?.message || e2?.message || "Failed to save offering");
    } finally {
      setOfferingSaving(false);
      setIsSubmittingOffering(false);
    }
  };

  const totalMembersValue = useMemo(() => {
    if (!entity) return 0;
    if (entity?.totalMembers !== undefined && entity?.totalMembers !== null) {
      const n = Number(entity.totalMembers);
      return Number.isFinite(n) ? n : 0;
    }
    return Array.isArray(members) ? members.length : 0;
  }, [entity, members]);

  const meetingRows = useMemo(() => normalizeMeetingSchedule(entity), [entity]);

  const existingMemberIds = useMemo(
    () => new Set((Array.isArray(members) ? members : []).map((m) => String(m?.member?._id || "")).filter(Boolean)),
    [members]
  );

  return (
    <div className="max-w-6xl -mt-2">
      <BackButton onClick={goBack} className="!mb-0" />

      <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 md:p-6 lg:p-8">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-7 w-52 rounded bg-gray-200" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="mt-1 h-4 w-24 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        ) : !entity ? (
          <div className="text-gray-600 text-sm">No record found.</div>
        ) : (
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between md:gap-6">
            {/* Total members: absolute top-right on mobile, hidden on desktop (rendered in sidebar) */}
            <div className="absolute top-0 right-0 lg:hidden inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
              <span>Total Members:</span>
              <span className="font-semibold text-gray-900">{totalMembersValue}</span>
            </div>

            <div className="flex items-start gap-4 min-w-0 pr-16 lg:pr-0">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip color={typeColor}>{title}</Chip>
                  {entity?.status ? <Chip>{entity.status}</Chip> : null}
                </div>

                <div className="mt-2 font-semibold text-gray-900 truncate md:text-3xl lg:text-4xl text-xl md:text-2xl">{entity?.name || "—"}</div>
                <div className="mt-2 text-gray-600 max-w-3xl whitespace-pre-wrap text-sm">{entity?.description || "—"}</div>

                {meetingRows.length ? (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-gray-600">
                    {meetingRows.map((m, idx) => (
                      <Fragment key={m?._id || idx}>
                        {idx > 0 ? <span className="text-gray-300">|</span> : null}
                        <span className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400 shrink-0"><path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                          <span className="font-medium text-gray-700">{m?.meetingDay || "—"}</span>
                          <span className="text-gray-300">·</span>
                          <span>{formatTimeWithAmPm(m?.meetingTime)}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-gray-400 shrink-0"><path d="M12 21s-7-5.5-7-11a7 7 0 0114 0c0 5.5-7 11-7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>
                          <span>{m?.meetingVenue || "—"}</span>
                        </span>
                      </Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Desktop sidebar: total members */}
            <div className="hidden lg:flex flex-col gap-3 lg:w-auto lg:min-w-44">
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <div className="font-semibold text-gray-500 text-xs">Total Members</div>
                <div className="mt-0.5 font-semibold text-gray-900 text-sm">{totalMembersValue}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <PageTabs
        tabs={[
          { key: "members", label: "Members" },
          { key: "attendance", label: "Attendance" },
          { key: "offerings", label: "Offerings & Seeds" },
          { key: "contributions", label: "Contributions" },
          { key: "expenses", label: "Expenses" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        sticky={false}
        className="mt-6"
      />

      {activeTab === "members" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between md:p-6 lg:p-8">
            {/* Title row with Add Member on same line for mobile */}
            <div className="flex items-center justify-between gap-3 md:block">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Members</div>
                <div className="text-gray-500 text-xs">Manage members in this {title.toLowerCase()}</div>
              </div>
              {canEdit ? (
              <button
                type="button"
                onClick={() => guarded(() => {
                  setAddMemberError("");
                  setAddMemberValue("");
                  setAddMemberRole("member");
                  setAddMemberCandidates([]);
                  setAddMemberCandidatesError("");
                  setAddMemberQueue([]);
                  setAddMemberOpen(true);
                })}
                className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white shadow-sm hover:bg-blue-700 text-xs"
              >
                + Add Member
              </button>
              ) : null}
            </div>

            <FilterBar
              searchValue={memberSearch}
              onSearchChange={(v) => { setMemberSearch(v); setMemberPage(1); }}
              searchPlaceholder="Search members..."
              searchWidth="md:w-[320px]"
              dateFrom={memberDateFrom}
              dateTo={memberDateTo}
              onDateApply={(from, to) => { setMemberDateFrom(from); setMemberDateTo(to); setMemberPage(1); }}
            >
              <MobileFilterBar
                searchValue={memberSearch}
                onSearchChange={(v) => { setMemberSearch(v); setMemberPage(1); }}
                searchPlaceholder="Search members..."
                dateFrom={memberDateFrom}
                dateTo={memberDateTo}
                onDateApply={(from, to) => { setMemberDateFrom(from); setMemberDateTo(to); setMemberPage(1); }}
              />
              {canEdit ? (
              <button
                type="button"
                onClick={() => guarded(() => {
                  setAddMemberError("");
                  setAddMemberValue("");
                  setAddMemberRole("member");
                  setAddMemberCandidates([]);
                  setAddMemberCandidatesError("");
                  setAddMemberQueue([]);
                  setAddMemberOpen(true);
                })}
                className="hidden md:inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
              >
                <span className="leading-none text-lg">+</span>
                Add Member
              </button>
              ) : null}
            </FilterBar>
          </div>

          {memberError ? <div className="p-4 text-red-700 md:p-6 lg:p-8 text-sm">{memberError}</div> : null}

          {memberLoading ? (
            <div className="p-4 space-y-3 animate-pulse md:p-6 lg:p-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <div className="h-11 rounded-full bg-gray-200 md:h-12 md:w-11 w-11 md:w-12" />
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="ml-auto h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              compact
              illustration={memberSearch ? "search" : "members"}
              title={memberSearch ? "No members found" : "No members yet"}
              description={memberSearch
                ? "We couldn't find any members matching your search."
                : "Add members to this ministry to see them here."}
              actionLabel={memberSearch ? "Clear Search" : null}
              onAction={memberSearch ? () => setMemberSearch("") : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Name</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Phone</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Location</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Role</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Joined Date</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {members.map((m, idx) => {
                    const member = m?.member || {};
                    const fullName = `${safeText(member?.firstName)} ${safeText(member?.lastName)}`.trim() || "-";
                    return (
                      <tr key={m?._id || idx} className="max-md:text-xs text-gray-700 text-sm">
                        <td className="sticky left-0 z-10 bg-white max-md:px-3 py-1.5 text-gray-900 whitespace-nowrap px-3 md:px-5" title={fullName}>
                          <span className="sm:hidden">{truncateMobileName(fullName)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(fullName)}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{member?.phoneNumber || "-"}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{[member?.streetAddress, member?.city].filter(Boolean).join(", ") || "-"}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{m?.role || "member"}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{formatDate(m?.joinedAt || m?.createdAt) || "-"}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          <TableKebabMenu items={[
                            canViewMembers && { label: "View", onClick: () => { const memberId = member?._id; if (!memberId) return; toPage("member-details", { id: memberId }); } },
                            canEdit && { label: "Edit Role", onClick: () => guarded(() => openRoleModal(member?._id, m?.role || "member")) },
                            canEdit && { label: "Remove", onClick: () => guarded(() => openConfirm("remove-member", { memberId: member?._id, memberName: `${safeText(member?.firstName)} ${safeText(member?.lastName)}`.trim() })), danger: true }
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {memberPagination ? (
            <div className="border-t border-gray-200">
              <Pagination
                pagination={memberPagination}
                rowsCount={members.length}
                limit={memberLimit}
                onLimitChange={(n) => { setMemberLimit(n); setMemberPage(1); }}
                onPageChange={setMemberPage}
                itemName="members"
                filtered={Boolean(debouncedMemberSearch || memberDateFrom || memberDateTo)}
                loading={memberLoading}
              />
            </div>
          ) : null}

          <SimpleModal
            open={addMemberOpen}
            title="Add Member"
            onClose={() => {
              setAddMemberOpen(false);
              setAddMemberSelected(null);
              setAddMemberQueue([]);
              setAddMemberValue("");
            }}
          >
            <form onSubmit={addMemberSubmit}>
              {addMemberError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{addMemberError}</div>
              ) : null}

              <div>
                <label className="block font-semibold text-gray-500 text-xs">Member</label>
                {addMemberSelected ? (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate text-sm">
                        {`${safeText(addMemberSelected?.firstName)} ${safeText(addMemberSelected?.lastName)}`.trim() || "-"}
                      </div>
                      <div className="text-gray-500 truncate text-xs">{[addMemberSelected?.phoneNumber, [addMemberSelected?.streetAddress, addMemberSelected?.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "-"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddMemberSelected(null)}
                      className="shrink-0 font-semibold text-blue-600 hover:text-blue-700 text-xs"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative mt-2">
                    <input
                      value={addMemberValue}
                      onChange={(e) => setAddMemberValue(e.target.value)}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      placeholder="Search by name, email, or phone"
                    />
                    {String(addMemberValue || "").trim() ? (
                      <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                        {addMemberCandidatesLoading ? (
                          <div className="px-4 py-3 space-y-2 animate-pulse">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="flex items-center gap-3 py-1">
                                <div className="h-6 w-6 rounded-full bg-gray-200" />
                                <div className="h-4 w-24 rounded bg-gray-200" />
                              </div>
                            ))}
                          </div>
                        ) : addMemberCandidatesError ? (
                          <div className="px-4 py-3 text-red-700 text-xs">{addMemberCandidatesError}</div>
                        ) : addMemberCandidates.length === 0 ? (
                          <div className="px-4 py-3 text-gray-500 text-xs">No matching members found.</div>
                        ) : (
                          <div className="divide-y divide-gray-200">
                            {addMemberCandidates.map((m, idx) => {
                              const name = `${safeText(m?.firstName)} ${safeText(m?.lastName)}`.trim() || "-";
                              const memberId = String(m?._id || "");
                              const inQueue = addMemberQueue.some((entry) => String(entry?.member?._id) === memberId);
                              const alreadyMember = existingMemberIds.has(memberId);
                              const disabled = inQueue || alreadyMember;
                              return (
                                <button
                                  type="button"
                                  key={m?._id || idx}
                                  disabled={disabled}
                                  onClick={() => {
                                    setAddMemberSelected(m);
                                    setAddMemberValue("");
                                    setAddMemberCandidates([]);
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 px-4 py-2 transition text-left ${
                                    disabled ? "bg-gray-50 opacity-60 cursor-not-allowed" : "bg-white hover:bg-gray-50 cursor-pointer"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-900 truncate text-sm">{name}</div>
                                    <div className="mt-0.5 text-gray-500 truncate text-xs">{[m?.phoneNumber, [m?.streetAddress, m?.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "-"}</div>
                                  </div>
                                  {alreadyMember ? (
                                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-semibold text-gray-500 text-[10px]">Already a member</span>
                                  ) : inQueue ? (
                                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-600 text-[10px]">Queued</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Role</label>
                  <input
                    value={addMemberRole}
                    onChange={(e) => setAddMemberRole(e.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                    placeholder="e.g. leader"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-500 text-xs">Date</label>
                  <input
                    value={addMemberJoinedAt}
                    onChange={(e) => setAddMemberJoinedAt(e.target.value)}
                    type="date"
                    className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addMemberToQueue}
                disabled={!addMemberSelected}
                className="mt-4 w-full rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Add Another
              </button>

              {addMemberQueue.length ? (
                <div className="mt-4">
                  <div className="font-semibold text-gray-500 text-xs">Queued members ({addMemberQueue.length})</div>
                  <div className="mt-2 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {addMemberQueue.map((entry, idx) => {
                        const m = entry?.member || {};
                        const name = `${safeText(m?.firstName)} ${safeText(m?.lastName)}`.trim() || "-";
                        const location = [m?.streetAddress, m?.city].filter(Boolean).join(", ");
                        const meta = [entry?.role, entry?.joinedAt ? formatDate(entry.joinedAt) : "", location].filter(Boolean).join(" · ");
                        return (
                          <div key={`${m?._id || idx}`} className="flex items-center justify-between gap-3 px-4 py-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate text-sm">{name}</div>
                              <div className="text-gray-500 truncate text-xs">{meta || location || m?.phoneNumber || "-"}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddMemberSelected(m);
                                  setAddMemberRole(entry?.role || "member");
                                  setAddMemberJoinedAt((entry?.joinedAt || "").slice(0, 10));
                                  setAddMemberQueue((prev) => prev.filter((x) => String(x?.member?._id) !== String(m?._id)));
                                }}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                aria-label={`Edit ${name}`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAddMemberQueue((prev) => prev.filter((x) => String(x?.member?._id) !== String(m?._id)))}
                                className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50"
                                aria-label={`Remove ${name}`}
                              >
                                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmittingAddMember}
                  loadingText="Adding..."
                  disabled={!addMemberQueue.length && !addMemberSelected}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {(() => {
                    const total = addMemberQueue.length + (addMemberSelected ? 1 : 0);
                    return total > 1 ? `Add ${total} Members` : "Add";
                  })()}
                </Button>
              </div>
            </form>
          </SimpleModal>
        </div>
      ) : null}

      <SimpleModal open={roleModalOpen} title="Edit Role" onClose={() => setRoleModalOpen(false)}>
        <form onSubmit={submitRoleModal}>
          {roleModalError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{roleModalError}</div>
          ) : null}

          <div>
            <label className="block font-semibold text-gray-500 text-xs">Role</label>
            <input
              value={roleModalValue}
              onChange={(e) => setRoleModalValue(e.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
              placeholder="e.g. leader"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setRoleModalOpen(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmittingRole}
              loadingText="Saving..."
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              Save
            </Button>
          </div>
        </form>
      </SimpleModal>

      {activeTab === "attendance" ? (
        <>
          <div className="mt-6 flex flex-col lg:flex-row gap-4">
            {/* LEFT: attendance log card list */}
            <div className={`lg:w-[380px] lg:shrink-0 ${individualViewing || individualViewLoading ? "hidden lg:block" : "block"}`}>
              <div className="rounded-xl border border-gray-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">Attendance Log</div>
                      <div className="text-gray-500 text-xs hidden md:block">Record and track member presence per meeting</div>
                    </div>
                    {canEdit ? (
                    <button
                      type="button"
                      onClick={() => guarded(() => void openIndividualAttendanceForm("create", null))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700 text-xs"
                    >
                      <span className="leading-none text-base">+</span>
                      Record
                    </button>
                    ) : null}
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    <input
                      value={individualAttendanceSearch}
                      onChange={(e) => { setIndividualAttendanceSearch(e.target.value); setAttPage(1); }}
                      placeholder="Search speaker..."
                      className="h-9 flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-2.5 text-gray-700 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="relative shrink-0 w-[90px]">
                      <select
                        value={individualServiceTypeFilter}
                        onChange={(e) => { setIndividualServiceTypeFilter(e.target.value); setAttPage(1); }}
                        className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-2.5 pr-6 text-gray-700 text-xs outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer truncate"
                      >
                        <option value="">Services</option>
                        {serviceTypeOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute inset-y-0 right-[4px] flex items-center">
                        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-gray-400"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </span>
                    </div>
                    <DateRangeFilter appliedFrom={indivDateFrom} appliedTo={indivDateTo} onApply={(from, to) => { setIndivDateFrom(from); setIndivDateTo(to); setAttPage(1); }} />
                  </div>
                  <MobileFilterBar
                    searchValue={individualAttendanceSearch}
                    onSearchChange={(v) => { setIndividualAttendanceSearch(v); setAttPage(1); }}
                    searchPlaceholder="Search speaker..."
                    dateFrom={indivDateFrom}
                    dateTo={indivDateTo}
                    onDateApply={(from, to) => { setIndivDateFrom(from); setIndivDateTo(to); setAttPage(1); }}
                    className="md:hidden"
                  />
                </div>
                {individualAttendanceError ? (
                  <div className="p-4 text-red-700 text-sm">{individualAttendanceError}</div>
                ) : individualAttendanceLoading ? (
                  <div className="p-4 space-y-2 animate-pulse">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-14 rounded-lg bg-gray-100" />
                    ))}
                  </div>
                ) : filteredIndividualAttendances.length === 0 ? (
                  <EmptyState compact illustration="attendance" title="No attendance records yet" description="Attendance for this ministry will appear here." />
                ) : (
                  <div className="p-2 space-y-1.5 max-h-[600px] overflow-y-auto">
                    {filteredIndividualAttendances.map((r, idx) => {
                      const isSelected = individualViewing?._id === r?._id;
                      return (
                        <div
                          key={r?._id || idx}
                          role="button"
                          tabIndex={0}
                          onClick={() => void openIndividualView(r)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openIndividualView(r); } }}
                          className={`w-full text-left rounded-lg border p-2.5 transition-colors flex items-center gap-2.5 cursor-pointer ${isSelected ? "border-blue-400 bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200"}`}
                        >
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M8 3v3M16 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M6 6h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" /></svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-gray-900 text-xs truncate">{formatDay(r?.date) || "-"}, {formatDate(r?.date)}</div>
                              {canEdit ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); guarded(() => void openIndividualAttendanceForm("edit", r)); }}
                                  className="h-6 w-6 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
                                  aria-label="Edit attendance"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                                </button>
                                {r?.canDelete !== false ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); guarded(() => openConfirm("delete-individual-attendance", r?._id)); }}
                                    className="h-6 w-6 flex items-center justify-center rounded-lg border border-gray-200 text-red-500 hover:bg-red-50"
                                    aria-label="Delete attendance"
                                  >
                                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                  </button>
                                ) : null}
                              </div>
                              ) : null}
                            </div>
                            <div className="text-gray-500 text-[11px] truncate">{r?.serviceType || "Service"} · {r?.mainSpeaker || "No speaker"}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="inline-flex items-center gap-0.5 text-indigo-600 text-[10px] font-semibold">
                                Expected {Number(r?.expectedCount ?? r?.totalMembersSnapshot ?? 0)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-green-600 text-[10px] font-semibold">
                                Present {Number(r?.presentCount ?? 0)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-red-500 text-[10px] font-semibold">
                                Absent {Number(r?.absentCount ?? 0)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-gray-500 text-[10px] font-semibold">
                                Unmarked {Number(r?.unmarkedCount ?? 0)}
                              </span>
                            </div>
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? "text-blue-500" : "text-gray-300"}`}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!individualAttendanceLoading && filteredIndividualAttendances.length > 0 && individualAttendancePagination ? (
                  <div className="border-t border-gray-200">
                    <Pagination
                      pagination={individualAttendancePagination}
                      rowsCount={filteredIndividualAttendances.length}
                      limit={attLimit}
                      onLimitChange={(n) => { setAttLimit(n); setAttPage(1); }}
                      onPageChange={setAttPage}
                      itemName="records"
                      filtered={Boolean(indivDateFrom || indivDateTo || String(individualAttendanceSearch || "").trim())}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {/* RIGHT: details outlet */}
            <div className="flex-1 min-w-0">
              {individualViewing || individualViewLoading ? (
                <button
                  type="button"
                  onClick={() => { setIndividualViewing(null); setIndividualViewError(""); }}
                  className="lg:hidden mb-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Back to list
                </button>
              ) : null}
              {!individualViewing || individualViewError ? (
                <div className="hidden lg:flex rounded-xl border border-gray-200 bg-white p-8 h-full flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="M8 3v3M16 3v3M4 8h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M6 6h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2Z" stroke="currentColor" strokeWidth="1.8" /></svg>
                  </div>
                  <div className="mt-4 font-semibold text-gray-900 text-sm">Select an attendance record</div>
                  <div className="mt-1 text-gray-500 text-xs max-w-xs">Click a card on the left to view its details.</div>
                  {individualViewError ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{individualViewError}</div>
                  ) : null}
                </div>
              ) : individualViewLoading ? (
                <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3 animate-pulse">
                  {[0, 1, 2, 3, 4].map((i) => (<div key={i}><div className="h-3 w-16 rounded bg-gray-200" /><div className="mt-1 h-4 w-24 rounded bg-gray-200" /></div>))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 p-4 md:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{formatDay(individualViewing?.date) || "-"}, {formatDate(individualViewing?.date)}</h3>
                        <div className="text-gray-500 text-xs mt-0.5">{individualViewing?.serviceType || "-"} · {individualViewing?.mainSpeaker || "No speaker"}</div>
                      </div>
                      {canEdit ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => guarded(() => { setIndividualLinkError(""); setIndividualLinkModalOpen(true); })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 font-semibold text-gray-700 hover:bg-gray-50 text-xs"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Generate Link
                        </button>
                        <button
                          type="button"
                          onClick={() => guarded(() => { setIndividualMarkingSearch(""); setIndividualMarkingPage(1); setIndividualMarkingError(""); setIndividualMarkingSuccess(""); setIndividualMarkingOpen(true); })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 font-semibold text-white hover:bg-blue-700 text-xs"
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          Manual Marking
                        </button>
                      </div>
                      ) : null}
                    </div>
                    {/* Counts summary - separate row for breathing room */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
                        {Number(individualViewing?.expectedCount ?? 0)} Expected
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M16 11c1.66 0 3-1.57 3-3.5S17.66 4 16 4s-3 1.57-3 3.5S14.34 11 16 11Z" stroke="currentColor" strokeWidth="2" /><path d="M8 11c1.66 0 3-1.57 3-3.5S9.66 4 8 4 5 5.57 5 7.5 6.34 11 8 11Z" stroke="currentColor" strokeWidth="2" /><path d="M8 20c0-3 1.8-5 4-5s4 2 4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                        {Number(individualViewing?.actualCount ?? individualViewing?.presentCount ?? 0)} Actual
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {Number(individualViewing?.presentCount ?? 0)} Present
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                        {Number(individualViewing?.absentCount ?? 0)} Absent
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        {Number(individualViewing?.unmarkedCount ?? 0)} Unmarked
                      </span>
                    </div>
                  </div>

                  {/* Present/Absent/Unmarked tabs */}
                  <div className="flex gap-1 bg-gray-50 border-b border-gray-200 p-3">
                    {[
                      { key: "present", label: `Present (${Number(individualViewing?.presentCount ?? 0)})` },
                      { key: "absent", label: `Absent (${Number(individualViewing?.absentCount ?? 0)})` },
                      { key: "unmarked", label: `Unmarked (${Number(individualViewing?.unmarkedCount ?? 0)})` }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { setIndividualViewTab(key); setIndividualViewPresentPage(1); setIndividualViewAbsentPage(1); setIndividualViewUnmarkedPage(1); }}
                        className={`rounded-full px-4 py-1 text-xs font-semibold transition-colors ${individualViewTab === key ? "bg-white text-gray-900 border border-gray-200" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div>
                    {(() => {
                      const allPresent = Array.isArray(individualViewing?.presentMembers) ? individualViewing.presentMembers : [];
                      const allAbsent = Array.isArray(individualViewing?.absentMembers) ? individualViewing.absentMembers : [];
                      const presentTotalPages = Math.max(1, Math.ceil(allPresent.length / individualViewPageSize));
                      const presentPaged = allPresent.slice((individualViewPresentPage - 1) * individualViewPageSize, individualViewPresentPage * individualViewPageSize);
                      const absentTotalPages = Math.max(1, Math.ceil(allAbsent.length / individualViewPageSize));
                      const absentPaged = allAbsent.slice((individualViewAbsentPage - 1) * individualViewPageSize, individualViewAbsentPage * individualViewPageSize);
                      const presentIds = new Set(allPresent.map((m) => String(m?._id || "")).filter(Boolean));
                      const absentIds = new Set(allAbsent.map((m) => String(m?._id || "")).filter(Boolean));
                      const unmarkedList = individualMembers.filter((m) => !presentIds.has(String(m?.id || "")) && !absentIds.has(String(m?.id || "")));
                      const unmarkedTotalPages = Math.max(1, Math.ceil(unmarkedList.length / individualViewPageSize));
                      const unmarkedPaged = unmarkedList.slice((individualViewUnmarkedPage - 1) * individualViewPageSize, individualViewUnmarkedPage * individualViewPageSize);
                      return individualViewTab === "present" ? (
                        allPresent.length === 0 ? (
                          <div className="px-4 py-6 text-gray-600 text-sm">No members marked present.</div>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-slate-100">
                                  <tr className="text-left font-semibold text-gray-500 text-xs">
                                    <th className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 whitespace-nowrap">Name</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Phone</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Location</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {presentPaged.map((m, idx) => {
                                    const fullN = `${String(m?.firstName || "")} ${String(m?.lastName || "")}`.trim() || "-";
                                    const fullLoc = [m?.streetAddress, m?.city].filter(Boolean).join(", ").trim() || "";
                                    return (
                                      <tr key={m?._id || idx} className="text-sm cursor-pointer hover:bg-gray-50" onClick={() => { toPage("member-details", { id: m?._id }); }}>
                                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-gray-900 font-semibold whitespace-nowrap" title={fullN}>
                                          <span className="sm:hidden">{truncateMobileName(fullN)}</span>
                                          <span className="hidden sm:inline">{truncateDesktopName(fullN)}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m?.phoneNumber || "-"}</td>
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap" title={fullLoc}>{fullLoc || "-"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="border-t border-gray-200">
                              <Pagination
                                pagination={{
                                  currentPage: individualViewPresentPage,
                                  totalPages: presentTotalPages,
                                  totalResult: allPresent.length,
                                  prevPage: individualViewPresentPage > 1 ? individualViewPresentPage - 1 : null,
                                  nextPage: individualViewPresentPage < presentTotalPages ? individualViewPresentPage + 1 : null
                                }}
                                rowsCount={presentPaged.length}
                                limit={individualViewPageSize}
                                onLimitChange={(n) => { setIndividualViewPageSize(n); setIndividualViewPresentPage(1); setIndividualViewAbsentPage(1); }}
                                onPageChange={setIndividualViewPresentPage}
                                itemName="members"
                              />
                            </div>
                          </>
                        )
                      ) : individualViewTab === "absent" ? (
                        allAbsent.length === 0 ? (
                          <div className="px-4 py-6 text-gray-600 text-sm">No members marked absent.</div>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-slate-100">
                                  <tr className="text-left font-semibold text-gray-500 text-xs">
                                    <th className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 whitespace-nowrap">Name</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Phone</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Location</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {absentPaged.map((m, idx) => {
                                    const fullN = `${String(m?.firstName || "")} ${String(m?.lastName || "")}`.trim() || "-";
                                    const fullLoc = [m?.streetAddress, m?.city].filter(Boolean).join(", ").trim() || "";
                                    return (
                                      <tr key={m?._id || idx} className="text-sm cursor-pointer hover:bg-gray-50" onClick={() => { toPage("member-details", { id: m?._id }); }}>
                                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-gray-900 font-semibold whitespace-nowrap" title={fullN}>
                                          <span className="sm:hidden">{truncateMobileName(fullN)}</span>
                                          <span className="hidden sm:inline">{truncateDesktopName(fullN)}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m?.phoneNumber || "-"}</td>
                                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap" title={fullLoc}>{fullLoc || "-"}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="border-t border-gray-200">
                              <Pagination
                                pagination={{
                                  currentPage: individualViewAbsentPage,
                                  totalPages: absentTotalPages,
                                  totalResult: allAbsent.length,
                                  prevPage: individualViewAbsentPage > 1 ? individualViewAbsentPage - 1 : null,
                                  nextPage: individualViewAbsentPage < absentTotalPages ? individualViewAbsentPage + 1 : null
                                }}
                                rowsCount={absentPaged.length}
                                limit={individualViewPageSize}
                                onLimitChange={(n) => { setIndividualViewPageSize(n); setIndividualViewPresentPage(1); setIndividualViewAbsentPage(1); setIndividualViewUnmarkedPage(1); }}
                                onPageChange={setIndividualViewAbsentPage}
                                itemName="members"
                              />
                            </div>
                          </>
                        )
                      ) : (
                        unmarkedList.length === 0 ? (
                          <div className="px-4 py-6 text-gray-600 text-sm">All members have been marked.</div>
                        ) : (
                          <>
                            <div className="overflow-x-auto">
                              <table className="min-w-full">
                                <thead className="bg-slate-100">
                                  <tr className="text-left font-semibold text-gray-500 text-xs">
                                    <th className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 whitespace-nowrap">Name</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Phone</th>
                                    <th className="px-4 py-2.5 whitespace-nowrap">Location</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {unmarkedPaged.map((m) => (
                                    <tr key={m.id} className="text-sm cursor-pointer hover:bg-gray-50" onClick={() => { toPage("member-details", { id: m.id }); }}>
                                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-gray-900 font-semibold whitespace-nowrap" title={m.name}>
                                        <span className="sm:hidden">{truncateMobileName(m.name)}</span>
                                        <span className="hidden sm:inline">{truncateDesktopName(m.name)}</span>
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m.phoneNumber || "-"}</td>
                                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap" title={m.location}>{m.location || "-"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="border-t border-gray-200">
                              <Pagination
                                pagination={{
                                  currentPage: individualViewUnmarkedPage,
                                  totalPages: unmarkedTotalPages,
                                  totalResult: unmarkedList.length,
                                  prevPage: individualViewUnmarkedPage > 1 ? individualViewUnmarkedPage - 1 : null,
                                  nextPage: individualViewUnmarkedPage < unmarkedTotalPages ? individualViewUnmarkedPage + 1 : null
                                }}
                                rowsCount={unmarkedPaged.length}
                                limit={individualViewPageSize}
                                onLimitChange={(n) => { setIndividualViewPageSize(n); setIndividualViewPresentPage(1); setIndividualViewAbsentPage(1); setIndividualViewUnmarkedPage(1); }}
                                onPageChange={setIndividualViewUnmarkedPage}
                                itemName="members"
                              />
                            </div>
                          </>
                        )
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

              <SimpleModal
                open={individualAttendanceOpen}
                title={individualAttendanceMode === "edit" ? "Edit Attendance" : "Create Attendance"}
                onClose={() => { if (!isSubmittingIndividualAttendance) { setIndividualAttendanceOpen(false); setIndividualAttendanceFormError(""); } }}
              >
                <form onSubmit={submitIndividualAttendance}>
                  {individualAttendanceFormError ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{individualAttendanceFormError}</div>
                  ) : null}
                  {individualAttendanceMode === "create" ? (
                    <p className="mb-5 text-gray-500 text-sm">Start a new attendance session. You can mark members and share a check-in link from the session details.</p>
                  ) : null}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Service Date</label>
                      <input
                        value={individualAttendanceDate}
                        onChange={(e) => setIndividualAttendanceDate(e.target.value)}
                        type="date"
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Main Speaker</label>
                      <input
                        value={individualAttendanceSpeaker}
                        onChange={(e) => setIndividualAttendanceSpeaker(e.target.value)}
                        placeholder="e.g. Pastor John"
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Expected Count</label>
                      <input
                        value={individualAttendanceExpected}
                        onChange={(e) => setIndividualAttendanceExpected(e.target.value)}
                        type="number"
                        min="0"
                        placeholder="e.g. 200"
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-gray-500 text-xs">Service Type</label>
                        <AddLookupValueButton label="+ Add" kind="serviceType" onCreated={async (value) => { await reloadServiceTypes(); setIndividualAttendanceServiceType(value); }} />
                      </div>
                      <select
                        value={individualAttendanceServiceType}
                        onChange={(e) => setIndividualAttendanceServiceType(e.target.value)}
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 md:h-12 text-sm"
                      >
                        <option value="">Select service type</option>
                        {serviceTypeOptions.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
                    <button type="button" onClick={() => { setIndividualAttendanceOpen(false); setIndividualAttendanceFormError(""); }} disabled={isSubmittingIndividualAttendance} className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
                    <Button type="submit" variant="primary" loading={isSubmittingIndividualAttendance} loadingText={individualAttendanceMode === "edit" ? "Updating..." : "Creating..."} className="rounded-lg px-4 py-2 text-sm">
                      {individualAttendanceMode === "edit" ? "Update" : "Create Attendance"}
                    </Button>
                  </div>
                </form>
              </SimpleModal>

              {/* Generate Link modal */}
              {individualLinkModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
                  <div className="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">Attendance Check-In Link</div>
                        <div className="mt-0.5 text-gray-500 text-xs">Share this link so members can mark themselves present.</div>
                      </div>
                      <button type="button" onClick={() => setIndividualLinkModalOpen(false)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </button>
                    </div>
                    <div className="p-5 space-y-4">
                      {individualLinkError ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{individualLinkError}</div>
                      ) : null}
                      {individualLinkLoading ? (
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 w-32 rounded bg-gray-200" />
                          <div className="h-11 rounded-lg bg-gray-200" />
                        </div>
                      ) : individualLinkToken && individualLinkActive ? (
                        <>
                          <div>
                            <div className="font-semibold text-gray-600 text-xs mb-1.5">Shareable Link</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-gray-700 text-xs font-mono break-all">{individualCheckInLink}</div>
                              <button type="button" onClick={() => { if (!individualCheckInLink) return; navigator.clipboard.writeText(individualCheckInLink).then(() => { setIndividualLinkCopied(true); setTimeout(() => setIndividualLinkCopied(false), 2000); }); }} className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-700 hover:bg-gray-50 text-sm">{individualLinkCopied ? "Copied!" : "Copy"}</button>
                            </div>
                          </div>
                          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-700 text-xs">Link is <span className="font-semibold">active</span>. Members can use this link to mark themselves as present.</div>
                          <div className="flex flex-col gap-2 md:flex-row">
                            <button type="button" onClick={() => guarded(async () => { setIndividualLinkError(""); setIndividualLinkLoading(true); try { const r = await generateOrgCheckInLink(type, id, individualViewing?._id); setIndividualLinkToken(r?.data?.token || null); setIndividualLinkActive(true); } catch (e) { setIndividualLinkError(e?.response?.data?.message || "Failed to generate link."); } finally { setIndividualLinkLoading(false); } })} disabled={individualLinkLoading} className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm">Generate New Link</button>
                            <button type="button" onClick={() => guarded(async () => { setIndividualLinkError(""); setIndividualLinkLoading(true); try { await revokeOrgCheckInLink(type, id, individualViewing?._id); setIndividualLinkToken(null); setIndividualLinkActive(false); } catch (e) { setIndividualLinkError(e?.response?.data?.message || "Failed to revoke link."); } finally { setIndividualLinkLoading(false); } })} disabled={individualLinkLoading} className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 text-sm">Revoke Link</button>
                          </div>
                        </>
                      ) : (
                        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center">
                          <div className="text-gray-500 text-sm mb-3">No active check-in link. Generate one to share with members.</div>
                          <button type="button" onClick={() => guarded(async () => { setIndividualLinkError(""); setIndividualLinkLoading(true); try { const r = await generateOrgCheckInLink(type, id, individualViewing?._id); setIndividualLinkToken(r?.data?.token || null); setIndividualLinkActive(true); } catch (e) { setIndividualLinkError(e?.response?.data?.message || "Failed to generate link."); } finally { setIndividualLinkLoading(false); } })} disabled={individualLinkLoading} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm">Generate Link</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Manual Marking Modal */}
              {individualMarkingOpen && individualViewing ? (() => {
                const filteredMarkMembers = individualMembers.filter((m) => {
                  const q = String(individualMarkingSearch || "").trim().toLowerCase();
                  return !q || String(m?.name || "").toLowerCase().includes(q);
                });
                const markTotalPages = Math.max(1, Math.ceil(filteredMarkMembers.length / individualMarkingPageSize));
                const markPaged = filteredMarkMembers.slice((individualMarkingPage - 1) * individualMarkingPageSize, individualMarkingPage * individualMarkingPageSize);
                const allIds = individualMembers.map((m) => String(m.id));
                const allPresent = allIds.length > 0 && allIds.every((mid) => individualMarkingSelected.includes(mid));
                const allAbsent = allIds.length > 0 && allIds.every((mid) => individualMarkingAbsent.includes(mid));
                const unmarkedCount = Math.max(0, individualMembers.length - individualMarkingSelected.length - individualMarkingAbsent.length);
                const togglePresent = (mid) => {
                  setIndividualMarkingSelected((prev) => prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]);
                  setIndividualMarkingAbsent((prev) => prev.filter((x) => x !== mid));
                };
                const toggleAbsent = (mid) => {
                  setIndividualMarkingAbsent((prev) => prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]);
                  setIndividualMarkingSelected((prev) => prev.filter((x) => x !== mid));
                };
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl bg-white shadow-xl overflow-hidden">
                      {/* Modal header */}
                      <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 py-4 shrink-0">
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{formatDay(individualViewing?.date) || "-"}, {formatDate(individualViewing?.date)}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{individualViewing?.serviceType || "-"}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {canEdit ? (
                          <button type="button" onClick={saveIndividualMarking} disabled={individualMarkingSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 text-sm">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            {individualMarkingSaving ? "Saving..." : "Save Attendance"}
                          </button>
                          ) : null}
                          <button type="button" onClick={() => { if (!individualMarkingSaving) setIndividualMarkingOpen(false); }} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shrink-0" aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Error/Success */}
                      {individualMarkingError ? (
                        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{individualMarkingError}</div>
                      ) : null}
                      {individualMarkingSuccess ? (
                        <div className="mx-4 mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 text-sm">{individualMarkingSuccess}</div>
                      ) : null}

                      {/* Counts summary */}
                      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {individualMarkingSelected.length} Present
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                          {individualMarkingAbsent.length} Absent
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {unmarkedCount} Unmarked
                        </span>
                      </div>

                      {/* Search + bulk actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 shrink-0">
                        <input
                          value={individualMarkingSearch}
                          onChange={(e) => { setIndividualMarkingSearch(e.target.value); setIndividualMarkingPage(1); }}
                          placeholder="Search members..."
                          className="h-9 md:w-[320px] w-full rounded-lg border border-gray-200 bg-white px-3 text-gray-700 text-sm"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (allPresent) {
                                setIndividualMarkingSelected([]);
                              } else {
                                setIndividualMarkingSelected(allIds);
                                setIndividualMarkingAbsent([]);
                              }
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${allPresent ? "border-green-500 bg-green-500 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                          >
                            {allPresent ? "Clear Present" : "All Present"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (allAbsent) {
                                setIndividualMarkingAbsent([]);
                              } else {
                                setIndividualMarkingAbsent(allIds);
                                setIndividualMarkingSelected([]);
                              }
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${allAbsent ? "border-red-500 bg-red-500 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                          >
                            {allAbsent ? "Clear Absent" : "All Absent"}
                          </button>
                        </div>
                      </div>

                      {/* Table body - scrollable */}
                      <div className="flex-1 overflow-y-auto">
                        {individualMembersLoading ? (
                          <div className="px-4 py-4 space-y-2 animate-pulse">
                            {[0,1,2,3,4].map((i) => (
                              <div key={i} className="flex items-center gap-3 py-1">
                                <div className="h-4 w-4 rounded bg-gray-200" />
                                <div className="h-4 w-40 rounded bg-gray-200" />
                              </div>
                            ))}
                          </div>
                        ) : individualMembers.length === 0 ? (
                          <div className="px-4 py-4"><EmptyState compact illustration="members" title="No members found" description="Add members to this organisation first." /></div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="min-w-full">
                              <thead className="bg-slate-100 sticky top-0">
                                <tr className="text-left font-semibold text-gray-500 text-xs">
                                  <th className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 whitespace-nowrap">Name</th>
                                  <th className="px-4 py-2.5 whitespace-nowrap">Phone</th>
                                  <th className="px-4 py-2.5 whitespace-nowrap">Location</th>
                                  <th className="px-4 py-2.5 whitespace-nowrap text-center">Present</th>
                                  <th className="px-4 py-2.5 whitespace-nowrap text-center">Absent</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {markPaged.map((m) => {
                                  const mid = String(m.id);
                                  const isPresent = individualMarkingSelected.includes(mid);
                                  const isAbsent = individualMarkingAbsent.includes(mid);
                                  return (
                                    <tr key={m.id} className="hover:bg-gray-50 text-sm">
                                      <td className="sticky left-0 z-10 bg-white px-4 py-2.5 whitespace-nowrap" title={m.name}>
                                        <span className={isPresent ? "text-green-700 font-semibold" : isAbsent ? "text-red-600 font-semibold" : "text-gray-900"}>
                                          <span className="sm:hidden">{truncateMobileName(m.name)}</span>
                                          <span className="hidden sm:inline">{truncateDesktopName(m.name)}</span>
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m.phoneNumber || "-"}</td>
                                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{m.location || "-"}</td>
                                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); togglePresent(mid); }}
                                          aria-label={isPresent ? "Marked present - click to unmark" : "Mark as present"}
                                          className={`cck-allow-icons h-8 w-8 inline-flex items-center justify-center rounded-full border-2 transition-all ${isPresent ? "border-green-500 bg-green-500 text-white shadow-sm" : "border-gray-300 bg-white text-transparent hover:border-green-400 hover:bg-green-50"}`}
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                      </td>
                                      <td className="px-4 py-2.5 whitespace-nowrap text-center">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); toggleAbsent(mid); }}
                                          aria-label={isAbsent ? "Marked absent - click to unmark" : "Mark as absent"}
                                          className={`cck-allow-icons h-8 w-8 inline-flex items-center justify-center rounded-full border-2 transition-all ${isAbsent ? "border-red-500 bg-red-500 text-white shadow-sm" : "border-gray-300 bg-white text-transparent hover:border-red-400 hover:bg-red-50"}`}
                                        >
                                          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Pagination footer */}
                      {individualMembers.length > 0 ? (
                        <div className="border-t border-gray-200 shrink-0">
                          <Pagination
                            pagination={{
                              currentPage: individualMarkingPage,
                              totalPages: markTotalPages,
                              totalResult: filteredMarkMembers.length,
                              prevPage: individualMarkingPage > 1 ? individualMarkingPage - 1 : null,
                              nextPage: individualMarkingPage < markTotalPages ? individualMarkingPage + 1 : null
                            }}
                            rowsCount={markPaged.length}
                            limit={individualMarkingPageSize}
                            onLimitChange={(n) => { setIndividualMarkingPageSize(n); setIndividualMarkingPage(1); }}
                            onPageChange={setIndividualMarkingPage}
                            itemName="members"
                            filtered={Boolean(String(individualMarkingSearch || "").trim())}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })() : null}

        </>
      ) : null}

      {activeTab === "offerings" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 justify-between w-full md:w-auto md:block">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Offerings & Seeds</div>
                <div className="text-gray-500 text-xs">Record {title.toLowerCase()} offerings</div>
              </div>
              {canEdit ? (
              <button
                type="button"
                onClick={() => guarded(() => openOfferingForm("create", null))}
                className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
              >
                <span className="leading-none text-lg">+</span>
                Add Offering
              </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 items-end w-full md:w-auto">
              <FilterBar
                searchValue={offeringSearch}
                onSearchChange={(v) => { setOfferingSearch(v); setOfferingPage(1); }}
                searchPlaceholder="Search recorded by"
                searchWidth="md:w-[320px]"
                dateFrom={offeringDateFrom}
                dateTo={offeringDateTo}
                onDateApply={(from, to) => { setOfferingDateFrom(from); setOfferingDateTo(to); setOfferingPage(1); }}
              >
                {canEdit ? (
                <button
                  type="button"
                  onClick={() => guarded(() => openOfferingForm("create", null))}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
                >
                  <span className="leading-none text-lg">+</span>
                  Add Offering
                </button>
                ) : null}
              </FilterBar>
              <MobileFilterBar
                searchValue={offeringSearch}
                onSearchChange={(v) => { setOfferingSearch(v); setOfferingPage(1); }}
                searchPlaceholder="Search recorded by"
                dateFrom={offeringDateFrom}
                dateTo={offeringDateTo}
                onDateApply={(from, to) => { setOfferingDateFrom(from); setOfferingDateTo(to); setOfferingPage(1); }}
                className="w-full"
              />
            </div>
          </div>

          {offeringError ? <div className="p-4 text-red-700 md:p-6 lg:p-8 text-sm">{offeringError}</div> : null}

          {offeringLoading ? (
            <div className="p-4 space-y-3 animate-pulse md:p-6 lg:p-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : offerings.length === 0 ? (
            <EmptyState compact illustration="offering" title="No offerings yet" description="Offerings recorded for this ministry will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date Collected</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Type</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Recorded By</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {offerings.map((r, idx) => (
                    <tr key={r?._id || idx} className="max-md:text-xs text-gray-700 text-sm">
                      <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{formatDate(r?.date)}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-700 whitespace-nowrap px-4 md:px-6" title={r?.offeringType || ""}>{r?.recordType === "seed" ? "Seed" : "Offering"}</td>
                      <td className="max-md:px-4 py-1.5 text-blue-700 whitespace-nowrap px-4 md:px-6">{formatMoney(r?.amount || 0, currency)}</td>
                      <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6" title={r?.createdBy?.fullName || "—"}>
                        <span className="sm:hidden">{truncateMobileName(r?.createdBy?.fullName || "—")}</span>
                        <span className="hidden sm:inline">{truncateDesktopName(r?.createdBy?.fullName || "—")}</span>
                      </td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        {r?.referenceId ? (
                          <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{r.referenceId}</span>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                        <TableKebabMenu items={[
                          { label: "View", onClick: () => { setOfferingViewRow(r); setOfferingViewOpen(true); } },
                          canEdit && { label: "Edit", onClick: () => guarded(() => openOfferingForm("edit", r)) }
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {offeringPagination ? (
            <div className="border-t border-gray-200">
              <Pagination
                pagination={offeringPagination}
                rowsCount={offerings.length}
                limit={offeringLimit}
                onLimitChange={(n) => { setOfferingLimit(n); setOfferingPage(1); }}
                onPageChange={setOfferingPage}
                itemName="records"
                filtered={Boolean(debouncedOfferingSearch || offeringDateFrom || offeringDateTo)}
                loading={offeringLoading}
              />
            </div>
          ) : null}

          {offeringViewOpen && offeringViewRow && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
              <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm font-mono">{offeringViewRow?.referenceId || "Offering Details"}</div>
                  </div>
                  <button type="button" onClick={() => { setOfferingViewOpen(false); setOfferingViewRow(null); }} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div className="p-4 md:p-6 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><div className="font-semibold text-gray-500 text-xs">Record Type</div><div className="mt-1 text-gray-900">{offeringViewRow?.recordType === "seed" ? "Seed" : "Offering"}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Amount</div><div className="mt-1 text-orange-600 font-semibold">{formatMoney(offeringViewRow?.amount || 0, currency)}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">{offeringViewRow?.recordType === "seed" ? "Seed Name" : "Offering Type"}</div><div className="mt-1 text-gray-900">{offeringViewRow?.offeringType || "-"}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Date Collected</div><div className="mt-1 text-gray-900">{formatDate(offeringViewRow?.date)}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Date Recorded</div><div className="mt-1 text-gray-900">{formatDate(offeringViewRow?.createdAt)}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Recorded By</div><div className="mt-1 text-gray-900">{offeringViewRow?.createdBy?.fullName || "-"}</div></div>
                  </div>
                  <div><div className="font-semibold text-gray-500 text-xs">Note</div><div className="mt-1 text-gray-700">{offeringViewRow?.note || "-"}</div></div>
                </div>
              </div>
            </div>
          )}

          {offeringOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
                  <div className="font-semibold text-gray-900 text-sm">{offeringMode === "edit" ? "Edit Offering" : "Add Offering"}</div>
                  <button
                    type="button"
                    onClick={() => setOfferingOpen(false)}
                    className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>

                <form onSubmit={submitOffering} className="p-4 md:p-6 lg:p-8">
                  {offeringFormError ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{offeringFormError}</div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-gray-500 text-xs">Record Type</label>
                      <div className="mt-2 flex gap-2">
                        {[
                          { key: "offering", label: "Offering" },
                          { key: "seed", label: "Seed" }
                        ].map(({ key, label }) => (
                          <label
                            key={key}
                            className={`flex-1 flex items-center justify-center gap-2 rounded-[10px] md:rounded-lg border px-4 py-2.5 cursor-pointer text-sm font-semibold transition-colors ${
                              offeringRecordType === key
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="radio"
                              name="orgOfferingRecordType"
                              value={key}
                              checked={offeringRecordType === key}
                              onChange={() => { setOfferingRecordType(key); setOfferingType(""); }}
                              className="h-4 w-4 accent-blue-600"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      {offeringRecordType === "seed" ? (
                        <>
                          <label className="block font-semibold text-gray-500 text-xs">Seed Name</label>
                          <input
                            value={offeringType}
                            onChange={(e) => setOfferingType(e.target.value)}
                            placeholder="e.g. Building fund seed"
                            className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                          />
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <label className="block font-semibold text-gray-500 text-xs">Offering Type</label>
                            <AddLookupValueButton
                              label="Add offering type"
                              kind="offeringType"
                              onCreated={async (value) => {
                                await reloadOfferingTypes();
                                setOfferingType(value);
                              }}
                            />
                          </div>
                          <select
                            value={offeringType}
                            onChange={(e) => setOfferingType(e.target.value)}
                            className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                          >
                            <option value="">Select offering type</option>
                            {offeringTypeOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Date Collected</label>
                      <input
                        value={offeringDate}
                        onChange={(e) => setOfferingDate(e.target.value)}
                        type="date"
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Amount</label>
                      <input
                        value={offeringAmount}
                        onChange={(e) => setOfferingAmount(e.target.value)}
                        type="number"
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
                      <input
                        value={offeringNote}
                        onChange={(e) => setOfferingNote(e.target.value.slice(0, 500))}
                        maxLength={500}
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                        placeholder="e.g. Extra details about this record (max 500 chars)"
                      />
                      <div className="mt-1 text-right text-gray-400 text-xs">{offeringNote.length}/500 chars</div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setOfferingOpen(false)}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmittingOffering}
                      loadingText={offeringMode === "edit" ? "Updating..." : "Saving..."}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {offeringMode === "edit" ? "Update" : "Save"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "contributions" ? (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-3 justify-between w-full md:w-auto md:block">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Contributions</div>
                <div className="text-gray-500 text-xs">Record member contributions for this {title.toLowerCase()}</div>
              </div>
              {canEdit ? (
              <button
                type="button"
                onClick={() => guarded(() => openContributionForm("create", null))}
                className="md:hidden inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
              >
                <span className="leading-none text-lg">+</span>
                Add Contribution
              </button>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 items-end w-full md:w-auto">
              <FilterBar
                searchValue={contributionSearch}
                onSearchChange={(v) => { setContributionSearch(v); setContributionPage(1); }}
                searchPlaceholder="Search member..."
                searchWidth="md:w-[160px]"
                dateFrom={contributionDateFrom}
                dateTo={contributionDateTo}
                onDateApply={(from, to) => { setContributionDateFrom(from); setContributionDateTo(to); setContributionPage(1); }}
              >
                {canEdit ? (
                <button
                  type="button"
                  onClick={() => guarded(() => openContributionForm("create", null))}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm h-10"
                >
                  <span className="leading-none text-lg">+</span>
                  Add Contribution
                </button>
                ) : null}
              </FilterBar>
              <MobileFilterBar
                searchValue={contributionSearch}
                onSearchChange={(v) => { setContributionSearch(v); setContributionPage(1); }}
                searchPlaceholder="Search member..."
                dateFrom={contributionDateFrom}
                dateTo={contributionDateTo}
                onDateApply={(from, to) => { setContributionDateFrom(from); setContributionDateTo(to); setContributionPage(1); }}
                className="w-full"
              />
            </div>
          </div>

          {contributionError ? <div className="p-4 text-red-700 md:p-6 lg:p-8 text-sm">{contributionError}</div> : null}

          {contributionLoading ? (
            <div className="p-4 space-y-3 animate-pulse md:p-6 lg:p-8">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="h-4 w-16 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : contributions.length === 0 ? (
            <EmptyState compact illustration="offering" title="No contributions yet" description={`Contributions recorded for this ${title.toLowerCase()} will appear here.`} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr className="text-left md:max-lg:text-sm font-semibold text-gray-500 text-xs">
                    <th className="sticky left-0 z-20 bg-slate-100 max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Member</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Amount</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Date</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Method</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Recorded By</th>
                    <th className="max-md:px-4 py-2 whitespace-nowrap px-4 md:px-6">Ref ID</th>
                    <th className="max-md:px-4 py-2 text-right whitespace-nowrap px-4 md:px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {contributions.map((r, idx) => {
                    const memberName = `${safeText(r?.member?.firstName)} ${safeText(r?.member?.lastName)}`.trim() || "-";
                    return (
                      <tr key={r?._id || idx} className="max-md:text-xs text-gray-700 text-sm">
                        <td className="sticky left-0 z-10 bg-white max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6" title={memberName}>
                          <span className="sm:hidden">{truncateMobileName(memberName)}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(memberName)}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 text-blue-700 whitespace-nowrap px-4 md:px-6">{formatMoney(r?.amount || 0, currency)}</td>
                        <td className="max-md:px-4 py-1.5 text-gray-900 whitespace-nowrap px-4 md:px-6">{formatDate(r?.date)}</td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">{r?.paymentMethod || "-"}</td>
                        <td className="max-md:px-4 py-1.5 text-gray-600 whitespace-nowrap px-4 md:px-6" title={r?.createdBy?.fullName || "—"}>
                          <span className="sm:hidden">{truncateMobileName(r?.createdBy?.fullName || "—")}</span>
                          <span className="hidden sm:inline">{truncateDesktopName(r?.createdBy?.fullName || "—")}</span>
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          {r?.referenceId ? (
                            <span className="font-mono text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">{r.referenceId}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="max-md:px-4 py-1.5 whitespace-nowrap px-4 md:px-6">
                          <TableKebabMenu items={[
                            { label: "View", onClick: () => { setContributionViewRow(r); setContributionViewOpen(true); } },
                            canEdit && { label: "Edit", onClick: () => guarded(() => openContributionForm("edit", r)) },
                            canEdit && { label: "Delete", onClick: () => guarded(() => openConfirm("delete-contribution", r?._id)), danger: true }
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {contributionPagination ? (
            <div className="border-t border-gray-200">
              <Pagination
                pagination={contributionPagination}
                rowsCount={contributions.length}
                limit={contributionLimit}
                onLimitChange={(n) => { setContributionLimit(n); setContributionPage(1); }}
                onPageChange={setContributionPage}
                itemName="contributions"
                filtered={Boolean(debouncedContributionSearch || contributionDateFrom || contributionDateTo)}
                loading={contributionLoading}
              />
            </div>
          ) : null}

          {contributionViewOpen && contributionViewRow ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
              <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 md:px-6 py-4">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{`${safeText(contributionViewRow?.member?.firstName)} ${safeText(contributionViewRow?.member?.lastName)}`.trim() || "Contribution"}</div>
                    <div className="mt-0.5 font-mono text-xs text-gray-500">{contributionViewRow?.referenceId || ""}</div>
                  </div>
                  <button type="button" onClick={() => { setContributionViewOpen(false); setContributionViewRow(null); }} className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50" aria-label="Close">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>
                <div className="p-4 md:p-6 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><div className="font-semibold text-gray-500 text-xs">Amount</div><div className="mt-1 text-orange-600 font-semibold">{formatMoney(contributionViewRow?.amount || 0, currency)}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Payment Method</div><div className="mt-1 text-gray-900">{contributionViewRow?.paymentMethod || "-"}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Date Received</div><div className="mt-1 text-gray-900">{formatDate(contributionViewRow?.date)}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Date Recorded</div><div className="mt-1 text-gray-900">{formatDate(contributionViewRow?.createdAt)}</div></div>
                    <div><div className="font-semibold text-gray-500 text-xs">Recorded By</div><div className="mt-1 text-gray-900">{contributionViewRow?.createdBy?.fullName || "-"}</div></div>
                  </div>
                  <div><div className="font-semibold text-gray-500 text-xs">Note</div><div className="mt-1 text-gray-700">{contributionViewRow?.note || "-"}</div></div>
                </div>
              </div>
            </div>
          ) : null}

          {contributionOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 overflow-y-auto">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
                  <div className="font-semibold text-gray-900 text-sm">{contributionMode === "edit" ? "Edit Contribution" : "Add Contribution"}</div>
                  <button
                    type="button"
                    onClick={() => setContributionOpen(false)}
                    className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:h-12 md:w-12"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>

                <form onSubmit={submitContribution} className="p-4 md:p-6 lg:p-8">
                  {contributionFormError ? (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{contributionFormError}</div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                    <div className="md:col-span-2">
                      <label className="block font-semibold text-gray-500 text-xs">Member</label>
                      {contributionMode === "edit" ? (
                        <div className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm">
                          {`${safeText(contributionSelectedMember?.firstName)} ${safeText(contributionSelectedMember?.lastName)}`.trim() || "-"}
                        </div>
                      ) : contributionSelectedMember ? (
                        <div className="mt-2 flex items-center justify-between gap-3 rounded-[10px] md:rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate text-sm">{`${safeText(contributionSelectedMember?.firstName)} ${safeText(contributionSelectedMember?.lastName)}`.trim() || "-"}</div>
                            <div className="text-gray-500 truncate text-xs">{contributionSelectedMember?.phoneNumber || ""}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setContributionSelectedMember(null)}
                            className="shrink-0 font-semibold text-blue-700 hover:underline text-xs"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            value={contributionMemberQuery}
                            onChange={(e) => setContributionMemberQuery(e.target.value)}
                            className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                            placeholder="Search by name, email, or phone"
                          />
                          {String(contributionMemberQuery || "").trim() ? (
                            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-gray-200">
                              {contributionMemberSearching ? (
                                <div className="px-4 py-3 text-gray-600 text-sm">Searching...</div>
                              ) : contributionMemberOptions.length ? (
                                <div className="divide-y divide-gray-200">
                                  {contributionMemberOptions.map((m, idx) => {
                                    const name = `${safeText(m?.firstName)} ${safeText(m?.lastName)}`.trim() || "-";
                                    return (
                                      <button
                                        key={m?._id || idx}
                                        type="button"
                                        onClick={() => { setContributionSelectedMember(m); setContributionMemberOptions([]); setContributionMemberQuery(""); }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-50"
                                      >
                                        <div className="font-semibold text-gray-900 truncate text-sm">{name}</div>
                                        <div className="text-gray-500 truncate text-xs">{[m?.phoneNumber, m?.email].filter(Boolean).join(" • ") || "—"}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="px-4 py-3 text-gray-600 text-sm">No members found.</div>
                              )}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Payment Method</label>
                      <select
                        value={contributionPaymentMethod}
                        onChange={(e) => setContributionPaymentMethod(e.target.value)}
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Amount</label>
                      <input
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value)}
                        type="number"
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-500 text-xs">Date Received</label>
                      <input
                        value={contributionDate}
                        onChange={(e) => setContributionDate(e.target.value)}
                        type="date"
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-semibold text-gray-500 text-xs">Note (optional)</label>
                      <input
                        value={contributionNote}
                        onChange={(e) => setContributionNote(e.target.value.slice(0, 500))}
                        maxLength={500}
                        className="mt-2 h-[44px] w-full rounded-[10px] md:rounded-lg border border-gray-200 bg-white px-3 text-[14px] text-gray-700 md:h-12 lg:h-11 lg:text-sm"
                        placeholder="e.g. Monthly dues (max 500 chars)"
                      />
                      <div className="mt-1 text-right text-gray-400 text-xs">{contributionNote.length}/500 chars</div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setContributionOpen(false)}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmittingContribution}
                      loadingText={contributionMode === "edit" ? "Updating..." : "Saving..."}
                      className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {contributionMode === "edit" ? "Update" : "Save"}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "expenses" ? (
        <ScopedExpensesTab scope={type} entityId={id} entityLabel={title.toLowerCase()} />
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmMeta(null);
        }}
        onConfirm={confirmAction}
      />
    </div>
  );
}

export default OrganisationDetailsPage;
