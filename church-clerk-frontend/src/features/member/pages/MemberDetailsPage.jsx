import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import { getMember as apiGetMember } from "../services/member.api.js";

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase();
  const styles =
    v === "active"
      ? "border-green-200 bg-green-50 text-green-700"
      : v === "inactive"
        ? "border-gray-200 bg-gray-50 text-gray-700"
        : v === "visitor"
          ? "border-yellow-200 bg-yellow-50 text-yellow-700"
          : v === "former"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}>
      {v || "-"}
    </span>
  );
}

function IdChip({ value }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
      {value || "-"}
    </span>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="text-sm font-semibold text-gray-900 text-right">{value || "-"}</div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value || "-"}</div>
    </div>
  );
}

function BigCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DataPair({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value ?? "-"}</div>
    </div>
  );
}

function MemberDetailsPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const memberId = params.get("id");
  const from = location?.state?.from;

  const canEdit = useMemo(() => (typeof can === "function" ? can("members", "update") : false), [can]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [member, setMember] = useState(null);

  useEffect(() => {
    if (!store?.activeChurch) return;
    if (!memberId) {
      setError("Member id is missing");
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setMember(null);

      try {
        const res = await apiGetMember(memberId);
        const payload = res?.data?.data ?? res?.data;
        const m = payload?.member ?? payload;
        if (cancelled) return;
        setMember(m || null);
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load member");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [memberId, store?.activeChurch]);

  const name = member?.fullName || [member?.firstName, member?.lastName].filter(Boolean).join(" ") || "Member Details";

  const address = [member?.streetAddress, member?.city, member?.region, member?.country].filter(Boolean).join(", ");
  const joined = member?.dateJoined ? new Date(member.dateJoined).toLocaleDateString() : "";

  const cells = Array.isArray(member?.cell) ? member.cell : [];
  const departments = Array.isArray(member?.department) ? member.department : [];
  const groups = Array.isArray(member?.group) ? member.group : [];

  const renderMinistryChips = (items) => {
    if (!items?.length) return <div className="text-sm text-gray-600">-</div>;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it?._id || it?.name}
            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-700"
          >
            {it?.name || "-"}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Member Details</h2>
          <p className="mt-2 text-sm text-gray-600">Member profile</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (from === "dashboard") {
                navigate("/dashboard");
                return;
              }
              if (from === "members") {
                navigate("/dashboard?page=members");
                return;
              }
              navigate(-1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            Back
          </button>

          {canEdit && memberId && (
            <button
              type="button"
              onClick={() => navigate(`/dashboard?page=member-form&id=${memberId}`)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">Loading...</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <div className="text-xl font-semibold text-gray-900">{name}</div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-500">Member ID</div>
                    <div className="mt-1 flex items-center gap-2">
                      <IdChip value={member?.memberId} />
                      <StatusChip value={member?.status} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <DataPair label="Email" value={member?.email} />
                <DataPair label="Phone" value={member?.phoneNumber} />
                <DataPair label="City" value={member?.city} />
                <DataPair label="Joined" value={joined} />
                <DataPair label="Nationality" value={member?.nationality} />
              </div>
            </div>

            <BigCard title="Personal Information" subtitle="Personal details of the member">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DataPair label="First Name" value={member?.firstName} />
                <DataPair label="Last Name" value={member?.lastName} />
                <DataPair label="Gender" value={member?.gender} />
                <DataPair label="Marital Status" value={member?.maritalStatus} />
                <DataPair
                  label="Date of Birth"
                  value={member?.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : ""}
                />
                <DataPair label="Occupation" value={member?.occupation} />
                <DataPair label="Nationality" value={member?.nationality} />
              </div>
            </BigCard>

            <BigCard title="Address Information" subtitle="Address details">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DataPair label="Street Address" value={member?.streetAddress} />
                <DataPair label="City" value={member?.city} />
                <DataPair label="Region" value={member?.region} />
                <DataPair label="Country" value={member?.country} />
              </div>
            </BigCard>

            <BigCard title="Church Information" subtitle="Church membership details">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DataPair label="Member ID" value={<IdChip value={member?.memberId} />} />
                <DataPair label="Status" value={<StatusChip value={member?.status} />} />
                <DataPair label="Church Role" value={member?.churchRole} />
                <DataPair label="Date Joined" value={joined} />
              </div>
            </BigCard>

            <BigCard title="Ministry Information" subtitle="Cells, departments, and groups">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold text-gray-500">Cells</div>
                  <div className="mt-2">{renderMinistryChips(cells)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500">Departments</div>
                  <div className="mt-2">{renderMinistryChips(departments)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500">Groups</div>
                  <div className="mt-2">{renderMinistryChips(groups)}</div>
                </div>
              </div>
            </BigCard>

            <BigCard title="Notes" subtitle="Additional information">
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{member?.note || "-"}</div>
            </BigCard>
          </>
        )}
      </div>
    </div>
  );
}

export default function MemberDetailsPage() {
  return (
    <MemberProvider>
      <MemberDetailsPageInner />
    </MemberProvider>
  );
}
