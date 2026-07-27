import { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import { getStoredUser } from '@/lib/auth-session';
import { createInventory, getInventory, transferInventory, deleteInventory } from '@/services/inventory';
import { getOrganizationOverview } from '@/services/organization';
import { axiosPrivate } from '@/utils/axios';
import { normalizeDepartmentKey } from '@/utils/user-helpers';
import {
  Search, X, Package, ShieldCheck, ChevronDown, History, Eye, ArrowRightLeft, Building2,
  FileSpreadsheet, FileDown, Filter, Plus, Trash2, ArrowUpDown, ArrowUp, ArrowDown,
  AlertTriangle, TrendingDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageFrame from '@/components/Pages/PageFrame';

interface InventoryItem {
  recordId?: string;
  id?: string;
  inventoryCode?: string;
  name: string;
  category?: string;
  trackingType: string;
  department: string;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity?: number;
  addedByRole?: string;
  addedByUserId?: string;
  lastUpdated?: string;
  createdAt?: string;
  ledger: LedgerEntry[];
}

interface LedgerEntry {
  date?: string;
  dateLabel?: string;
  target?: string;
  action?: string;
  qty?: number;
}

interface AddStockData {
  name: string;
  category: string;
  trackingType: string;
  department: string;
  quantity: string;
}

interface TransferData {
  targetDepartment: string;
  quantity: string;
}

type SortField = 'name' | 'department' | 'availableQuantity' | 'totalQuantity' | 'createdAt';
type SortDir = 'asc' | 'desc';

const LOW_STOCK_THRESHOLD = 10;

function getRoleBand(role: string): string {
  const r = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (r === 'founder' || r === 'owner') return 'owner';
  if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
  if (r === 'admin' || r === 'admin_manager') return 'admin';
  if (r === 'manager') return 'manager';
  return 'employee';
}

function getAssignedDepartments(user: any): string[] {
  const deptField = user?.workspaceMembership?.departments;
  const sources = Array.isArray(deptField)
    ? deptField.map((d: any) => (typeof d === 'string' ? d : d?.name)).filter(Boolean)
    : [];
  const fallback = [
    user?.workspaceMembership?.department,
    user?.department,
  ];
  const all = [...sources, ...fallback];
  const seen = new Set<string>();
  return all
    .map((d) => String(d || '').trim())
    .filter(Boolean)
    .filter((d) => {
      const key = normalizeDepartmentKey(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getDepartmentOptions(user: any, inventory: InventoryItem[] = []): string[] {
  const orgDepts = Array.isArray(user?.workspace?.organizationDepartments)
    ? user.workspace.organizationDepartments.map((d: any) => d?.name).filter(Boolean)
    : [];
  const wsDepts = Array.isArray(user?.workspace?.departments) ? user.workspace.departments : [];
  const sources = [
    ...orgDepts,
    ...wsDepts,
    ...inventory.map((item) => item?.department).filter(Boolean),
  ];
  const seen = new Set<string>();
  return sources
    .map((d) => String(d || '').trim())
    .filter(Boolean)
    .filter((d) => {
      const key = normalizeDepartmentKey(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeInventoryItem(item: any): InventoryItem {
  return {
    ...item,
    recordId: item.recordId || item._id || item.id,
    id: item.id || item._id || item.inventoryCode,
    ledger: Array.isArray(item.ledger) ? item.ledger : [],
    trackingType: item.trackingType || 'Consumable',
    addedByRole: item.addedByRole || '',
    addedByUserId: item.addedByUserId || '',
    lastUpdated: item.updatedAt || item.createdAt || 'Just now',
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function TablePageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-2 lg:p-2.5 animate-pulse">
      <div className="h-6 w-48 bg-slate-100 rounded-xl mb-4" />
      <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-white rounded-3xl border border-slate-100" />
        ))}
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-5 py-4 border-b border-slate-50">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-3 flex-1 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InventoryPage() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const storedUser = getStoredUser();
  const normalizedRole = String(storedUser?.workspaceMembership?.role || storedUser?.role || '').trim().toLowerCase();
  const roleBand = getRoleBand(normalizedRole);
  const isFounder = roleBand === 'owner' || roleBand === 'super_admin';
  const assignedDepartments = useMemo(() => getAssignedDepartments(storedUser), [storedUser]);

  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [trackingFilter, setTrackingFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [activeInventoryItem, setActiveInventoryItem] = useState<InventoryItem | null>(null);
  const [transferData, setTransferData] = useState<TransferData>({ targetDepartment: '', quantity: '' });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fetchedDepartments, setFetchedDepartments] = useState<string[]>([]);

  const availableDepartments = useMemo(() => {
    if (fetchedDepartments.length > 0) {
      if (!isFounder && assignedDepartments.length > 0) {
        return fetchedDepartments.filter((d) =>
          assignedDepartments.some((ad) => normalizeDepartmentKey(ad) === normalizeDepartmentKey(d))
        );
      }
      return fetchedDepartments;
    }
    const opts = getDepartmentOptions(storedUser, inventory);
    if (!isFounder && assignedDepartments.length > 0) {
      return opts.filter((d) =>
        assignedDepartments.some((ad) => normalizeDepartmentKey(ad) === normalizeDepartmentKey(d))
      );
    }
    return opts;
  }, [storedUser, inventory, isFounder, assignedDepartments, fetchedDepartments]);

  const defaultDepartment = useMemo(() => {
    if (assignedDepartments.length > 0) return assignedDepartments[0];
    return availableDepartments[0] || '';
  }, [assignedDepartments, availableDepartments]);

  const [addStockData, setAddStockData] = useState<AddStockData>({
    name: '',
    category: 'Physical',
    trackingType: 'Consumable',
    department: defaultDepartment,
    quantity: '',
  });

  useEffect(() => {
    let isMounted = true;
    async function loadInventory() {
      try {
        const response = await getInventory();
        if (!isMounted) return;
        const raw = response?.data?.inventory || response?.inventory || [];
        setInventory(raw.map(normalizeInventoryItem));
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) setErrorMessage(error.message || 'Unable to load inventory right now.');
      } finally {
        if (isMounted) {
          setIsLoadingInventory(false);
          setIsInitialLoading(false);
        }
      }
    }
    loadInventory();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadDepartments() {
      try {
        const response = await getOrganizationOverview(axiosPrivate);
        const data = response?.data?.data || response?.data || response;
        const departments = Array.isArray(data?.departments) ? data.departments : [];
        const names = departments
          .filter((d: any) => d.isActive !== false)
          .map((d: any) => d.name)
          .filter(Boolean);
        if (isMounted && names.length > 0) {
          setFetchedDepartments(names);
        }
      } catch {
        // silently fall back to user-derived departments
      }
    }
    loadDepartments();
    return () => { isMounted = false; };
  }, []);

  const scopedInventory = useMemo(() => {
    if (isFounder) return inventory;
    if (assignedDepartments.length === 0) return inventory;
    return inventory.filter((item) =>
      assignedDepartments.some((d) => normalizeDepartmentKey(d) === normalizeDepartmentKey(item.department))
    );
  }, [inventory, isFounder, assignedDepartments]);

  const categories = useMemo(() => {
    const set = new Set(scopedInventory.map((i) => i.category).filter(Boolean));
    return Array.from(set);
  }, [scopedInventory]);

  const processedInventory = useMemo(() => {
    let items = [...scopedInventory];
    if (departmentFilter !== 'All') {
      const dk = normalizeDepartmentKey(departmentFilter);
      items = items.filter((i) => normalizeDepartmentKey(i.department) === dk);
    }
    if (categoryFilter !== 'All') {
      items = items.filter((i) => i.category === categoryFilter);
    }
    if (trackingFilter !== 'All') {
      items = items.filter((i) => i.trackingType === trackingFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.inventoryCode || '').toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'department': cmp = a.department.localeCompare(b.department); break;
        case 'availableQuantity': cmp = (a.availableQuantity || 0) - (b.availableQuantity || 0); break;
        case 'totalQuantity': cmp = (a.totalQuantity || 0) - (b.totalQuantity || 0); break;
        case 'createdAt': cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [scopedInventory, departmentFilter, categoryFilter, trackingFilter, searchQuery, sortField, sortDir]);

  const stats = useMemo(() => {
    const base = scopedInventory;
    return {
      totalSku: base.length,
      availableUnits: base.reduce((acc, i) => acc + (i.availableQuantity || 0), 0),
      totalStock: base.reduce((acc, i) => acc + (i.totalQuantity || 0), 0),
      departments: new Set(base.map((i) => i.department).filter(Boolean)).size,
      lowStock: base.filter((i) => (i.availableQuantity || 0) <= LOW_STOCK_THRESHOLD && (i.availableQuantity || 0) > 0).length,
    };
  }, [scopedInventory]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-slate-300" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-[#2563EB]" />
      : <ArrowDown size={12} className="text-[#2563EB]" />;
  }

  const handleCreateStock = async () => {
    if (!addStockData.name || !addStockData.quantity || !addStockData.department) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const response = await createInventory({
        name: addStockData.name,
        category: addStockData.category,
        trackingType: addStockData.trackingType,
        department: addStockData.department,
        totalQuantity: parseInt(addStockData.quantity, 10),
      });
      const createdItem = response?.data?.inventoryItem || response?.inventoryItem;
      if (createdItem) {
        setInventory((current) => [normalizeInventoryItem(createdItem), ...current]);
        setSuccessMessage(`"${addStockData.name}" added to ${addStockData.department} successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setIsAddStockOpen(false);
      setAddStockData({ name: '', category: 'Physical', trackingType: 'Consumable', department: defaultDepartment, quantity: '' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create inventory item right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransferStock = async () => {
    if (!transferData.targetDepartment || !transferData.quantity || !activeInventoryItem?.recordId) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const response = await transferInventory(activeInventoryItem.recordId, {
        targetDepartment: transferData.targetDepartment,
        quantity: transferData.quantity,
      });
      const sourceItem = response?.data?.sourceItem || response?.sourceItem;
      const targetItem = response?.data?.targetItem || response?.targetItem;
      if (sourceItem) {
        setInventory((current) => {
          let next = current.map((item) =>
            item.recordId === (sourceItem.recordId || sourceItem._id) ? normalizeInventoryItem(sourceItem) : item
          );
          if (targetItem) {
            const tid = targetItem.recordId || targetItem._id;
            const exists = next.some((item) => item.recordId === tid);
            if (exists) {
              next = next.map((item) => item.recordId === tid ? normalizeInventoryItem(targetItem) : item);
            } else {
              next = [normalizeInventoryItem(targetItem), ...next];
            }
          }
          return next;
        });
        setSuccessMessage(`Transferred ${transferData.quantity} units to ${transferData.targetDepartment}.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setIsTransferStockOpen(false);
      setTransferData({ targetDepartment: '', quantity: '' });
      setActiveInventoryItem(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to transfer stock right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStock = async (itemId: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      await deleteInventory(itemId);
      setInventory((current) => current.filter((item) => item.recordId !== itemId));
      setDeleteConfirmId(null);
      setSuccessMessage('Inventory item deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to delete inventory item.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitialLoading) return <TablePageSkeleton rows={5} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Inventory
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {isFounder
                  ? 'Founder View: monitor all inventory, create stock, and execute global reallocations.'
                  : 'Admin View: manage inventory for departments assigned to you.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm"
              >
                <FileDown size={16} className="text-red-500"/>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
              </button>
              <button
                type="button"
                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm"
              >
                <FileSpreadsheet size={16} className="text-emerald-500"/>
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600"><X size={14} /></button>
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12px] font-semibold text-emerald-700 flex items-center justify-between">
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
            </div>
          )}

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { label: 'Total SKU Types', value: stats.totalSku, icon: Package, iconBg: 'bg-slate-50 text-slate-600', border: '' },
              { label: 'Available Units', value: stats.availableUnits, icon: ShieldCheck, iconBg: 'bg-blue-50 text-blue-600', border: 'border-l-4 border-l-blue-500' },
              { label: 'Departments', value: stats.departments, icon: Building2, iconBg: 'bg-amber-50 text-amber-600', border: 'border-l-4 border-l-amber-500' },
              { label: 'Total Stock', value: stats.totalStock, icon: History, iconBg: 'bg-emerald-50 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${card.border}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${card.iconBg} shrink-0`}><Icon size={16} /></div>
                </div>
              );
            })}
          </div>

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Toolbar */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All', 'Consumable', 'Returnable Asset'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrackingFilter(t === 'All' ? 'All' : t)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-pmedium whitespace-nowrap transition-all ${
                      (t === 'All' && trackingFilter === 'All') || trackingFilter === t
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {t === 'All' ? 'All Types' : t}
                  </button>
                ))}
                {categories.length > 0 && (
                  <>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    <select
                      className="px-3 py-1.5 bg-white border border-slate-200/60 rounded-lg text-[11px] font-pmedium text-slate-600 outline-none cursor-pointer"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative">
                  <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[120px]"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="All">All Departments</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={12} />
                </div>
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Search item name or code..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={() => {
                    setAddStockData({ name: '', category: 'Physical', trackingType: 'Consumable', department: defaultDepartment, quantity: '' });
                    setIsAddStockOpen(true);
                  }}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Plus size={13} strokeWidth={3} /> ADD INVENTORY
                </button>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto flex-1">
              <table className="hidden lg:table w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1.5">Inventory Item <SortIcon field="name" /></span>
                    </th>
                    <th className="px-5 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('department')}>
                      <span className="flex items-center gap-1.5">Owning Dept <SortIcon field="department" /></span>
                    </th>
                    <th className="px-5 py-4 text-center cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('availableQuantity')}>
                      <span className="flex items-center gap-1.5 justify-center">Available / Total <SortIcon field="availableQuantity" /></span>
                    </th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {processedInventory.map((item) => {
                    const isLowStock = (item.availableQuantity || 0) <= LOW_STOCK_THRESHOLD && (item.availableQuantity || 0) > 0;
                    const isOut = (item.availableQuantity || 0) === 0;
                    return (
                      <tr key={item.id || item.recordId} className={`hover:bg-slate-50/50 transition-all group ${isOut ? 'bg-red-50/30' : isLowStock ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                              <Package className="text-slate-500" size={16} />
                            </div>
                            <div>
                              <p className="text-[13px] font-bold text-[#0F172A]">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-pmedium uppercase tracking-wider ${
                                  item.trackingType === 'Consumable'
                                    ? 'bg-orange-50 text-orange-600 border border-orange-100'
                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                }`}>
                                  {item.trackingType}
                                </span>
                                {item.inventoryCode && (
                                  <span className="text-[9px] font-pmedium text-slate-400">{item.inventoryCode}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/60 shadow-sm text-slate-600 rounded-lg text-[11px] font-bold tracking-wide">
                            <Building2 size={11} className="text-slate-400" /> {item.department}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <p className="font-black text-[#0F172A] text-sm">
                            {item.availableQuantity} <span className="text-[10px] text-slate-400 font-bold ml-1">/ {item.totalQuantity}</span>
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-600">
                              <AlertTriangle size={11} /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700">
                              <TrendingDown size={11} /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <ShieldCheck size={11} /> In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isFounder && item.availableQuantity > 0 && (
                              <button
                                onClick={() => {
                                  setActiveInventoryItem(item);
                                  setTransferData({ targetDepartment: '', quantity: '' });
                                  setIsTransferStockOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                                title="Transfer"
                              >
                                <ArrowRightLeft size={15} strokeWidth={2.5} />
                              </button>
                            )}
                            <button
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              title="View Ledger"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                            {(isFounder || roleBand === 'admin' || roleBand === 'manager') && (
                              <button
                                onClick={() => setDeleteConfirmId(item.recordId || item.id || '')}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 size={15} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {processedInventory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Package className="text-slate-300" size={28} />
                          </div>
                          <p className="text-slate-500 font-semibold text-sm">No inventory items found</p>
                          <p className="text-slate-400 text-[11px] max-w-xs">
                            {searchQuery || departmentFilter !== 'All' || categoryFilter !== 'All'
                              ? 'Try adjusting your filters or search query.'
                              : 'Click "ADD INVENTORY" to create your first item.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                {processedInventory.map((item) => {
                  const isLowStock = (item.availableQuantity || 0) <= LOW_STOCK_THRESHOLD && (item.availableQuantity || 0) > 0;
                  const isOut = (item.availableQuantity || 0) === 0;
                  return (
                    <div key={item.id || item.recordId} className={`bg-white border border-slate-200/60 shadow-sm rounded-[20px] p-4 sm:p-5 flex flex-col gap-3 ${isOut ? 'border-red-200' : isLowStock ? 'border-amber-200' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <Package className="text-[#2563EB]" size={16} />
                          </div>
                          <div>
                            <h3 className="text-[13px] font-bold text-[#0F172A] leading-tight mb-1">{item.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-pmedium uppercase tracking-wider ${
                                item.trackingType === 'Consumable' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                              }`}>
                                {item.trackingType}
                              </span>
                              {item.inventoryCode && (
                                <span className="text-[9px] text-slate-400">{item.inventoryCode}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {isOut && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">OUT</span>}
                        {isLowStock && !isOut && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">LOW</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                        <div>
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Owning Dept</p>
                          <p className="text-[11px] font-bold text-[#0F172A] truncate flex items-center gap-1"><Building2 size={10} className="text-slate-400" /> {item.department}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Avail / Total</p>
                          <p className="text-[11px] font-bold text-[#0F172A]">{item.availableQuantity} <span className="text-slate-500 font-medium">/ {item.totalQuantity}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        {isFounder && item.availableQuantity > 0 && (
                          <button
                            onClick={() => {
                              setActiveInventoryItem(item);
                              setTransferData({ targetDepartment: '', quantity: '' });
                              setIsTransferStockOpen(true);
                            }}
                            className="flex-1 py-2 bg-white border border-[#2563EB] text-[#2563EB] rounded-xl text-[11px] hover:bg-blue-50 font-pmedium transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <ArrowRightLeft size={13} /> Transfer
                          </button>
                        )}
                        <button
                          onClick={() => setViewingItem(item)}
                          className="flex-1 py-2 bg-slate-900 border border-slate-900 rounded-xl text-white font-pmedium hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Eye size={14} /> View
                        </button>
                        {(isFounder || roleBand === 'admin' || roleBand === 'manager') && (
                          <button
                            onClick={() => setDeleteConfirmId(item.recordId || item.id || '')}
                            className="py-2 px-3 bg-white border border-red-200 text-red-500 rounded-xl text-[11px] hover:bg-red-50 font-pmedium transition-all shadow-sm flex items-center justify-center"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {processedInventory.length === 0 && (
                  <div className="p-10 text-center text-slate-500 font-semibold bg-white rounded-[20px] border border-slate-200/60 shadow-sm">
                    <Package size={24} className="mx-auto text-slate-300 mb-2" />
                    <p>No inventory items found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "ADD INVENTORY" to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageFrame>

      {/* MODALS */}
      <AnimatePresence>
        {/* Add Inventory Modal */}
        {isAddStockOpen && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900">Add Inventory</h3>
                    <p className="text-[12px] text-slate-500">Register new stock for any department.</p>
                  </div>
                </div>
                <button onClick={() => setIsAddStockOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateStock(); }} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Package size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Item Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Item Name <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Printer Paper"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={addStockData.name}
                        onChange={(e) => setAddStockData({ ...addStockData, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                        value={addStockData.category}
                        onChange={(e) => setAddStockData({ ...addStockData, category: e.target.value })}
                      >
                        <option value="Physical">Physical</option>
                        <option value="Digital">Digital</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Pantry">Pantry</option>
                        <option value="Facilities">Facilities</option>
                        <option value="Branding">Branding</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Safety Equipment">Safety Equipment</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Type</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                        value={addStockData.trackingType}
                        onChange={(e) => setAddStockData({ ...addStockData, trackingType: e.target.value })}
                      >
                        <option value="Consumable">Consumable</option>
                        <option value="Returnable Asset">Returnable Asset</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Department <span className="text-red-400">*</span></label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                        value={addStockData.department}
                        onChange={(e) => setAddStockData({ ...addStockData, department: e.target.value })}
                      >
                        <option value="">Select department</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Quantity <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={addStockData.quantity}
                        onChange={(e) => setAddStockData({ ...addStockData, quantity: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsAddStockOpen(false)} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                  <button
                    type="submit"
                    disabled={isSaving || !addStockData.name || !addStockData.quantity || !addStockData.department}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? 'CREATING...' : 'CREATE INVENTORY'} <Plus size={13} strokeWidth={3} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {isTransferStockOpen && activeInventoryItem && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[85vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <ArrowRightLeft size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900">Transfer Stock</h3>
                    <p className="text-[12px] text-slate-500">Move units from {activeInventoryItem.department} to another department.</p>
                  </div>
                </div>
                <button onClick={() => setIsTransferStockOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleTransferStock(); }} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><ArrowRightLeft size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Transfer Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Source Department</label>
                      <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600">{activeInventoryItem.department}</div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Target Department <span className="text-red-400">*</span></label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                        value={transferData.targetDepartment}
                        onChange={(e) => setTransferData({ ...transferData, targetDepartment: e.target.value })}
                      >
                        <option value="">Select target department</option>
                        {availableDepartments
                          .filter((d) => normalizeDepartmentKey(d) !== normalizeDepartmentKey(activeInventoryItem.department))
                          .map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Quantity to Transfer <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="number"
                        min="1"
                        max={activeInventoryItem.availableQuantity}
                        placeholder={`Max: ${activeInventoryItem.availableQuantity}`}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={transferData.quantity}
                        onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex gap-3">
                      <Package className="text-[#2563EB] shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest">Transfer Notice</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">Both source and target department ledgers will be updated.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsTransferStockOpen(false)} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                  <button
                    type="submit"
                    disabled={isSaving || !transferData.targetDepartment || !transferData.quantity || parseInt(transferData.quantity) > (activeInventoryItem.availableQuantity || 0) || parseInt(transferData.quantity) <= 0}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-indigo-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? 'TRANSFERRING...' : 'CONFIRM TRANSFER'} <ArrowRightLeft size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Ledger Modal */}
        {viewingItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="bg-white/95 backdrop-blur-xl w-full max-w-xl h-[85vh] sm:h-auto sm:max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-pmedium text-[#0F172A] leading-tight pr-8">{viewingItem.name}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-sm">
                      Dept: {viewingItem.department}
                    </span>
                    {viewingItem.inventoryCode && (
                      <span className="text-[10px] font-pmedium text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-sm">
                        {viewingItem.inventoryCode}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setViewingItem(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-all absolute top-5 sm:top-6 md:top-8 right-5 sm:right-6 md:right-8">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6 [&::-webkit-scrollbar]:hidden bg-slate-50/30 min-h-[200px]">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Total</p>
                    <p className="text-lg font-black text-[#0F172A] mt-1">{viewingItem.totalQuantity}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-[9px] font-pmedium text-blue-500 uppercase tracking-widest">Available</p>
                    <p className="text-lg font-black text-blue-600 mt-1">{viewingItem.availableQuantity}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Allocated</p>
                    <p className="text-lg font-black text-[#0F172A] mt-1">{(viewingItem.totalQuantity || 0) - (viewingItem.availableQuantity || 0)}</p>
                  </div>
                </div>

                <h3 className="text-[11px] font-black text-[#2563EB] uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
                  <History size={15} /> Ledger Audit Trail
                </h3>
                <div className="space-y-4">
                  {viewingItem.ledger.length > 0 ? viewingItem.ledger.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 rounded-2xl transition-colors">
                      <div>
                        <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{entry.dateLabel || entry.date || 'Today'}</p>
                        <p className="font-bold text-[13px] text-[#0F172A]">{entry.target}</p>
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider mt-1.5 flex items-center w-max">
                          {entry.action}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-lg text-[#0F172A]">{entry.qty}</span>
                        <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest block mt-0.5">Units</span>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm mb-3">
                        <History size={18} className="text-slate-400" />
                      </div>
                      <p className="text-[13px] text-slate-500 font-semibold max-w-[200px]">No stock movements recorded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center"
            >
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Delete Inventory Item?</h3>
              <p className="text-[12px] text-slate-500 mb-6">This action cannot be undone. All ledger history will be lost.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-pmedium text-[12px] hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteStock(deleteConfirmId)}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-pmedium text-[12px] hover:bg-red-700 transition-all disabled:opacity-70"
                >
                  {isSaving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
