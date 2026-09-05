import { useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDashboardNavigator } from "../../../shared/hooks/useDashboardNavigator.js";
import PermissionContext from "../../permissions/permission.store.js";
import MemberContext, { MemberProvider } from "../member.store.js";
import { getMember as apiGetMember } from "../services/member.api.js";
import Skeleton from "react-loading-skeleton";

const STATUS_STYLES = {
  active: "border-green-200 bg-green-50 text-green-700",
  dormant: "border-gray-200 bg-gray-100 text-gray-600",
  transferred: "border-blue-200 bg-blue-50 text-blue-700",
  left_church: "border-orange-200 bg-orange-50 text-orange-700",
  deceased: "border-red-200 bg-red-50 text-red-700",
  temporarily_away: "border-yellow-200 bg-yellow-50 text-yellow-700",
  inactive: "border-gray-200 bg-gray-50 text-gray-700",
  visitor: "border-yellow-200 bg-yellow-50 text-yellow-700",
  former: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABELS = {
  left_church: "Left Church",
  temporarily_away: "Temporarily Away",
};

function StatusChip({ value }) {
  const v = String(value || "").toLowerCase().replace(/\s+/g, "_");
  const styles = STATUS_STYLES[v] || "border-gray-200 bg-gray-50 text-gray-700";
  const label = STATUS_LABELS[v] || value || "-";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold ${styles} text-xs`}>
      {label}
    </span>
  );
}

function IdChip({ value }) {
  return (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-semibold text-gray-700 text-xs">
      {value || "-"}
    </span>
  );
}

function FieldRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className="font-semibold text-gray-900 text-right text-sm">{value || "-"}</div>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
        <div className="font-semibold text-gray-900 text-sm">{title}</div>
        {subtitle ? <div className="mt-1 text-gray-500 text-xs">{subtitle}</div> : null}
      </div>
      <div className="p-4 md:p-6 lg:p-8">{children}</div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className="mt-1 font-semibold text-gray-900 text-sm">{value || "-"}</div>
    </div>
  );
}

function BigCard({ title, subtitle, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
        <div className="font-semibold text-gray-900 text-sm">{title}</div>
        {subtitle ? <div className="mt-1 text-gray-500 text-xs">{subtitle}</div> : null}
      </div>
      <div className="p-4 md:p-6 lg:p-8">{children}</div>
    </div>
  );
}

function DataPair({ label, value }) {
  return (
    <div>
      <div className="font-semibold text-gray-500 text-xs">{label}</div>
      <div className="mt-1 font-semibold text-gray-900 text-sm">{value ?? "Not Specified"}</div>
    </div>
  );
}

function MemberDetailsPageInner() {
  const { can } = useContext(PermissionContext) || {};
  const store = useContext(MemberContext);
  const location = useLocation();
  const navigate = useNavigate();
  const { toPage } = useDashboardNavigator();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const memberId = params.get("id");
  const from = location?.state?.from;

  const canEdit = useMemo(() => (typeof can === "function" ? can("members", "update") : false), [can]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [photoEnlarged, setPhotoEnlarged] = useState(false);
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
    if (!items?.length) return <div className="text-gray-600 text-sm">-</div>;
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it?._id || it?.name}
            className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 font-semibold text-gray-700 text-xs"
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
          <h2 className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">Member Details</h2>
          <p className="mt-2 text-gray-600 text-sm">Member profile</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (from === "dashboard") {
                toPage("dashboard");
                return;
              }
              if (from === "members") {
                toPage("members");
                return;
              }
              if (from === "team") {
                const teamId = location?.state?.teamId;
                const fromTab = location?.state?.fromTab || "teams";
                if (teamId) {
                  toPage("team-details", { id: teamId, from: fromTab });
                } else {
                  toPage("outreach", { defaultTab: "teams" });
                }
                return;
              }
              navigate(-1);
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 font-semibold text-gray-700 shadow-sm hover:bg-gray-50 text-sm"
          >
            Back
          </button>

          {canEdit && memberId && (
            <button
              type="button"
              onClick={() => toPage("member-form", { id: memberId })}
              className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 text-sm"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {loading ? (
          <div className="space-y-5 animate-pulse">
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
                <div className="h-6 w-48 rounded bg-gray-200" />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="h-6 w-16 rounded-full bg-gray-200" />
                  <div className="h-6 w-16 rounded-full bg-gray-200" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6 lg:p-8 md:gap-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-12 rounded bg-gray-200" />
                    <div className="mt-1 h-4 w-24 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
                  {[0, 1, 2].map((j) => (
                    <div key={j}>
                      <div className="h-3 w-12 rounded bg-gray-200" />
                      <div className="mt-1 h-4 w-20 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 md:px-5 lg:px-6 py-4">
                <div className="flex items-center gap-4">
                  {(member?.photoUrl || member?.profileImageUrl) ? (
                    <img
                      src={member?.photoUrl || member?.profileImageUrl}
                      alt={name}
                      className="h-16 w-16 shrink-0 rounded-full object-cover border border-gray-200 cursor-zoom-in"
                      onClick={() => setPhotoEnlarged(true)}
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9 text-gray-400">
                        <path d="M12 12c2.67 0 4.8-2.13 4.8-4.8S14.67 2.4 12 2.4 7.2 4.53 7.2 7.2 9.33 12 12 12zm0 2.4c-3.2 0-9.6 1.61-9.6 4.8v2.4h19.2v-2.4c0-3.19-6.4-4.8-9.6-4.8z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-900 md:text-2xl lg:text-3xl text-xl">{name}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-500 text-xs">Member ID:</span>
                      <IdChip value={member?.memberId} />
                      <StatusChip value={member?.status} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 md:p-6 lg:p-8 md:gap-5">
                <DataPair label="Email" value={member?.email} />
                <DataPair label="Phone" value={member?.phoneNumber} />
                <DataPair label="City" value={member?.city} />
                <DataPair label="Joined" value={joined} />
                <DataPair label="Nationality" value={member?.nationality} />
              </div>
            </div>

            <BigCard title="Personal Information" subtitle="Personal details of the member">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
                <DataPair label="First Name" value={member?.firstName} />
                <DataPair label="Last Name" value={member?.lastName} />
                <DataPair label="Gender" value={member?.gender} />
                <DataPair label="Marital Status" value={member?.maritalStatus} />
                <DataPair
                  label="Date of Birth"
                  value={member?.dateOfBirth ? new Date(member.dateOfBirth).toLocaleDateString() : ""}
                />
                <DataPair label="Occupation" value={member?.occupation} />
                <DataPair label="Age Group" value={member?.ageGroup} />
                <DataPair label="Nationality" value={member?.nationality} />
              </div>
            </BigCard>

            <BigCard title="Address Information" subtitle="Address details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-5">
                <DataPair label="Location / Residential Address" value={member?.streetAddress} />
                <DataPair label="City" value={member?.city} />
                <DataPair label="Region" value={member?.region} />
                <DataPair label="Country" value={member?.country} />
              </div>
            </BigCard>

            <BigCard title="Church Information" subtitle="Church membership details">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                  <DataPair label="Member ID" value={<IdChip value={member?.memberId} />} />
                  <DataPair label="Status" value={<StatusChip value={member?.status} />} />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                  <div className="space-y-4">
                    <DataPair label="Church Role" value={member?.churchRole} />
                    <DataPair label="Date Joined" value={joined} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="font-semibold text-gray-500 text-xs">Additional Information</div>
                    <div className="mt-1 text-gray-900 whitespace-pre-wrap text-sm">{member?.note || "Not Specified"}</div>
                  </div>
                </div>
              </div>
            </BigCard>

            <BigCard title="Ministry Information" subtitle="Cells, departments, and groups">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Cells</div>
                  <div className="mt-2">{renderMinistryChips(cells)}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Departments</div>
                  <div className="mt-2">{renderMinistryChips(departments)}</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-500 text-xs">Groups</div>
                  <div className="mt-2">{renderMinistryChips(groups)}</div>
                </div>
              </div>
            </BigCard>

          </>
        )}
      </div>

      {photoEnlarged && (member?.photoUrl || member?.profileImageUrl) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setPhotoEnlarged(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={member?.photoUrl || member?.profileImageUrl} alt={name} className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl" />
            <button type="button" className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md flex items-center justify-center text-gray-700 hover:bg-gray-50" onClick={() => setPhotoEnlarged(false)}>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>
      ) : null}
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
