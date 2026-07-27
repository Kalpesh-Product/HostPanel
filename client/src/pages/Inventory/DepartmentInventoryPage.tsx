import { useState, useMemo, useEffect, type ChangeEvent } from 'react';
import { getStoredUser } from '@/lib/auth-session';
import { createInventory, getInventory, updateInventory, deleteInventory } from '@/services/inventory';
import { getOrganizationOverview } from '@/services/organization';
import { axiosPrivate } from '@/utils/axios';
import { normalizeDepartmentKey } from '@/utils/user-helpers';
import {
  Search, Plus, X, Package, TrendingDown, RefreshCw, Box, History, User,
  AlertTriangle, ShieldCheck, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter,
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
  allocatedQuantity: number;
  ledger: LedgerEntry[];
  createdAt?: string;
}

interface LedgerEntry {
  date?: string;
  dateLabel?: string;
  target?: string;
  action?: string;
  qty?: number;
}

interface NewItemData {
  name: string;
  trackingType: string;
  category: string;
  department: string;
  quantity: string;
}

interface UpdateStockData {
  itemId: string;
  actionType: string;
  quantity: string;
  reason: string;
}

type SortField = 'name' | 'category' | 'totalQuantity' | 'availableQuantity' | 'createdAt';
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

function getDepartmentLabel(user: any): string {
  const deptField = user?.workspaceMembership?.departments;
  const deptArray = Array.isArray(deptField)
    ? deptField.map((d: any) => (typeof d === 'string' ? d : d?.name)).filter(Boolean)
    : [];
  const preferred = [
    ...deptArray,
    user?.workspaceMembership?.department,
    user?.department,
  ].map((d) => String(d || '').trim()).filter(Boolean);
  return preferred[0] || 'Department';
}

function getDeptCategories(deptLabel: string): string[] {
  const map: Record<string, string[]> = {
    administration: ['Office Supplies', 'Pantry', 'Facilities'],
    hr: ['Office Supplies', 'Pantry', 'Facilities'],
    sales: ['Office Supplies', 'Facilities', 'Branding'],
    finance: ['Office Supplies', 'Facilities'],
    tech: ['Office Supplies', 'Facilities', 'Hardware'],
    it: ['Facilities', 'Office Supplies'],
    maintenance: ['Facilities', 'Safety Equipment'],
  };
  const key = deptLabel.toLowerCase();
  for (const k of Object.keys(map)) {
    if (key.includes(k)) return map[k];
  }
  return ['Office Supplies', 'Facilities'];
}

function getCategoryStyle(category?: string): { bg: string } {
  switch (category) {
    case 'Office Supplies': return { bg: 'bg-blue-50 text-blue-700' };
    case 'Pantry': return { bg: 'bg-amber-50 text-amber-700' };
    case 'Facilities': return { bg: 'bg-emerald-50 text-emerald-700' };
    case 'Hardware': return { bg: 'bg-purple-50 text-purple-700' };
    case 'Branding': return { bg: 'bg-pink-50 text-pink-700' };
    case 'Safety Equipment': return { bg: 'bg-red-50 text-red-700' };
    default: return { bg: 'bg-slate-100 text-slate-700' };
  }
}

function normalizeInventoryItem(item: any): InventoryItem {
  const availableQuantity =
    typeof item.availableQuantity === 'number'
      ? item.availableQuantity
      : Math.max(0, (item.totalQuantity || 0) - (item.allocatedQuantity || 0));
  return {
    ...item,
    recordId: item.recordId || item._id || item.id,
    id: item.id || item._id || item.inventoryCode,
    inventoryCode: item.inventoryCode || item.id,
    ledger: Array.isArray(item.ledger) ? item.ledger : [],
    availableQuantity,
    allocatedQuantity: typeof item.allocatedQuantity === 'number'
      ? item.allocatedQuantity
      : Math.max(0, (item.totalQuantity || 0) - availableQuantity),
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

function TablePageSkeleton() {
  return (
    <div className="p-2 lg:p-2.5 animate-pulse space-y-4">
      <div className="h-7 w-60 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 bg-white rounded-3xl border border-gray-100" />
        ))}
      </div>
      <div className="h-[420px] bg-white rounded-[2.5rem] border border-gray-100" />
    </div>
  );
}

