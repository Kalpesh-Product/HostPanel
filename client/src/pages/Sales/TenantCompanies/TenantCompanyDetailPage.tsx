import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, History, CalendarDays, CreditCard, Plus, X, Save,
  Mail, Phone, MapPin, CheckCircle2, AlertTriangle, Clock, Eye,
  ChevronDown, UserCog, ToggleLeft, ToggleRight, Building2, FileText, DollarSign,
  LayoutGrid,
  IndianRupee
} from 'lucide-react';
import { getTenantCompany, addTenantCompanyEmployee, updateTenantCompanyEmployee, updateTenantCompanyEmployeeStatus, deleteTenantCompanyEmployee, updateTenantCompanyManager } from '../../../services/tenant-companies';
import { getBookingsByTenantCompany } from '../../../services/meeting-room-bookings';
import PageFrame from '../../../components/Pages/PageFrame';
import { toast } from 'sonner';
import { useFreshCurrentUser } from '../../../hooks/useFreshCurrentUser';

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const TABS = [
  { id: 'company-details', label: 'Company Details', icon: Building2 },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'credits', label: 'Credits', icon: CreditCard },
  { id: 'space-allocation', label: 'Space Allocation', icon: LayoutGrid },
];

function fmt(n = 0) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(Number(n || 0)));
}
function fmtDate(v) {
  if (!v) return '-'; const d = new Date(v); return isNaN(d.getTime()) ? v : new Intl.DateTimeFormat('en-IN', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
}
function initials(e = {}) { const s = String(e.name || e.fullName || e.email || 'E').trim(); return s.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || 'E'; }
function empName(e = {}) { return String(e.name || e.fullName || e.email || 'Unnamed').trim(); }

function empStatusMeta(e = {}) {
  const s = String(e.status || '').toLowerCase();
  const a = String(e.accountStatus || e.inviteStatus || '').toLowerCase();
  if (s === 'inactive') return { label: 'Inactive', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (a.includes('logged in')) return { label: 'Logged In', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (a.includes('registered')) return { label: 'Registered', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (a.includes('invited')) return { label: 'Invited', cls: 'bg-violet-50 text-violet-700 border-violet-200' };
  return { label: e.status || 'Pending', cls: 'bg-slate-50 text-slate-600 border-slate-200' };
}

function statusBadge(s) {
  switch (s) {
    case 'Pending Setup': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-wider"><Clock size={12} />Pending Setup</span>;
    case 'Pending Space Assignment': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-black uppercase tracking-wider"><MapPin size={12} />Pending Space</span>;
    case 'Active': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-black uppercase tracking-wider"><CheckCircle2 size={12} />Active</span>;
    case 'Expiring Soon': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-black uppercase tracking-wider"><AlertTriangle size={12} />Expiring Soon</span>;
    case 'Expired': return <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-black uppercase tracking-wider"><AlertTriangle size={12} />Expired</span>;
    default: return s ? <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-wider">{s}</span> : null;
  }
}

function bookingStyle(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'confirmed' || v === 'booked') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (v === 'completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (v === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
  if (v === 'in-progress' || v === 'in progress') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function getCabinDesksCount(tenant: any) {
  const cd = tenant?.companyDetails || {};
  const pd = tenant?.packageDetails || {};
  return Number(cd?.cabinDesks ?? pd?.cabinDesks ?? 0);
}

function getOpenDesksCount(tenant: any) {
  const cd = tenant?.companyDetails || {};
  const pd = tenant?.packageDetails || {};
  return Number(cd?.openDesks ?? pd?.openDesks ?? 0);
}

function getDeskLabels(prefix: string, count: number) {
  const n = Math.max(0, Math.floor(Number(count || 0)));
  return Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`);
}

// ---------------------------------------------------------------------------
// TenantBillingDetails – computes billing from desk counts × rates
// ---------------------------------------------------------------------------
function TenantBillingDetails({ tenant }) {
  const cd = tenant?.companyDetails || {};
  const pd = tenant?.packageDetails || {};
  const od = Number(cd.openDesks || pd.openDesks || 0);
  const cbd = Number(cd.cabinDesks || pd.cabinDesks || 0);
  const rod = Number(cd.ratePerOpenDesk || pd.ratePerOpenDesk || 0);
  const rcd = Number(cd.ratePerCabinDesk || pd.ratePerCabinDesk || 0);
  const dailyRent = Math.max(0, (od * rod) + (cbd * rcd));
  const monthlyRent = dailyRent * 30;
  const dur = Math.max(1, Number(tenant.contractDurationMonths || pd.durationMonths || 1));
  const totalAmt = monthlyRent * dur;
  const secDep = Math.round(totalAmt * 0.25);
  const depStatus = tenant.billingDetails?.securityDepositPaidStatus || 'Pending';
  return (
    <div className="grid grid-cols-2 gap-4">
      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Rent</p><p className="text-xs font-bold text-slate-900 mt-1">{monthlyRent > 0 ? `₹${fmt(monthlyRent)}` : 'N/A'}</p></div>
      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contract Amount</p><p className="text-xs font-bold text-slate-900 mt-1">{totalAmt > 0 ? `₹${fmt(totalAmt)}` : 'N/A'}</p></div>
      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security Deposit</p><p className="text-xs font-bold text-slate-900 mt-1">{secDep > 0 ? `₹${fmt(secDep)}` : 'N/A'}</p></div>
      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deposit Status</p><p className="text-xs font-bold text-slate-900 mt-1">{depStatus}</p></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DataPanel – reusable white container
// ---------------------------------------------------------------------------
function DataPanel({ title, subtitle, headerRight, children }) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
      <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</p>
          {subtitle && <p className="text-[10px] font-medium text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {headerRight && <div className="flex items-center gap-2 flex-shrink-0">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function TenantCompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useFreshCurrentUser();

  const [tenant, setTenant] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('company-details');
  const [isSaving, setIsSaving] = useState(false);

  // Employees
  const [addModal, setAddModal] = useState(false);
  const [viewEmp, setViewEmp] = useState(null);
  const [editEmp, setEditEmp] = useState(null);
  const [addF, setAddF] = useState({ name: '', email: '', phone: '', designation: '', role: 'Employee' });
  const [editF, setEditF] = useState({ name: '', phone: '', designation: '', role: 'Employee' });

  // Other modals
  const [mgrModal, setMgrModal] = useState(false);
  const [viewCredit, setViewCredit] = useState(null);
  const [viewBk, setViewBk] = useState(null);

  // Filters
  const now = new Date();
  const [fm, setFm] = useState(now.getMonth());
  const [fy, setFy] = useState(now.getFullYear());

  // ---------- Fetch ----------
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([getTenantCompany(id), getBookingsByTenantCompany(id)])
      .then(([tr, br]) => {
        setTenant(tr?.data?.tenant || tr?.data || tr);
        setBookings(br?.bookings || br?.data?.bookings || []);
      })
      .catch(err => toast.error(err?.message || 'Failed to load'))
      .finally(() => setIsLoading(false));
  }, [id]);

  // ---------- Memos ----------
  const employees = useMemo(() => {
    if (!tenant?.employees) return [];
    const seen = new Set();
    return (Array.isArray(tenant.employees) ? tenant.employees : [])
      .map(e => ({ ...e, name: empName(e), email: String(e.email || '').trim().toLowerCase(), designation: String(e.designation || '').trim(), role: e.role || (tenant.managerEmployeeId && String(tenant.managerEmployeeId) === String(e.id) ? 'Manager' : 'Employee'), status: e.status || 'Active' }))
      .filter(e => e.name || e.email)
      .filter(e => { const k = e.email || e.id || e.name; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [tenant]);

  const mgrEmp = useMemo(() => {
    if (!tenant?.managerEmployeeId || !employees.length) return null;
    return employees.find(e => String(e.id) === String(tenant.managerEmployeeId)) || null;
  }, [tenant, employees]);

  // Base credits are the monthly base (e.g., 20) while additional sales-added credits (e.g., 600)
  // should show under "Purchased". Backend credit-add currently increments `creditsAllocated`,
  // so we derive "Purchased" as the difference vs monthly base.
  const baseFromPackage = useMemo(
    () => Number(tenant?.packageDetails?.monthlyTotalCredits || tenant?.packageDetails?.monthlyCredits || 0),
    [tenant]
  );
  const totalAllocated = useMemo(() => Number(tenant?.creditsAllocated || 0), [tenant]);
  const ca = baseFromPackage; // Base Credits (monthly base)
  const pc = useMemo(() => Math.max(0, totalAllocated - baseFromPackage), [totalAllocated, baseFromPackage]);
  const cu = useMemo(() => Number(tenant?.creditsUsed || 0), [tenant]);
  const cr = useMemo(() => Math.max(0, ca + pc - cu), [ca, pc, cu]);
  const ch = useMemo(() => Array.isArray(tenant?.creditHistory) ? tenant.creditHistory : [], [tenant]);

  const fch = useMemo(() => ch.filter(e => { if (!e.date) return true; const d = new Date(e.date); return d.getMonth() === fm && d.getFullYear() === fy; }), [ch, fm, fy]);

  const isCreditEntry = (type = '') => {
    const t = String(type || '').toLowerCase();
    return (
      t.includes('refund') ||
      t.includes('credit') ||
      t.includes('added') ||
      t.includes('credits_added') ||
      t.includes('credits add') ||
      t.includes('purchased')
    );
  };

  const getEntryCreditAmount = (e) => {
    // Backend "Purchased Credits" uses `credited`, while usage/debits typically use `used` or `debited`.
    return Number(e?.credited ?? e?.used ?? e?.debited ?? 0);
  };

  const mStats = useMemo(() => {
    let debitSum = 0, creditSum = 0;
    fch.forEach(e => {
      const debitAmt = Number(e.used || e.debited || 0);
      const creditAmt = getEntryCreditAmount(e);
      if (isCreditEntry(e.type)) creditSum += creditAmt;
      else debitSum += debitAmt;
    });
    return { used: debitSum, refunded: creditSum, net: debitSum - creditSum, count: fch.length };
  }, [fch]);

  // ---------- Handlers ----------
  const refresh = () => id && getTenantCompany(id).then(r => setTenant(r?.data?.tenant || r?.data || r)).catch(() => { });

  const hAdd = async e => { e.preventDefault(); if (!tenant || isSaving) return; setIsSaving(true); try { const r = await addTenantCompanyEmployee(tenant.recordId || tenant.id, addF); const p = r?.data || {}; if (p.tenant) setTenant(prev => ({ ...prev, ...p.tenant })); toast.success('Employee added.'); setAddModal(false); setAddF({ name: '', email: '', phone: '', designation: '', role: 'Employee' }); } catch (err) { toast.error(err?.message || 'Failed'); } finally { setIsSaving(false); } };
  const hEdit = async e => { e.preventDefault(); if (!tenant || !editEmp || isSaving) return; setIsSaving(true); try { await updateTenantCompanyEmployee(tenant.recordId || tenant.id, editEmp.id || '', editF); toast.success('Updated.'); setEditEmp(null); setEditF({ name: '', phone: '', designation: '', role: 'Employee' }); refresh(); } catch (err) { toast.error(err?.message || 'Failed'); } finally { setIsSaving(false); } };
  const hToggle = async emp => { if (!tenant || isSaving) return; setIsSaving(true); try { const ns = emp.status === 'Inactive' ? 'Active' : 'Inactive'; await updateTenantCompanyEmployeeStatus(tenant.recordId || tenant.id, emp.id, { status: ns }); toast.success(ns === 'Active' ? 'Activated.' : 'Deactivated.'); refresh(); } catch (err) { toast.error(err?.message || 'Failed'); } finally { setIsSaving(false); } };
  const hDel = async eid => { if (!tenant || isSaving) return; setIsSaving(true); try { await deleteTenantCompanyEmployee(tenant.recordId || tenant.id, eid); toast.success('Removed.'); setViewEmp(null); refresh(); } catch (err) { toast.error(err?.message || 'Failed'); } finally { setIsSaving(false); } };
  const hSetMgr = async eid => { if (!tenant || isSaving) return; setIsSaving(true); try { await updateTenantCompanyManager(tenant.recordId || tenant.id, { employeeId: eid }); toast.success('Manager updated.'); setMgrModal(false); refresh(); } catch (err) { toast.error(err?.message || 'Failed'); } finally { setIsSaving(false); } };

  // ---------- Loading / Not found ----------
  if (isLoading) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="space-y-4 w-full animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-1/4" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
            <div className="grid grid-cols-4 gap-4 mt-8">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded-[2rem]" />)}</div>
            <div className="h-64 bg-slate-200 rounded-3xl mt-8" />
          </div>
        </PageFrame>
      </div>
    );
  }
  if (!tenant) {
    return (
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex items-center justify-center min-h-[40vh]"><p className="text-sm font-bold text-slate-400">Tenant company not found.</p></div>
        </PageFrame>
      </div>
    );
  }

  const yearOpts = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  // ====================================================================
  // RENDER
  // ====================================================================
  return (
    <>
      <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
        <PageFrame>
          <div className="flex flex-col gap-4">

            {/* ---- HEADER ---- */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/sales-crm/tenant-companies')}
                className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"><ArrowLeft size={16} /></button>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center text-sm font-black shadow-sm">
                  {(tenant.companyName || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-pmedium text-primary uppercase">{tenant.companyName}</h2>
                    {statusBadge(tenant.status)}
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Tenant ID: {tenant.id || tenant.tenantCode}</p>
                </div>
              </div>
            </div>

            {/* ---- STAT CARDS ---- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                <div className="min-w-0"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Base Credits</p><p className="text-[15px] font-black text-slate-900">{fmt(ca)}</p></div>
                <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><CreditCard size={16} /></div>
              </div>
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-violet-500">
                <div className="min-w-0"><p className="text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-1">Purchased</p><p className="text-[15px] font-black text-violet-600">+{fmt(pc)}</p></div>
                <div className="p-2 rounded-2xl bg-violet-50 text-violet-600 shrink-0"><Plus size={16} /></div>
              </div>
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
                <div className="min-w-0"><p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Credits Used</p><p className="text-[15px] font-black text-blue-600">{fmt(cu)}</p></div>
                <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><History size={16} /></div>
              </div>
              <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
                <div className="min-w-0"><p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Remaining</p><p className="text-[15px] font-black text-emerald-600">{fmt(cr)}</p></div>
                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><CheckCircle2 size={16} /></div>
              </div>
            </div>

            {/* ---- MAIN TABS (pill-style) ---- */}
            <div className="flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              {TABS.map(tab => {
                const Icon = tab.icon; return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-[#2563EB] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                    <Icon size={14} />{tab.label}
                  </button>
                );
              })}
            </div>

            {/* ================================================================ */}
            {/* COMPANY DETAILS TAB */}
            {/* ================================================================ */}
            {activeTab === 'company-details' && (
              <div className="space-y-4">
                {/* Contract & Credits Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contract Start</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{tenant.contractStart || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Contract End</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{tenant.contractEnd || 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Duration</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{tenant.contractDurationMonths ? `${tenant.contractDurationMonths} months` : 'N/A'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Area Assigned</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{tenant.space?.primaryFloor || tenant.companyDetails?.buildingName || 'Unassigned'}</p>
                  </div>
                </div>

                {/* Package & Company Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><FileText size={14} /> Sales Package Summary</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Plan Type</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.planType || tenant.packageName || 'N/A'}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Package</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.packageName || tenant.packageDetails?.packageName || 'N/A'}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Credits</p><p className="text-xs font-bold text-slate-900 mt-1">{fmt(ca)}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Seats</p><p className="text-xs font-bold text-slate-900 mt-1">{fmt(tenant.packageDetails?.totalSeats || 0)}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Open Desks</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.companyDetails?.openDesks || tenant.packageDetails?.openDesks || 0}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cabin Desks</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.companyDetails?.cabinDesks || tenant.packageDetails?.cabinDesks || 0}</p></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><IndianRupee size={14} /> Billing Snapshot</h3>
                    <TenantBillingDetails tenant={tenant} />
                  </div>
                </div>

                {/* Customer Profile & Manager */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><Building2 size={14} /> Customer Profile</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Company</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.customerDetails?.clientName || tenant.companyName}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sector</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.customerDetails?.sector || tenant.businessType || 'N/A'}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HO Country</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.customerDetails?.hoCountry || 'N/A'}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HO State</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.customerDetails?.hoState || 'N/A'}</p></div>
                      <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HO City</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.customerDetails?.hoCity || 'N/A'}</p></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><UserCog size={14} /> Manager Assignment</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Manager</p>
                          <p className="text-sm font-bold text-slate-900 mt-1">{mgrEmp ? empName(mgrEmp) : tenant.contactName || 'No manager assigned'}</p>
                          {mgrEmp && <p className="text-[10px] text-slate-500 mt-0.5">{mgrEmp.email}</p>}
                        </div>
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${mgrEmp || tenant.contactName ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {mgrEmp || tenant.contactName ? 'Assigned' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><MapPin size={14} /> POC Details</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Local POC</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.pocDetails?.localPocName || 'N/A'}</p></div>
                        <div><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HO POC</p><p className="text-xs font-bold text-slate-900 mt-1">{tenant.pocDetails?.hoPocName || 'N/A'}</p></div>
                        <div className="col-span-2"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Local POC Email</p><p className="text-xs font-bold text-slate-900 mt-1 break-all">{tenant.pocDetails?.localPocEmail || 'N/A'}</p></div>
                        <div className="col-span-2"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">HO POC Email</p><p className="text-xs font-bold text-slate-900 mt-1 break-all">{tenant.pocDetails?.hoPocEmail || 'N/A'}</p></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agreement Details */}
                {tenant.agreementDetails && Object.keys(tenant.agreementDetails).length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><FileText size={14} /> Agreement Details</h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(tenant.agreementDetails)
                        .filter(([k]) => k !== '_id' && k !== 'totalMeetingCredits')
                        .map(([key, val]) => {
                          const isIsoDateLike =
                            typeof val === 'string' &&
                            (val.includes('T') || val.endsWith('Z')) &&
                            !Number.isNaN(new Date(val).getTime());

                          const displayVal = isIsoDateLike ? fmtDate(val) : String(val || 'N/A');

                          return (
                            <div key={key}>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                              </p>
                              <p className="text-xs font-bold text-slate-900 mt-1">{displayVal}</p>
                            </div>
                          );
                        })}

                      {/* Credits summary (replace Total Meeting Credits) */}
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Base Credits</p>
                        <p className="text-xs font-bold text-slate-900 mt-1">{fmt(ca)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Purchased Credits</p>
                        <p className="text-xs font-bold text-slate-900 mt-1">+{fmt(pc)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credit Used</p>
                        <p className="text-xs font-bold text-slate-900 mt-1">{fmt(cu)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Remaining Credits</p>
                        <p className="text-xs font-bold text-slate-900 mt-1">{fmt(cr)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================================================ */}
            {/* EMPLOYEES TAB */}
            {/* ================================================================ */}
            {activeTab === 'employees' && (
              <DataPanel
                title="Employee Directory"
                subtitle={`${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
                headerRight={<>
                  <button onClick={() => setMgrModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200/60 text-slate-700 rounded-xl text-[10px] font-bold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"><UserCog size={12} /> Change Manager</button>
                  <button onClick={() => setAddModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[#2563EB] text-white rounded-2xl text-[10px] font-bold shadow-sm hover:bg-[#2563EB]/90 active:scale-95 transition-all"><Plus size={12} strokeWidth={3} /> Add Employee</button>
                </>}
              >
                {employees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr><th className="px-5 py-4">Employee</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {employees.map(emp => {
                          const meta = empStatusMeta(emp);
                          const isMgr = mgrEmp && String(mgrEmp.id) === String(emp.id);
                          return (
                            <tr key={emp.id || emp.email || emp.name} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black ${isMgr ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600'}`}>{initials(emp)}</div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-slate-900 truncate">{empName(emp)}</p>
                                      {isMgr && <span className="px-1.5 py-0.5 bg-[#2563EB]/10 text-[#2563EB] rounded-md text-[8px] font-black uppercase tracking-widest">Manager</span>}
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-500">{emp.designation || 'No designation'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Mail size={11} />{emp.email || '-'}</p>
                                {emp.phone && <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5"><Phone size={10} />{emp.phone}</p>}
                              </td>
                              <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${meta.cls}`}>{meta.label}</span></td>
                              <td className="px-5 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button onClick={() => setViewEmp(emp)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all" title="View Profile"><Eye size={15} strokeWidth={2.5} /></button>
                                  <button onClick={() => hToggle(emp)} className={`p-1.5 rounded-lg transition-all ${emp.status === 'Inactive' ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`} title={emp.status === 'Inactive' ? 'Activate' : 'Deactivate'}>
                                    {emp.status === 'Inactive' ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
                                  </button>
                                  {emp.status !== 'Inactive' && !isMgr && (
                                    <button onClick={() => hDel(emp.id)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all" title="Remove"><X size={13} /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100"><Users className="text-slate-400" size={24} /></div>
                    <p className="text-slate-500 font-semibold mb-1">No employees found</p>
                    <p className="text-slate-400 text-[13px]">Add an employee to get started.</p>
                  </div>
                )}
              </DataPanel>
            )}

            {/* ================================================================ */}
            {/* CREDIT USAGE TAB — commented out per spec
            {activeTab==='credit-usage'&&( ... )}
            ================================================================ */}

            {/* ================================================================ */}
            {/* BOOKINGS TAB */}
            {/* ================================================================ */}
            {activeTab === 'bookings' && (
              <DataPanel
                title="Meeting Room Bookings"
                subtitle={`${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}
              >
                {bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                        <tr><th className="px-5 py-4">Room</th><th className="px-5 py-4">Date &amp; Time</th><th className="px-5 py-4">Booked By</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Credit Used</th><th className="px-5 py-4 text-center">Action</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60">
                        {bookings.map(b => (
                          <tr key={b.recordId || b.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-5 py-4"><p className="text-sm font-bold text-slate-900">{b.roomName}</p></td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-slate-800">{fmtDate(b.start || b.date)}</p>
                              <p className="text-[10px] text-slate-500">{b.startTime || ''} - {b.endTime || ''}</p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-xs font-semibold text-slate-700">{b.bookedByName || '-'}</p>
                              <p className="text-[10px] text-slate-500">{b.bookedByEmail || ''}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${bookingStyle(b.status || b.storedStatus)}`}>
                                {b.status || b.storedStatus || 'Booked'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right"><span className="text-xs font-black text-red-500">{fmt(b.bookingCredits || 0)}</span></td>
                            <td className="px-5 py-4 text-center">
                              <button onClick={() => setViewBk(b)} className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all" title="View Details"><Eye size={15} strokeWidth={2.5} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100"><CalendarDays className="text-slate-400" size={24} /></div>
                    <p className="text-slate-500 font-semibold mb-1">No bookings found</p>
                    <p className="text-slate-400 text-[13px]">Bookings for this tenant will appear here.</p>
                  </div>
                )}
              </DataPanel>
            )}

            {/* ================================================================ */}
            {/* CREDITS TAB */}
            {/* ================================================================ */}
            {activeTab === 'credits' && (
              <div className="space-y-4">

                {/* Single Utilization Card */}
                <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Credit Utilization</p>
                      <p className="text-[15px] font-black text-slate-900">{fmt(cu)} of {fmt(ca + pc)} used</p>
                    </div>
                    <div className="p-2 rounded-2xl bg-blue-50 text-blue-600"><CreditCard size={20} /></div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${ca + pc > 0 ? Math.min(100, (cu / (ca + pc)) * 100) : 0}%` }} />
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] font-bold">
                    <span className="text-slate-500">Remaining: {fmt(cr)}</span>
                    <span className="text-slate-700">{ca + pc > 0 ? Math.round((cu / (ca + pc)) * 100) : 0}% utilized</span>
                  </div>
                </div>

                {/* Monthly Activity */}
                <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[300px]">
                  <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50/50">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-slate-900">Monthly Credit Activity</p>
                      <p className="text-[10px] font-medium text-slate-500 mt-0.5">{mStats.count} entr{mStats.count !== 1 ? 'ies' : 'y'} in {MONTHS[fm]} {fy}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select value={fm} onChange={e => setFm(Number(e.target.value))}
                          className="pl-3 pr-7 py-2 bg-white border border-slate-200/60 rounded-lg text-[11px] font-semibold text-slate-700 outline-none cursor-pointer appearance-none">
                          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <div className="relative">
                        <select value={fy} onChange={e => setFy(Number(e.target.value))}
                          className="pl-3 pr-7 py-2 bg-white border border-slate-200/60 rounded-lg text-[11px] font-semibold text-slate-700 outline-none cursor-pointer appearance-none">
                          {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Summary mini-cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-slate-50/30 border-b border-slate-100/60">
                    <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Used This Month</p>
                      <p className="text-sm font-black text-red-500">{fmt(mStats.used)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Refunded This Month</p>
                      <p className="text-sm font-black text-emerald-600">{fmt(mStats.refunded)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Net Used</p>
                      <p className={`text-sm font-black ${mStats.net > 0 ? 'text-red-500' : mStats.net < 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {mStats.net > 0 ? '-' : mStats.net < 0 ? '+' : ''}{fmt(Math.abs(mStats.net))}
                      </p>
                    </div>
                  </div>

                  {/* Monthly entries table */}
                  {fch.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                          <tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Description</th><th className="px-5 py-4 text-right">Debit</th><th className="px-5 py-4 text-right">Credit</th><th className="px-5 py-4 text-right">Balance</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/60">
                          {fch.map((e, i) => (
                            <tr key={e.id || i} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-5 py-4 text-[10px] font-bold text-slate-500">{fmtDate(e.date)}</td>
                              <td className="px-5 py-4">
                                <p className="text-xs font-bold text-slate-900">{e.roomName || e.resource || e.type || 'Transaction'}</p>
                                {e.bookedBy && <p className="text-[10px] text-slate-500">Host: {e.bookedBy}</p>}
                              </td>
                              <td className="px-5 py-4 text-right text-xs font-black text-red-500">
                                {!isCreditEntry(e.type) && (e.used || e.debited) ? fmt(e.used || e.debited) : '-'}
                              </td>
                              <td className="px-5 py-4 text-right text-xs font-black text-emerald-600">
                                {isCreditEntry(e.type) ? fmt(getEntryCreditAmount(e)) : '-'}
                              </td>
                              <td className="px-5 py-4 text-right text-xs font-black text-slate-700">{fmt(e.remainingCredits ?? 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-50 mb-3 border border-slate-100"><CreditCard className="text-slate-400" size={22} /></div>
                      <p className="text-slate-500 font-semibold mb-1">No activity this month</p>
                      <p className="text-slate-400 text-[13px]">No credit transactions in {MONTHS[fm]} {fy}.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================================================================ */}
            {/* SPACE ALLOCATION TAB */}
            {/* ================================================================ */}
            {activeTab === 'space-allocation' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="flex flex-col items-center justify-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <MapPin className="mb-1 text-amber-500" size={22} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Area</p>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">{tenant.space?.floor || tenant.companyDetails?.buildingName || 'Unassigned'}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <LayoutGrid className="mb-1 text-blue-500" size={22} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Open Desks</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{fmt(tenant.companyDetails?.openDesks || tenant.packageDetails?.openDesks || 0)}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <Building2 className="mb-1 text-purple-500" size={22} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Cabin Desks</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{fmt(tenant.companyDetails?.cabinDesks || tenant.packageDetails?.cabinDesks || 0)}</p>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                    <Users className="mb-1 text-sky-500" size={22} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Seats</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">{fmt(tenant.packageDetails?.totalSeats || 0)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100/60 bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">Assigned Space Breakdown</p>
                    </div>
                    <div className="p-4 space-y-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Floor</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{tenant.space?.floor || tenant.companyDetails?.buildingName || 'N/A'}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Seats</p>
                        {/* <p className="text-sm font-bold text-slate-900 mt-0.5">N/A</p> */}
                      </div>

                      <div>
                        {(() => {
                          const cabinDesks = getCabinDesksCount(tenant);
                          const openDesks = getOpenDesksCount(tenant);

                          // Priority: if cabin desks exist, show CDS*.
                          // Else if open desks exist, show ODS*.
                          if (cabinDesks > 0) {
                            const labels = getDeskLabels('CDS', cabinDesks);
                            return (
                              <div>
                                {/* <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cabin Desks</p> */}
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {labels.map((l) => (
                                    <span key={l} className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-violet-700">
                                      {l}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          if (openDesks > 0) {
                            const labels = getDeskLabels('ODS', openDesks);
                            return (
                              <div>
                                {/* <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Open Desks</p> */}
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {labels.map((l) => (
                                    <span key={l} className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">
                                      {l}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cabin/Open Desks</p>
                              <p className="text-sm font-bold text-slate-300 mt-0.5">N/A</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100/60 bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">Location Labels</p>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(tenant.packageLocationLabels) && tenant.packageLocationLabels.length > 0 ? (
                          tenant.packageLocationLabels.map((l, i) => (
                            <span key={i} className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600">{l}</span>
                          ))
                        ) : (
                          <span className="text-xs font-medium text-slate-400">No assigned location labels.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {Array.isArray(tenant.space?.seats) && tenant.space.seats.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100/60 bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-900">Assigned Seats by Area</p>
                    </div>
                    <div className="p-4">
                      <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-orange-600">{tenant.companyDetails?.buildingName || tenant.space?.floor || 'Area'}</p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-orange-700 shadow-sm">{tenant.space.seats.length} seats</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tenant.space.seats.map((s, i) => (
                            <span key={i} className="rounded-lg border border-orange-200 bg-white px-2.5 py-1 text-[10px] font-bold text-orange-800 shadow-sm">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </PageFrame>
      </div>

      {/* ================================================================ */}
      {/* ADD EMPLOYEE MODAL */}
      {/* ================================================================ */}
      {addModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Add Employee</h3>
              <button onClick={() => { setAddModal(false); setAddF({ name: '', email: '', phone: '', designation: '', role: 'Employee' }); }}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <form onSubmit={hAdd} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name *</label>
                <input type="text" value={addF.name} onChange={e => setAddF({ ...addF, name: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm placeholder:text-slate-400" placeholder="Employee name" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email *</label>
                <input type="email" value={addF.email} onChange={e => setAddF({ ...addF, email: e.target.value })} required
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm placeholder:text-slate-400" placeholder="employee@company.com" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                <input type="text" value={addF.phone} onChange={e => setAddF({ ...addF, phone: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm placeholder:text-slate-400" placeholder="Phone number" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</label>
                <input type="text" value={addF.designation} onChange={e => setAddF({ ...addF, designation: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm placeholder:text-slate-400" placeholder="Designation" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setAddModal(false); setAddF({ name: '', email: '', phone: '', designation: '', role: 'Employee' }); }}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={isSaving}
                  className="px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl text-[10px] font-bold shadow-sm hover:bg-[#2563EB]/90 disabled:opacity-60 transition-all">{isSaving ? 'Adding...' : 'Add Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW EMPLOYEE MODAL */}
      {/* ================================================================ */}
      {viewEmp && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-lg h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Employee Profile</p>
                <h3 className="mt-0.5 text-xl font-black text-slate-900">{viewEmp.name}</h3>
                <p className="mt-0.5 text-xs font-bold text-slate-500">{viewEmp.designation || 'Tenant Employee'}</p>
              </div>
              <button onClick={() => setViewEmp(null)}
                className="w-10 h-10 bg-white hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Email</p><p className="mt-0.5 break-all text-xs font-bold text-slate-900">{viewEmp.email}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Role</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewEmp.role || 'Employee'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Account Status</p><p className="mt-0.5 text-xs font-bold text-slate-900">{empStatusMeta(viewEmp).label}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Designation</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewEmp.designation || 'N/A'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewEmp.phone || 'N/A'}</p></div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tenant</p><p className="mt-0.5 text-xs font-bold text-slate-900">{tenant?.companyName || 'Tenant Company'}</p></div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white p-5">
              <button onClick={() => { setEditEmp(viewEmp); setEditF({ name: viewEmp?.name || '', phone: viewEmp?.phone || '', designation: viewEmp?.designation || '', role: viewEmp?.role || 'Employee' }); }}
                className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 transition-all">Edit</button>
              <button onClick={() => hToggle(viewEmp)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewEmp.status === 'Inactive' ? 'bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100' : 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100'}`}>
                {viewEmp.status === 'Inactive' ? 'Activate' : 'Deactivate'}
              </button>
              <button onClick={() => hDel(viewEmp.id)}
                className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100 transition-all">Delete</button>
              <button onClick={() => setViewEmp(null)}
                className="px-3 py-2 bg-[#0F172A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1e293b] transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* EDIT EMPLOYEE MODAL */}
      {/* ================================================================ */}
      {editEmp && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Edit Employee</h3>
              <button onClick={() => { setEditEmp(null); setEditF({ name: '', phone: '', designation: '', role: 'Employee' }); }}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <form onSubmit={hEdit} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input required type="text" value={editF.name} onChange={e => setEditF({ ...editF, name: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                <input type="text" value={editF.phone} onChange={e => setEditF({ ...editF, phone: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation</label>
                <input type="text" value={editF.designation} onChange={e => setEditF({ ...editF, designation: e.target.value })}
                  className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-[13px] text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] shadow-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setEditEmp(null); setEditF({ name: '', phone: '', designation: '', role: 'Employee' }); }}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                <button type="submit" disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl text-[10px] font-bold shadow-sm hover:bg-[#2563EB]/90 disabled:opacity-60 transition-all"><Save size={13} /> Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* CHANGE MANAGER MODAL */}
      {/* ================================================================ */}
      {mgrModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Change Manager</h3>
              <button onClick={() => setMgrModal(false)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-2 overflow-y-auto">
              {mgrEmp && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Current Manager</p>
                  <p className="text-sm font-bold text-blue-800 mt-1">{empName(mgrEmp)}</p>
                  <p className="text-[10px] text-blue-600">{mgrEmp.email}</p>
                </div>
              )}
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Select New Manager</p>
              {employees.filter(e => e.status !== 'Inactive').map(emp => {
                const isCurrent = mgrEmp && String(mgrEmp.id) === String(emp.id);
                return (
                  <div key={emp.id || emp.email}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isCurrent ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                    onClick={() => { if (!isCurrent) hSetMgr(emp.id); }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${isCurrent ? 'bg-[#2563EB] text-white' : 'bg-slate-100 text-slate-600'}`}>{initials(emp)}</div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{empName(emp)}</p>
                        <p className="text-[9px] text-slate-500">{emp.designation || emp.email}</p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <span className="px-2 py-1 bg-[#2563EB]/10 text-[#2563EB] rounded-lg text-[8px] font-black uppercase tracking-widest">Current</span>
                    ) : (
                      <button className="px-2 py-1 bg-[#2563EB] text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-[#2563EB]/90 transition-all">Select</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW CREDIT ENTRY MODAL */}
      {/* ================================================================ */}
      {viewCredit && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Credit Entry Details</h3>
              <button onClick={() => setViewCredit(null)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date</p><p className="mt-0.5 text-xs font-bold text-slate-900">{fmtDate(viewCredit.date)}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Type</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewCredit.type || 'Booking'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Room</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewCredit.roomName || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Booking Code</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewCredit.bookingCode || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Host</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewCredit.bookedBy || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewCredit.status || 'Completed'}</p></div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credits</p>
                  <p className={`text-lg font-black mt-1 ${viewCredit.type === 'Refund' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {viewCredit.type === 'Refund' ? '+' : '-'}{fmt(viewCredit.credited ?? viewCredit.used ?? viewCredit.debited ?? 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Remaining Balance</p>
                  <p className="text-lg font-black mt-1 text-slate-900">{fmt(viewCredit.remainingCredits ?? 0)}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 p-5">
              <button onClick={() => setViewCredit(null)}
                className="px-4 py-2.5 bg-[#0F172A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1e293b] transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* VIEW BOOKING MODAL */}
      {/* ================================================================ */}
      {viewBk && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Booking Details</h3>
              <button onClick={() => setViewBk(null)}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Booking Code</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewBk.bookingCode || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Room</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewBk.roomName || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Date</p><p className="mt-0.5 text-xs font-bold text-slate-900">{fmtDate(viewBk.start || viewBk.date)}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Time</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewBk.startTime || '-'} - {viewBk.endTime || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Booked By</p><p className="mt-0.5 text-xs font-bold text-slate-900">{viewBk.bookedByName || '-'}</p></div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                  <p className="mt-0.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-widest ${bookingStyle(viewBk.status || viewBk.storedStatus)}`}>{viewBk.status || viewBk.storedStatus || 'Booked'}</span></p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Purpose</p>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{viewBk.purpose || 'No purpose specified'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credits Used</p>
                <p className="text-lg font-black mt-1 text-red-500">{fmt(viewBk.bookingCredits || 0)}</p>
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 p-5">
              <button onClick={() => setViewBk(null)}
                className="px-4 py-2.5 bg-[#0F172A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1e293b] transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
