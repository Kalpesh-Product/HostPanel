import React, { useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { assignResourceSeat, getResourceSeats, releaseResourceSeatAssignment } from "../../../services/resources";

// Multi-select assign/release for an Open Desk / Cabin Desk resource. Any
// number of vacant seats can be checked and assigned to one tenant or
// department together (e.g. 20 of 40 open desks in one action); any number of
// assigned seats can be checked and released together, independent of who
// each was assigned to.
export default function SeatAssignmentModal({ resource, tenants = [], departments = [], onClose, onChanged }) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState(() => new Set());
  const [assignmentType, setAssignmentType] = useState("tenant");
  const [tenantCompanyId, setTenantCompanyId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resourceId = resource ? String(resource.recordId || resource.id) : "";
  const isOpen = Boolean(resource);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getResourceSeats(resourceId);
        if (!alive) return;
        setSeats(res?.data?.data?.seats || []);
      } catch (e) {
        if (alive) setError(e?.message || "Failed to load seats.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [isOpen, resourceId]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedSeatNumbers(new Set());
      setTenantCompanyId("");
      setDepartmentId("");
      setAssignmentType("tenant");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const assignedCount = seats.filter((s) => !s.isVacant).length;
  const selectedSeats = seats.filter((s) => selectedSeatNumbers.has(s.seatNumber));
  const selectedVacantSeats = selectedSeats.filter((s) => s.isVacant);
  const selectedAssignedSeats = selectedSeats.filter((s) => !s.isVacant);

  const toggleSeat = (seatNumber) => {
    setSelectedSeatNumbers((current) => {
      const next = new Set(current);
      if (next.has(seatNumber)) next.delete(seatNumber);
      else next.add(seatNumber);
      return next;
    });
  };

  const refreshSeats = async () => {
    const res = await getResourceSeats(resourceId);
    setSeats(res?.data?.data?.seats || []);
  };

  const handleAssignSelected = async () => {
    const company = tenants.find((t) => String(t.recordId || t.id) === String(tenantCompanyId)) || null;
    const department = departments.find((d) => String(d.id || d.name) === String(departmentId)) || null;
    if (assignmentType === "tenant" ? !company : !department) {
      toast.error(assignmentType === "tenant" ? "Choose a tenant company." : "Choose a department.");
      return;
    }
    if (selectedVacantSeats.length === 0) return;

    const payload = assignmentType === "tenant"
      ? { assignmentType: "tenant", tenantCompanyId: company.recordId || company.id || "", tenantCompanyName: company.companyName || company.name || "" }
      : { assignmentType: "department", departmentId: String(department.id || department.name).trim(), departmentName: String(department.name || department.id).trim() };

    setSaving(true); setError("");
    try {
      for (const seat of selectedVacantSeats) {
        await assignResourceSeat(resourceId, seat.seatNumber, payload);
      }
      await refreshSeats();
      await onChanged?.();
      setSelectedSeatNumbers(new Set());
      toast.success(`${selectedVacantSeats.length} seat${selectedVacantSeats.length === 1 ? "" : "s"} assigned.`);
    } catch (e) {
      setError(e?.message || "Failed to assign seats.");
      toast.error(e?.message || "Failed to assign seats.");
      await refreshSeats();
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseSelected = async () => {
    if (selectedAssignedSeats.length === 0) return;
    setSaving(true); setError("");
    try {
      for (const seat of selectedAssignedSeats) {
        await releaseResourceSeatAssignment(resourceId, seat.seatNumber);
      }
      await refreshSeats();
      await onChanged?.();
      setSelectedSeatNumbers(new Set());
      toast.success(`${selectedAssignedSeats.length} seat${selectedAssignedSeats.length === 1 ? "" : "s"} released.`);
    } catch (e) {
      setError(e?.message || "Failed to release seats.");
      toast.error(e?.message || "Failed to release seats.");
      await refreshSeats();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-[15px] font-pmedium flex items-center gap-1.5"><Building2 size={18} /> {resource?.name || "Manage Seats"}</h2>
            <p className="text-[10px] font-pmedium text-blue-200 uppercase tracking-widest mt-0.5">
              {resource?.locationLabel || ""} · {assignedCount}/{seats.length} assigned · {seats.length - assignedCount} vacant
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-red-500 transition-all"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-pmedium text-rose-700">{error}</div>
          )}

          {!loading && seats.length > 0 && (
            <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Tap seats to select — pick as many as you need, then assign or release them together.</p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {seats.map((seat) => {
                const isSelected = selectedSeatNumbers.has(seat.seatNumber);
                const cardClass = seat.isVacant
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300";
                return (
                  <button
                    key={seat.seatNumber}
                    type="button"
                    onClick={() => toggleSeat(seat.seatNumber)}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border-2 p-2.5 text-left transition-all ${cardClass} ${isSelected ? "ring-2 ring-blue-400 shadow-md" : ""}`}
                  >
                    <span className="text-[10px] font-pmedium truncate w-full">{seat.seatLabel}</span>
                    <span className="text-[9px] font-pmedium uppercase tracking-widest opacity-80">{seat.isVacant ? "Vacant" : "Assigned"}</span>
                    {!seat.isVacant && seat.assignmentLabel && (
                      <span className="text-[9px] font-pmedium truncate w-full">{seat.assignmentLabel}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedVacantSeats.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-[11px] font-pmedium text-slate-700">{selectedVacantSeats.length} vacant seat{selectedVacantSeats.length === 1 ? "" : "s"} selected</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setAssignmentType("tenant")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest ${assignmentType === "tenant" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                  Tenant
                </button>
                <button type="button" onClick={() => setAssignmentType("department")}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-widest ${assignmentType === "department" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                  Department
                </button>
              </div>
              {assignmentType === "tenant" ? (
                <select value={tenantCompanyId} onChange={(e) => setTenantCompanyId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer">
                  <option value="">-- Select Tenant Company --</option>
                  {tenants.map((t) => <option key={t.recordId || t.id} value={t.recordId || t.id}>{t.companyName || t.name}</option>)}
                </select>
              ) : (
                <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer">
                  <option value="">-- Select Department --</option>
                  {departments.map((d) => <option key={d.id || d.name} value={d.id || d.name}>{d.name}</option>)}
                </select>
              )}
              <button type="button" disabled={saving} onClick={handleAssignSelected}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                <CheckCircle2 size={14} /> {saving ? "Assigning..." : `Assign ${selectedVacantSeats.length} Seat${selectedVacantSeats.length === 1 ? "" : "s"}`}
              </button>
            </div>
          )}

          {selectedAssignedSeats.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <p className="text-[11px] font-pmedium text-slate-700">{selectedAssignedSeats.length} assigned seat{selectedAssignedSeats.length === 1 ? "" : "s"} selected</p>
              <button type="button" disabled={saving} onClick={handleReleaseSelected}
                className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-pmedium text-[12px] shadow-sm hover:bg-rose-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                <RotateCcw size={14} /> {saving ? "Releasing..." : `Release ${selectedAssignedSeats.length} Seat${selectedAssignedSeats.length === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
