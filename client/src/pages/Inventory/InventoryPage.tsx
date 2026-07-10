import { useState, useMemo, useEffect } from 'react';
import { getStoredUser } from '@/lib/auth-session';
import { createInventory, getInventory, transferInventory } from '@/services/inventory';
import { normalizeDepartmentKey } from '@/utils/user-helpers';
import {
  Search, X, Package, ShieldCheck, ChevronDown, History, Eye, ArrowRightLeft, Building2,FileSpreadsheet,FileDown, Filter, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageFrame from '@/components/Pages/PageFrame';

interface InventoryItem {
  recordId?: string;
  id?: string;
  name: string;
  category?: string;
  trackingType: string;
  department: string;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity?: number;
  assignedToUserId?: string | null;
  lastUpdated?: string;
  ledger: LedgerEntry[];
}

interface LedgerEntry {
  date?: string;
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

function getAssignedDepartments(user: any): string[] {
  const sources = [
    ...(Array.isArray(user?.workspaceMembership?.departments) ? user.workspaceMembership.departments : []),
    user?.workspaceMembership?.department,
    ...(Array.isArray(user?.departments) ? user.departments : []),
    user?.department,
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

function getDepartmentOptions(user: any, inventory: InventoryItem[] = []): string[] {
  const sources = [
    ...(Array.isArray(user?.workspace?.organizationDepartments)
      ? user.workspace.organizationDepartments.map((d: any) => d?.name).filter(Boolean)
      : []),
    ...(Array.isArray(user?.workspace?.departments) ? user.workspace.departments : []),
    ...(Array.isArray(user?.workspaceDraft?.departments) ? user.workspaceDraft.departments : []),
    ...(Array.isArray(user?.workspaceMembership?.departments) ? user.workspaceMembership.departments : []),
    ...(Array.isArray(user?.departments) ? user.departments : []),
    user?.workspaceMembership?.department,
    user?.department,
    user?.workspace?.department,
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

function resolveDefaultDepartment(user: any, departments: string[] = []): string {
  const preferred = [
    ...(Array.isArray(user?.workspaceMembership?.departments) ? user.workspaceMembership.departments : []),
    user?.workspaceMembership?.department,
    user?.department,
    user?.workspace?.department,
  ]
    .map((d) => String(d || '').trim())
    .filter(Boolean);

  for (const pref of preferred) {
    const match = departments.find(
      (d) => normalizeDepartmentKey(d) === normalizeDepartmentKey(pref),
    );
    if (match) return match;
  }
  return departments[0] || '';
}

function normalizeInventoryItem(item: any): InventoryItem {
  return {
    ...item,
    recordId: item.recordId,
    id: item.id,
    ledger: Array.isArray(item.ledger) ? item.ledger : [],
    trackingType: item.trackingType || 'Consumable',
    assignedToUserId: item.assignedToUserId || null,
    lastUpdated: item.lastUpdated || 'Just now',
  };
}

function TablePageSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="p-2 lg:p-2.5 animate-pulse">
      <div className="h-6 w-48 bg-slate-100 rounded-xl mb-4" />
      <div className="h-4 w-72 bg-slate-100 rounded-xl mb-6" />
      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden">
        <div className="px-3.5 py-3 border-b border-slate-100">
          <div className="h-3 w-full bg-slate-100 rounded-lg" />
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-3.5 py-3 border-b border-slate-50">
            {Array.from({ length: columns }).map((_, j) => (
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
  const isAdminScope = normalizedRole === 'admin';

  const assignedDepartments = useMemo(() => getAssignedDepartments(storedUser), [storedUser]);
  const assignedDepartmentKeys = useMemo(
    () => new Set(assignedDepartments.map((d) => normalizeDepartmentKey(d))),
    [assignedDepartments],
  );

  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [activeInventoryItem, setActiveInventoryItem] = useState<InventoryItem | null>(null);
  const [transferData, setTransferData] = useState<TransferData>({ targetDepartment: '', quantity: '' });

  useEffect(() => {
    if (!isLoadingInventory) setIsInitialLoading(false);
  }, [isLoadingInventory]);

  const availableDepartments = useMemo(() => {
    const opts = getDepartmentOptions(storedUser, inventory);
    const scoped = opts.length > 0
      ? opts
      : Array.from(new Set(inventory.map((inv) => inv.department).filter(Boolean)));
    if (!isAdminScope || assignedDepartmentKeys.size === 0) return scoped;
    return scoped.filter((d) => assignedDepartmentKeys.has(normalizeDepartmentKey(d)));
  }, [storedUser, inventory, isAdminScope, assignedDepartmentKeys]);

  const defaultDepartment = useMemo(
    () => resolveDefaultDepartment(storedUser, availableDepartments),
    [availableDepartments, storedUser],
  );

  const [addStockData, setAddStockData] = useState<AddStockData>({
    name: '',
    category: 'Physical',
    trackingType: 'Consumable',
    department: defaultDepartment,
    quantity: '',
  });

  const scopedInventory = useMemo(() => {
    if (!isAdminScope || assignedDepartmentKeys.size === 0) return inventory;
    return inventory.filter((item) => assignedDepartmentKeys.has(normalizeDepartmentKey(item.department)));
  }, [inventory, isAdminScope, assignedDepartmentKeys]);

  useEffect(() => {
    let isMounted = true;
    async function loadInventory() {
      try {
        const response = await getInventory();
        if (!isMounted) return;
        setInventory((response?.data?.inventory || []).map(normalizeInventoryItem));
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) setErrorMessage(error.message || 'Unable to load inventory right now.');
      } finally {
        if (isMounted) setIsLoadingInventory(false);
      }
    }
    loadInventory();
    return () => { isMounted = false; };
  }, []);

  const processedInventory = useMemo(() => {
    const deptFilterKey = departmentFilter === 'All' ? '' : normalizeDepartmentKey(departmentFilter);
    return scopedInventory.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === 'All'
        ? true
        : normalizeDepartmentKey(item.department) === deptFilterKey;
      return matchesSearch && matchesDept;
    });
  }, [scopedInventory, searchQuery, departmentFilter]);

  const handleTransferStock = async () => {
    if (!transferData.targetDepartment || !transferData.quantity || !activeInventoryItem?.recordId) return;
    setErrorMessage('');
    setIsTransferring(true);
    try {
      const response = await transferInventory(activeInventoryItem.recordId, {
        targetDepartment: transferData.targetDepartment,
        quantity: transferData.quantity,
      });
      const sourceItem = response?.data?.sourceItem ? normalizeInventoryItem(response.data.sourceItem) : null;
      const targetItem = response?.data?.targetItem ? normalizeInventoryItem(response.data.targetItem) : null;
      if (sourceItem) {
        setInventory((current) => {
          let next = current.map((item) => item.recordId === sourceItem.recordId ? sourceItem : item);
          if (targetItem) {
            const targetExists = next.some((item) => item.recordId === targetItem.recordId);
            if (targetExists) {
              next = next.map((item) => item.recordId === targetItem.recordId ? targetItem : item);
            } else {
              next = [targetItem, ...next];
            }
          }
          return next;
        });
      }
      setIsTransferStockOpen(false);
      setTransferData({ targetDepartment: '', quantity: '' });
      setActiveInventoryItem(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to transfer stock right now.');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCreateStock = async () => {
    if (!addStockData.name || !addStockData.quantity || !addStockData.department) return;
    setErrorMessage('');
    setIsTransferring(true);
    try {
      const response = await createInventory({
        name: addStockData.name,
        category: addStockData.category,
        trackingType: addStockData.trackingType,
        department: addStockData.department,
        totalQuantity: parseInt(addStockData.quantity, 10),
      });
      const createdItem = response?.data?.inventoryItem;
      if (createdItem) {
        setInventory((current) => [normalizeInventoryItem(createdItem), ...current]);
      }
      setIsAddStockOpen(false);
      setAddStockData({ name: '', category: 'Physical', trackingType: 'Consumable', department: defaultDepartment, quantity: '' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create inventory item right now.');
    } finally {
      setIsTransferring(false);
    }
  };

  if (isInitialLoading) return <TablePageSkeleton rows={5} columns={4} />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* 1. HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                Inventory
              </h2>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                {isAdminScope
                  ? 'Admin view: monitor inventory only for the departments assigned to you.'
                  : 'Founder view: monitor tracking, create inventory, and execute global stock reallocations.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                // onClick={handleExportPDF}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileDown size={16} className="text-red-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                              </button>
                              <button
                                type="button"
                                // onClick={handleExportExcel}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileSpreadsheet size={16} className="text-emerald-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                              </button>
                              
                            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">
              {errorMessage}
            </div>
          )}

          {/* 2. STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total SKU Types</p>
                <p className="text-[15px] font-black text-slate-900">{scopedInventory.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 text-slate-600 shrink-0"><Package size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-blue-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Available Units</p>
                <p className="text-[15px] font-black text-[#2563EB]">
                  {scopedInventory.reduce((acc, curr) => acc + (curr.availableQuantity || 0), 0)}
                </p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-[#2563EB] shrink-0"><ShieldCheck size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">Departments</p>
                <p className="text-[15px] font-black text-slate-900">{availableDepartments.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 shrink-0"><Building2 size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Stock</p>
                <p className="text-[15px] font-black text-slate-900">
                  {scopedInventory.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0)}
                </p>
              </div>
              <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 shrink-0"><History size={16} /></div>
            </div>
          </div>

          {/* 3. DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Toolbar */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <h2 className="text-[12px] font-pmedium text-primary tracking-tight hidden lg:block">Inventory Directory</h2>
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative">
                  <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                  <select
                    className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[120px]"
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
                    placeholder="Search item name..."
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
              className="btn-pill bg-[#2563EB] text-white px-4 py-2.5 flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
            >
              <Plus size={13} strokeWidth={3} /> ADD INVENTORY
            </button>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto flex-1">
              <table className="hidden lg:table w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Inventory Item</th>
                    <th className="px-5 py-4">Owning Dept</th>
                    <th className="px-5 py-4 text-center">Available / Total</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {processedInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                            <Package className="text-slate-500" size={16} />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#0F172A]">{item.name}</p>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded text-[9px] font-black uppercase tracking-wider ${item.trackingType === 'Consumable' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                              {item.trackingType}
                            </span>
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
                        <div className="flex items-center justify-center gap-1.5">
                          {item.availableQuantity > 0 && (
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
                        </div>
                      </td>
                    </tr>
                  ))}
                  {processedInventory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Package className="text-slate-300" size={24} />
                          </div>
                          <p className="text-slate-500 font-semibold text-sm">No inventory matched your filters</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                {processedInventory.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200/60 shadow-sm rounded-[20px] p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                          <Package className="text-[#2563EB]" size={16} />
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-[#0F172A] leading-tight mb-1">{item.name}</h3>
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${item.trackingType === 'Consumable' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                            {item.trackingType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Owning Dept</p>
                        <p className="text-[11px] font-bold text-[#0F172A] truncate flex items-center gap-1"><Building2 size={10} className="text-slate-400" /> {item.department}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Avail / Total</p>
                        <p className="text-[11px] font-bold text-[#0F172A]">{item.availableQuantity} <span className="text-slate-500 font-medium">/ {item.totalQuantity}</span></p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {item.availableQuantity > 0 && (
                        <button
                          onClick={() => {
                            setActiveInventoryItem(item);
                            setTransferData({ targetDepartment: '', quantity: '' });
                            setIsTransferStockOpen(true);
                          }}
                          className="btn-pill flex-1 py-2 bg-white border border-[#2563EB] text-[#2563EB] hover:bg-blue-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <ArrowRightLeft size={13} /> Transfer
                        </button>
                      )}
                      <button
                        onClick={() => setViewingItem(item)}
                        className="btn-pill flex-1 py-2 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Eye size={14} /> View
                      </button>
                    </div>
                  </div>
                ))}
                {processedInventory.length === 0 && (
                  <div className="p-10 text-center text-slate-500 font-semibold bg-white rounded-[20px] border border-slate-200/60 shadow-sm">
                    No inventory matched your filters.
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
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="bg-white/95 backdrop-blur-xl w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-pmedium flex items-center gap-2 text-primary">
                     Add Inventory
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-2">
                    Create stock directly in any department
                  </p>
                </div>
                <button onClick={() => setIsAddStockOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Name</label>
                  <input
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] outline-none shadow-sm"
                    value={addStockData.name}
                    onChange={(e) => setAddStockData({ ...addStockData, name: e.target.value })}
                    placeholder="e.g. Printer Paper"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] outline-none shadow-sm appearance-none cursor-pointer"
                        value={addStockData.category}
                        onChange={(e) => setAddStockData({ ...addStockData, category: e.target.value })}
                      >
                        <option value="Physical">Physical</option>
                        <option value="Digital">Digital</option>
                        <option value="Other">Other</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                    <div className="relative">
                      <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] outline-none shadow-sm appearance-none cursor-pointer"
                        value={addStockData.trackingType}
                        onChange={(e) => setAddStockData({ ...addStockData, trackingType: e.target.value })}
                      >
                        <option value="Consumable">Consumable</option>
                        <option value="Returnable Asset">Returnable Asset</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold text-[#0F172A] focus:border-[#2563EB] outline-none shadow-sm appearance-none cursor-pointer"
                      value={addStockData.department}
                      onChange={(e) => setAddStockData({ ...addStockData, department: e.target.value })}
                    >
                      <option value="">Select department</option>
                      {availableDepartments.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-[#0F172A] focus:border-[#2563EB] outline-none shadow-sm"
                    value={addStockData.quantity}
                    onChange={(e) => setAddStockData({ ...addStockData, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                <button onClick={() => setIsAddStockOpen(false)} className="btn-pill flex-1 py-3.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleCreateStock}
                  disabled={isTransferring || !addStockData.name || !addStockData.quantity || !addStockData.department}
                  className="btn-pill flex-1 py-3.5 bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.2)] hover:bg-blue-700 transition-all disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isTransferring ? 'Saving...' : 'Create Inventory'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Transfer Modal */}
        {isTransferStockOpen && activeInventoryItem && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="bg-white/95 backdrop-blur-xl w-full max-w-lg h-[75vh] sm:h-auto sm:max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 bg-indigo-50/50 border-b border-indigo-100 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-pmedium text-indigo-900 flex items-center gap-2">
                    <ArrowRightLeft size={22} className="text-indigo-600" /> Reallocate Stock
                  </h2>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-widest mt-2">From: {activeInventoryItem.department}</p>
                </div>
                <button onClick={() => setIsTransferStockOpen(false)} className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-all">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Department</label>
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-[#0F172A] focus:border-[#2563EB] outline-none appearance-none transition-all cursor-pointer shadow-sm"
                      value={transferData.targetDepartment}
                      onChange={(e) => setTransferData({ ...transferData, targetDepartment: e.target.value })}
                    >
                      <option value="">-- Choose Target Dept --</option>
                      {availableDepartments
                        .filter((d) => normalizeDepartmentKey(d) !== normalizeDepartmentKey(activeInventoryItem.department))
                        .map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity to Transfer</label>
                  <input
                    type="number"
                    min="1"
                    max={activeInventoryItem.availableQuantity}
                    placeholder={`Max: ${activeInventoryItem.availableQuantity}`}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-[#0F172A] focus:border-[#2563EB] outline-none transition-all shadow-sm placeholder:font-medium placeholder:text-slate-400"
                    value={transferData.quantity}
                    onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                  />
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                  <Package className="text-[#2563EB] shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-[11px] font-black text-[#2563EB] uppercase tracking-wider mb-1">Transfer Warning</h4>
                    <p className="text-[12px] font-semibold text-slate-600 leading-snug">
                      Transferring inventory from {activeInventoryItem.department} to {transferData.targetDepartment || 'a new department'}. Both departments' ledgers will be updated.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 flex gap-3">
                <button onClick={() => setIsTransferStockOpen(false)} className="btn-pill flex-1 py-3.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleTransferStock}
                  disabled={isTransferring || !transferData.targetDepartment || !transferData.quantity || parseInt(transferData.quantity) > activeInventoryItem.availableQuantity || parseInt(transferData.quantity) <= 0}
                  className="btn-pill flex-1 py-3.5 bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] hover:bg-indigo-700 transition-all disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
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
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-sm">
                      Dept: {viewingItem.department}
                    </span>
                  </div>
                </div>
                <button onClick={() => setViewingItem(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-all absolute top-5 sm:top-6 md:top-8 right-5 sm:right-6 md:right-8">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6 [&::-webkit-scrollbar]:hidden bg-slate-50/30 min-h-[200px]">
                <h3 className="text-[11px] font-black text-[#2563EB] uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
                  <History size={15} /> Department Ledger Audit
                </h3>
                <div className="space-y-4">
                  {viewingItem.ledger.length > 0 ? viewingItem.ledger.map((entry, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 rounded-2xl transition-colors">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{entry.date}</p>
                        <p className="font-bold text-[13px] text-[#0F172A]">{entry.target}</p>
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider mt-1.5 flex items-center w-max">
                          {entry.action}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-lg text-[#0F172A]">{entry.qty}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">Units</span>
                      </div>
                    </div>
                  )) : (
                    <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-sm mb-3">
                        <History size={18} className="text-slate-400" />
                      </div>
                      <p className="text-[13px] text-slate-500 font-semibold max-w-[200px]">No stock movement recorded in the ledger yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