export function DepartmentInventoryPage() {
  const storedUser = getStoredUser();
  const normalizedRole = String(storedUser?.workspaceMembership?.role || storedUser?.role || '').trim().toLowerCase();
  const roleBand = getRoleBand(normalizedRole);
  const deptLabel = getDepartmentLabel(storedUser);
  const categories = getDeptCategories(deptLabel);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fetchedDepartments, setFetchedDepartments] = useState<string[]>([]);

  const [newItem, setNewItem] = useState<NewItemData>({
    name: '',
    trackingType: 'Consumable',
    category: categories[0] || 'Office Supplies',
    department: deptLabel,
    quantity: '',
  });
  const [updateStock, setUpdateStock] = useState<UpdateStockData>({
    itemId: '', actionType: 'increase', quantity: '', reason: '',
  });

  useEffect(() => {
    let isMounted = true;
    async function loadInventory() {
      try {
        const response = await getInventory();
        if (!isMounted) return;
        const items = Array.isArray(response?.data?.inventory) ? response.data.inventory
          : Array.isArray(response?.inventory) ? response.inventory
          : [];
        const normalized = items
          .map(normalizeInventoryItem)
          .filter((item: InventoryItem) =>
            normalizeDepartmentKey(String(item.department || '')) === normalizeDepartmentKey(deptLabel)
          );
        setInventory(normalized);
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load inventory right now.');
          setInventory([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingInventory(false);
          setIsInitialLoading(false);
        }
      }
    }
    loadInventory();
    return () => { isMounted = false; };
  }, [deptLabel]);

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
        // silently fall back
      }
    }
    loadDepartments();
    return () => { isMounted = false; };
  }, []);

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

  const processedInventory = useMemo(() => {
    let items = [...inventory];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.inventoryCode || '').toLowerCase().includes(q) ||
        (i.category || '').toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'category': cmp = (a.category || '').localeCompare(b.category || ''); break;
        case 'totalQuantity': cmp = (a.totalQuantity || 0) - (b.totalQuantity || 0); break;
        case 'availableQuantity': cmp = (a.availableQuantity || 0) - (b.availableQuantity || 0); break;
        case 'createdAt': cmp = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [inventory, searchQuery, sortField, sortDir]);

  const totalItems = processedInventory.length;
  const totalStock = processedInventory.reduce((acc, i) => acc + (i.totalQuantity || 0), 0);
  const availableStock = processedInventory.reduce((acc, i) => acc + (i.availableQuantity || 0), 0);
  const lowStockItems = processedInventory.filter((i) => (i.availableQuantity || 0) <= LOW_STOCK_THRESHOLD && (i.availableQuantity || 0) > 0).length;

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const response = await createInventory({
        name: newItem.name,
        category: newItem.category,
        trackingType: 'Consumable',
        department: deptLabel,
        totalQuantity: parseInt(newItem.quantity, 10),
      });
      const createdItem = response?.data?.inventoryItem || response?.inventoryItem;
      if (createdItem) {
        setInventory((current) => [normalizeInventoryItem(createdItem), ...current]);
        setSuccessMessage(`"${newItem.name}" added successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setIsAddModalOpen(false);
      setNewItem({ name: '', trackingType: 'Consumable', category: categories[0] || 'Office Supplies', department: deptLabel, quantity: '' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to add inventory item right now.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStock = async () => {
    if (!updateStock.itemId || !updateStock.quantity) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const response = await updateInventory(updateStock.itemId, {
        actionType: updateStock.actionType,
        quantity: parseInt(updateStock.quantity, 10),
        reason: updateStock.reason,
      });
      const updatedItem = response?.data?.inventoryItem || response?.inventoryItem;
      if (updatedItem) {
        const normalized = normalizeInventoryItem(updatedItem);
        setInventory((current) => current.map((item) => (item.recordId === normalized.recordId ? normalized : item)));
        setSuccessMessage('Stock updated successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setIsUpdateModalOpen(false);
      setUpdateStock({ itemId: '', actionType: 'increase', quantity: '', reason: '' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to update stock right now.');
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

  if (isInitialLoading) return <TablePageSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                <Package size={18} /> Department Inventory
              </h2>
              <p className="text-[11px] font-pmedium text-[#2563EB] uppercase tracking-widest mt-1">{deptLabel}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setIsUpdateModalOpen(true)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:text-[#2563EB] hover:border-[#2563EB] transition-all whitespace-nowrap"
              >
                <RefreshCw size={14} strokeWidth={2.5} /> UPDATE STOCK
              </button>
              <button
                onClick={() => {
                  setNewItem({ name: '', trackingType: 'Consumable', category: categories[0] || 'Office Supplies', department: deptLabel, quantity: '' });
                  setIsAddModalOpen(true);
                }}
                className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
              >
                <Plus size={14} strokeWidth={3} /> ADD NEW ITEM
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
              { label: 'Tracked Items', value: totalItems, icon: Box, iconBg: 'bg-blue-50 text-blue-600', border: '' },
              { label: 'Available Stock', value: availableStock, icon: ShieldCheck, iconBg: 'bg-emerald-50 text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
              { label: 'Total Stock', value: totalStock, icon: History, iconBg: 'bg-purple-50 text-purple-600', border: 'border-l-4 border-l-purple-500' },
              { label: 'Low Stock Alerts', value: lowStockItems, icon: TrendingDown, iconBg: 'bg-red-50 text-red-500', border: 'border-l-4 border-l-red-500' },
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
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/50">
              <h2 className="text-[12px] font-pmedium text-primary tracking-tight hidden lg:block">Inventory Directory</h2>
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto flex-1">
              <table className="hidden lg:table w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1.5">Item Name <SortIcon field="name" /></span>
                    </th>
                    <th className="px-5 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('category')}>
                      <span className="flex items-center gap-1.5">Category <SortIcon field="category" /></span>
                    </th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4 text-center cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('totalQuantity')}>
                      <span className="flex items-center gap-1.5 justify-center">Total <SortIcon field="totalQuantity" /></span>
                    </th>
                    <th className="px-5 py-4 text-center">Allocated</th>
                    <th className="px-5 py-4 text-center cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('availableQuantity')}>
                      <span className="flex items-center gap-1.5 justify-center">Available <SortIcon field="availableQuantity" /></span>
                    </th>
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {processedInventory.map((item) => {
                    const style = getCategoryStyle(item.category);
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
                              <p className="font-bold text-[#0F172A] text-[13px]">{item.name}</p>
                              {item.inventoryCode && (
                                <span className="text-[9px] font-pmedium text-slate-400">{item.inventoryCode}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-pmedium ${style.bg}`}>
                            {item.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-pmedium uppercase tracking-widest border ${item.trackingType === 'Consumable' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                            {item.trackingType}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-black text-slate-900">{item.totalQuantity}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-bold text-[#2563EB]">{item.allocatedQuantity}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-black ${isOut ? 'bg-red-100 text-red-600' : isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-600'}`}>
                            {item.availableQuantity}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">
                              <AlertTriangle size={10} /> OUT
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
                              <TrendingDown size={10} /> LOW
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                              <ShieldCheck size={10} /> OK
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              title="View Ledger"
                            >
                              <History size={15} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(item.recordId || item.id || '')}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 size={15} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {processedInventory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Package className="text-slate-300" size={28} />
                          </div>
                          <p className="text-slate-500 font-semibold text-sm">No inventory items in {deptLabel}</p>
                          <p className="text-slate-400 text-[11px]">Click "ADD NEW ITEM" to register your first inventory entry.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                {processedInventory.map((item) => {
                  const style = getCategoryStyle(item.category);
                  const isLowStock = (item.availableQuantity || 0) <= LOW_STOCK_THRESHOLD && (item.availableQuantity || 0) > 0;
                  const isOut = (item.availableQuantity || 0) === 0;
                  return (
                    <div key={item.id || item.recordId} className={`bg-white border shadow-sm rounded-[20px] p-4 sm:p-5 flex flex-col gap-3 ${isOut ? 'border-red-200' : isLowStock ? 'border-amber-200' : 'border-slate-200/60'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                            <Package className="text-[#2563EB]" size={16} />
                          </div>
                          <div>
                            <h3 className="text-[13px] font-bold text-[#0F172A] leading-tight mb-1">{item.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-pmedium ${style.bg}`}>
                                {item.category || 'Other'}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-pmedium uppercase tracking-wider border ${item.trackingType === 'Consumable' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                {item.trackingType}
                              </span>
                            </div>
                          </div>
                        </div>
                        {isOut && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">OUT</span>}
                        {isLowStock && !isOut && <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">LOW</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                        <div>
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Total</p>
                          <p className="text-[11px] font-black text-[#0F172A]">{item.totalQuantity}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium text-[#2563EB] uppercase tracking-widest mb-0.5">Allocated</p>
                          <p className="text-[11px] font-bold text-[#2563EB]">{item.allocatedQuantity}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Available</p>
                          <p className={`text-[11px] font-black ${isOut ? 'text-red-600' : isLowStock ? 'text-amber-700' : 'text-green-600'}`}>{item.availableQuantity}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="flex-1 py-2 bg-slate-900 border border-slate-900 rounded-xl text-white font-pmedium hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <History size={14} /> Ledger
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.recordId || item.id || '')}
                          className="py-2 px-3 bg-white border border-red-200 text-red-500 rounded-xl text-[11px] hover:bg-red-50 font-pmedium transition-all shadow-sm flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {processedInventory.length === 0 && (
                  <div className="p-10 text-center text-slate-500 font-semibold bg-white rounded-[20px] border border-slate-200/60 shadow-sm">
                    <Package size={24} className="mx-auto text-slate-300 mb-2" />
                    <p>No inventory in {deptLabel} yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">Click "ADD NEW ITEM" to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </PageFrame>

      {/* MODALS */}
      <AnimatePresence>
        {/* Add New Item Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Plus size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900">Add New Item</h3>
                    <p className="text-[12px] text-slate-500">Register new inventory for {deptLabel}.</p>
                  </div>
                </div>
                <button onClick={() => setIsAddModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddItem(); }} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
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
                        placeholder="e.g. A4 Printer Paper"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category</label>
                      <select
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      >
                        {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Initial Stock <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
                  <Package className="text-[#2563EB] shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest">Department Locked</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{deptLabel} will own this inventory entry.</p>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                  <button
                    type="submit"
                    disabled={!newItem.name || !newItem.quantity || isSaving}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? 'SUBMITTING...' : 'SUBMIT ENTRY'} <Plus size={13} strokeWidth={3} />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Update Stock Modal */}
        {isUpdateModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[85vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900">Update Stock</h3>
                    <p className="text-[12px] text-slate-500">Adjust existing inventory quantities.</p>
                  </div>
                </div>
                <button onClick={() => setIsUpdateModalOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateStock(); }} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0"><RefreshCw size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Adjustment Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Select Item <span className="text-red-400">*</span></label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                        value={updateStock.itemId}
                        onChange={(e) => setUpdateStock({ ...updateStock, itemId: e.target.value })}
                      >
                        <option value="">Choose Item to Update</option>
                        {inventory.map((a) => (
                          <option key={a.recordId || a.id} value={a.recordId || a.id || ''}>
                            {a.name} (Available: {typeof a.availableQuantity === 'number' ? a.availableQuantity : Math.max(0, a.totalQuantity - (a.allocatedQuantity || 0))})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Action <span className="text-red-400">*</span></label>
                      <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                        <button type="button" onClick={() => setUpdateStock({ ...updateStock, actionType: 'increase' })}
                          className={`flex-1 py-2 rounded-md text-[11px] font-pmedium transition-all ${updateStock.actionType === 'increase' ? 'bg-white shadow-sm text-green-600 border border-slate-200' : 'text-slate-400'}`}>
                          + Add
                        </button>
                        <button type="button" onClick={() => setUpdateStock({ ...updateStock, actionType: 'decrease' })}
                          className={`flex-1 py-2 rounded-md text-[11px] font-pmedium transition-all ${updateStock.actionType === 'decrease' ? 'bg-white shadow-sm text-red-600 border border-slate-200' : 'text-slate-400'}`}>
                          - Remove
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Adjustment Qty <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={updateStock.quantity}
                        onChange={(e) => setUpdateStock({ ...updateStock, quantity: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Reason for Update</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. New shipment arrived, restocked pantry..."
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none placeholder:text-slate-400"
                        value={updateStock.reason}
                        onChange={(e) => setUpdateStock({ ...updateStock, reason: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsUpdateModalOpen(false)} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                  <button
                    type="submit"
                    disabled={!updateStock.itemId || !updateStock.quantity || isSaving}
                    className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? 'UPDATING...' : 'UPDATE STOCK'} <RefreshCw size={13} strokeWidth={2.5} />
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
                      <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded shadow-sm">
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
                    <p className="text-lg font-black text-[#0F172A] mt-1">{viewingItem.allocatedQuantity}</p>
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

export default DepartmentInventoryPage;
