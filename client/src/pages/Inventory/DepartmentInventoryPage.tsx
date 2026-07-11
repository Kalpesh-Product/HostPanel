import React, { useState, useMemo, useEffect, useRef } from 'react';
import { getStoredUser } from '@/lib/auth-session';
import { createInventory, getInventory, updateInventory } from '@/services/inventory';
import { normalizeDepartmentKey } from '@/utils/user-helpers';
import * as XLSX from 'xlsx';
import {
  Download, Search, Plus, X, Package, TrendingDown,
  RefreshCw, FileText, ChevronDown, Box, History, User,
  Droplets, Coffee, UploadCloud,
} from 'lucide-react';
import PageFrame from '@/components/Pages/PageFrame';

// --- TYPE DEFINITIONS ---
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
}

interface LedgerEntry {
  date?: string;
  dateLabel?: string;
  target?: string;
  action?: string;
  qty?: number;
}

interface AllocationLog {
  id: string;
  employee: string;
  itemName: string;
  quantity: number | undefined;
  date: string;
  note: string;
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

interface BulkUploadSummary {
  fileName: string;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  failedCount: number;
  failedRows: string[];
}

// --- HELPERS ---
function formatDepartmentName(value: string): string {
  const acronymCandidates = new Set(['it', 'hr', 'qa', 'ui', 'ux', 'crm', 'erp', 'pos']);
  return String(value || '')
    .replace(/-/g, ' ')
    .trim()
    .split(/\s+/)
    .map((word) => {
      const normalized = word.toLowerCase();
      if (word === word.toUpperCase()) return word;
      if (acronymCandidates.has(normalized)) return normalized.toUpperCase();
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join(' ');
}

function getDepartmentLabel(user: any): string {
  const orgDepts = Array.isArray(user?.workspace?.organizationDepartments)
    ? user.workspace.organizationDepartments.map((d: any) => d?.name).filter(Boolean)
    : [];
  const preferred = [
    ...(Array.isArray(user?.workspaceMembership?.departments) ? user.workspaceMembership.departments : []),
    user?.workspaceMembership?.department,
    user?.department,
    user?.workspace?.department,
  ]
    .map((d) => String(d || '').trim())
    .filter(Boolean);

  for (const pref of preferred) {
    const match = orgDepts.find(
      (d: string) => normalizeDepartmentKey(d) === normalizeDepartmentKey(pref),
    );
    if (match) return formatDepartmentName(match);
  }
  return formatDepartmentName(preferred[0] || orgDepts[0] || 'Department');
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

function getCategoryStyle(category?: string): { bg: string; icon: React.ReactElement } {
  switch (category) {
    case 'Office Supplies': return { bg: 'bg-blue-50 text-blue-700', icon: <FileText size={13} /> };
    case 'Pantry': return { bg: 'bg-amber-50 text-amber-700', icon: <Coffee size={13} /> };
    case 'Facilities': return { bg: 'bg-emerald-50 text-emerald-700', icon: <Droplets size={13} /> };
    default: return { bg: 'bg-slate-100 text-slate-700', icon: <Package size={13} /> };
  }
}

const BULK_TEMPLATE_HEADERS = ['Item Name', 'Category', 'Initial Stock'];
const BULK_COLUMN_ALIASES: Record<string, string[]> = {
  name: ['item name', 'name', 'inventory item', 'item', 'title'],
  category: ['category', 'type', 'inventory category'],
  quantity: ['initial stock', 'quantity', 'qty', 'stock', 'total quantity'],
};

function normalizeBulkHeader(value: string): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveBulkCellValue(row: any, aliases: string[] = [], fallbackIndex = -1): any {
  const entries = Object.entries(row || {}).map(([key, value]) => [normalizeBulkHeader(key), value]);
  for (const alias of aliases) {
    const match = entries.find(([key]) => key === normalizeBulkHeader(alias));
    if (match && String(match[1] ?? '').trim()) return match[1];
  }
  if (fallbackIndex >= 0) {
    const fb = row?.[fallbackIndex];
    if (String(fb ?? '').trim()) return fb;
  }
  return '';
}

function normalizeBulkCategory(value: string, categories: string[] = []): string {
  const normalized = String(value || '').trim();
  if (!normalized) return categories[0] || 'Office Supplies';
  const match = categories.find((c) => String(c || '').trim().toLowerCase() === normalized.toLowerCase());
  return match || normalized;
}

function normalizeBulkQuantity(value: any): number {
  const n = typeof value === 'number' ? value : parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function buildBulkInventoryPayload(row: any, deptLabel: string, categories: string[] = []): any {
  const name = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.name, 0)).trim();
  if (!name) return null;
  return {
    name,
    category: normalizeBulkCategory(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.category, 1), categories),
    trackingType: 'Consumable',
    department: deptLabel,
    totalQuantity: normalizeBulkQuantity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.quantity, 2)),
  };
}

async function readSpreadsheetRows(file: File): Promise<any[]> {
  const fileName = String(file?.name || '').toLowerCase();
  const isCsv = fileName.endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function normalizeInventoryItem(item: any): InventoryItem {
  const availableQuantity =
    typeof item.availableQuantity === 'number'
      ? item.availableQuantity
      : Math.max(0, (item.totalQuantity || 0) - (item.allocatedQuantity || 0));
  return {
    ...item,
    recordId: item.recordId,
    id: item.id || item.inventoryCode,
    inventoryCode: item.inventoryCode || item.id,
    ledger: Array.isArray(item.ledger) ? item.ledger : [],
    availableQuantity,
    allocatedQuantity: typeof item.allocatedQuantity === 'number'
      ? item.allocatedQuantity
      : Math.max(0, (item.totalQuantity || 0) - availableQuantity),
  };
}

function buildAllocationLogs(items: InventoryItem[]): AllocationLog[] {
  return items.flatMap((item) => {
    const ledger = Array.isArray(item.ledger) ? item.ledger : [];
    return ledger
      .filter((entry) => /allocate|issued|given|distributed/i.test(entry.action || ''))
      .map((entry) => ({
        id: `${item.recordId || item.id}-${entry.date || entry.dateLabel || Math.random()}`,
        employee: entry.target || 'Unassigned',
        itemName: item.name,
        quantity: entry.qty,
        date: entry.date || entry.dateLabel || 'Today',
        note: entry.action || 'Allocated',
      }));
  });
}

function TablePageSkeleton() {
  return (
    <div className="p-2 lg:p-2.5 animate-pulse space-y-4">
      <div className="h-7 w-60 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 bg-white rounded-3xl border border-gray-100 animate-pulse" />
        ))}
      </div>
      <div className="h-[420px] bg-white rounded-[2.5rem] border border-gray-100 animate-pulse" />
    </div>
  );
}

export function DepartmentInventoryPage() {
  const storedUser = getStoredUser();
  const deptLabel = getDepartmentLabel(storedUser);
  const categories = getDeptCategories(deptLabel);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadFileName, setBulkUploadFileName] = useState('');
  const [bulkUploadSummary, setBulkUploadSummary] = useState<BulkUploadSummary | null>(null);

  const [newItem, setNewItem] = useState<NewItemData>({
    name: '',
    trackingType: 'Consumable',
    category: categories[0] || 'Office Supplies',
    department: deptLabel,
    quantity: '',
  });
  const [updateStock, setUpdateStock] = useState<UpdateStockData>({ itemId: '', actionType: 'increase', quantity: '', reason: '' });

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allocations, setAllocations] = useState<AllocationLog[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadInventory() {
      try {
        const response = await getInventory();
        if (!isMounted) return;
        const items = Array.isArray(response?.data?.inventory) ? response.data.inventory : [];
        const normalized = items
          .map(normalizeInventoryItem)
          .filter((item: InventoryItem) =>
            String(item.department || '').trim().toLowerCase() === String(deptLabel || '').trim().toLowerCase()
          );
        setInventory(normalized);
        setAllocations(buildAllocationLogs(normalized.filter((item: InventoryItem) => item.trackingType === 'Consumable')));
        setErrorMessage('');
      } catch (error: any) {
        if (isMounted) {
          setErrorMessage(error.message || 'Unable to load inventory right now.');
          setInventory([]);
          setAllocations([]);
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

  const processedInventory = useMemo(() => {
    const departmentKey = normalizeDepartmentKey(deptLabel);
    return inventory
      .filter((item) => item.trackingType === 'Consumable')
      .map((item) => ({
        ...item,
        availableQuantity: typeof item.availableQuantity === 'number'
          ? item.availableQuantity
          : item.totalQuantity - (item.allocatedQuantity || 0),
      }))
      .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter((item) => normalizeDepartmentKey(item.department) === departmentKey);
  }, [inventory, searchQuery, deptLabel]);

  const totalItems = processedInventory.length;
  const lowStockItems = processedInventory.filter((i) => i.availableQuantity <= 10).length;

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) return;
    setErrorMessage('');
    setIsSaving(true);
    try {
      const response = await createInventory({
        name: newItem.name,
        category: newItem.category,
        trackingType: 'Consumable',
        department: deptLabel,
        totalQuantity: parseInt(newItem.quantity, 10),
      });
      const createdItem = response?.data?.inventoryItem;
      if (createdItem) {
        setInventory((current) => [normalizeInventoryItem(createdItem), ...current]);
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
    setIsSaving(true);
    try {
      const response = await updateInventory(updateStock.itemId, {
        actionType: updateStock.actionType,
        quantity: parseInt(updateStock.quantity, 10),
        reason: updateStock.reason,
      });
      const updatedItem = response?.data?.inventoryItem;
      if (updatedItem) {
        const normalized = normalizeInventoryItem(updatedItem);
        setInventory((current) => current.map((item) => (item.id === normalized.id ? normalized : item)));
      }
      setIsUpdateModalOpen(false);
      setUpdateStock({ itemId: '', actionType: 'increase', quantity: '', reason: '' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to update stock right now.');
    } finally {
      setIsSaving(false);
    }
  };

  function downloadBulkTemplate() {
    const workbook = XLSX.utils.book_new();
    const templateRow = Object.fromEntries(BULK_TEMPLATE_HEADERS.map((h) => [h, '']));
    const worksheet = XLSX.utils.json_to_sheet([templateRow]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    const categoriesSheet = XLSX.utils.json_to_sheet(categories.map((c) => ({ 'Allowed Category': c })));
    XLSX.utils.book_append_sheet(workbook, categoriesSheet, 'Allowed Categories');
    XLSX.writeFile(workbook, `dept-inventory-template-${String(deptLabel || 'template').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.xlsx`);
  }

  function handleBulkUploadClick() {
    setBulkUploadSummary(null);
    setBulkUploadFileName('');
    setIsBulkUploadOpen(true);
  }

  async function handleBulkFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setErrorMessage('');
    setIsSaving(true);
    setBulkUploadSummary(null);
    setBulkUploadFileName(file.name);
    try {
      const rows = await readSpreadsheetRows(file);
      if (!Array.isArray(rows) || rows.length === 0) throw new Error('The file does not contain any inventory rows.');
      const importRows = rows
        .map((row, index) => ({ row, index: index + 2 }))
        .filter(({ row }) => Boolean(buildBulkInventoryPayload(row, deptLabel, categories)));
      if (importRows.length === 0) throw new Error('No valid inventory rows found. Make sure each row has at least an item name.');
      let createdCount = 0;
      const failedRows: string[] = [];
      for (const { row, index } of importRows) {
        const payload = buildBulkInventoryPayload(row, deptLabel, categories);
        if (!payload) { failedRows.push(`Row ${index}: missing item name.`); continue; }
        try {
          const response = await createInventory(payload);
          const createdItem = response?.data?.inventoryItem;
          if (createdItem) {
            setInventory((current) => [normalizeInventoryItem(createdItem), ...current]);
            createdCount += 1;
          } else {
            failedRows.push(`Row ${index}: item was not returned by the server.`);
          }
        } catch (err: any) {
          failedRows.push(`Row ${index}: ${err.message || 'failed to import.'}`);
        }
      }
      setBulkUploadSummary({
        fileName: file.name,
        totalRows: rows.length,
        processedRows: importRows.length,
        createdCount,
        failedCount: failedRows.length,
        failedRows: failedRows.slice(0, 5),
      });
      if (createdCount > 0) setIsBulkUploadOpen(false);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to import inventory right now.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isInitialLoading) return <TablePageSkeleton />;

  return (
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-sans text-[12px]">
      <input
        ref={bulkUploadInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleBulkFileSelected}
      />
      <PageFrame>
        <div className="flex flex-col gap-4">

          {/* HEADER */}
          <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
            <div>
              <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                <Package size={18} /> Master Inventory
              </h2>
              <p className="text-xs font-medium text-[#2563EB] uppercase tracking-widest mt-1">{deptLabel} Portal</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={handleBulkUploadClick}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:text-[#2563EB] hover:border-[#2563EB] transition-all whitespace-nowrap"
              >
                <UploadCloud size={14} strokeWidth={2.5} /> BULK UPLOAD
              </button>
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
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">{errorMessage}</div>
          )}

          {bulkUploadSummary && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] font-semibold text-blue-800">
              Imported {bulkUploadSummary.createdCount} of {bulkUploadSummary.processedRows} rows from {bulkUploadSummary.fileName}.
              {bulkUploadSummary.failedCount > 0 ? ` ${bulkUploadSummary.failedCount} row(s) failed.` : ''}
            </div>
          )}

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 shrink-0">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Tracked Items</p>
                <p className="text-[15px] font-pmedium text-slate-900">{totalItems}</p>
              </div>
              <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 shrink-0"><Box size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-red-500">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-red-500 uppercase tracking-widest mb-1">Low Stock Warning</p>
                <p className="text-[15px] font-pmedium text-red-600">{lowStockItems}</p>
              </div>
              <div className="p-2 rounded-2xl bg-red-50 text-red-500 shrink-0"><TrendingDown size={16} /></div>
            </div>
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
              <div className="min-w-0">
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">Items Allocated</p>
                <p className="text-[15px] font-pmedium text-slate-900">{allocations.length}</p>
              </div>
              <div className="p-2 rounded-2xl bg-purple-50 text-purple-600 shrink-0"><History size={16} /></div>
            </div>
          </div>

          {/* DATA PANEL */}
          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

            {/* Tabs & Search */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-slate-50/50">
              <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-full md:w-auto shadow-sm">
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={`flex-1 px-5 py-2 rounded-lg text-[10px] font-pmedium uppercase whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${activeTab === 'inventory' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <Package size={12} /> Live Inventory
                </button>
                <button
                  onClick={() => setActiveTab('allocations')}
                  className={`flex-1 px-5 py-2 rounded-lg text-[10px] font-pmedium uppercase whitespace-nowrap transition-all flex items-center justify-center gap-1.5 ${activeTab === 'allocations' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                  <History size={12} /> Allocation History
                </button>
              </div>
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* TABLES */}
            <div className="overflow-x-auto flex-1">
              {activeTab === 'inventory' ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Item Name</th>
                      <th className="px-5 py-4">Category</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4 text-center">Total</th>
                      <th className="px-5 py-4 text-center">Allocated</th>
                      <th className="px-5 py-4 text-center">Available</th>
                      <th className="px-5 py-4 text-right">Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {processedInventory.map((item) => {
                      const style = getCategoryStyle(item.category);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-5 py-4">
                            <div className="font-bold text-[#0F172A] text-[13px]">{item.name}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-pmedium ${style.bg}`}>
                              {style.icon} {item.category}
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
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-black ${item.availableQuantity <= 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                              {item.availableQuantity}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                              Dept Only
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {processedInventory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                              <Package className="text-slate-300" size={24} />
                            </div>
                            <p className="text-slate-500 font-semibold text-sm">No inventory items found</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Employee</th>
                      <th className="px-5 py-4">Item Allocated</th>
                      <th className="px-5 py-4 text-center">Qty</th>
                      <th className="px-5 py-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {allocations.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-5 py-4 text-[12px] font-bold text-slate-700">{log.date}</td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          <span className="flex items-center gap-1.5">
                            <User size={12} className="text-blue-500" /> {log.employee}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[12px] font-bold text-slate-800">{log.itemName}</td>
                        <td className="px-5 py-4 text-center font-black text-[#2563EB]">{log.quantity}</td>
                        <td className="px-5 py-4 text-[11px] font-medium text-slate-500">{log.note}</td>
                      </tr>
                    ))}
                    {allocations.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-16 text-center">
                          <p className="text-slate-500 font-semibold text-sm">No allocations recorded yet.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </PageFrame>

      {/* MODAL: ADD NEW ITEM */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-blue-900 leading-none flex items-center gap-2">
                  <Plus size={22} /> Add New Item
                </h2>
                <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest mt-2">Register new inventory</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 shadow-sm hover:scale-110 transition-transform">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Item Name</label>
                <input
                  type="text"
                  placeholder="e.g. A4 Printer Paper"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:border-[#2563EB] outline-none"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                />
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest">Department Locked</p>
                <p className="text-sm font-semibold text-[#2563EB] mt-1">{deptLabel} will own this inventory entry.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Category</label>
                  <div className="relative">
                    <select
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:border-[#2563EB] outline-none appearance-none cursor-pointer"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    >
                      {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Initial Stock</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-900 focus:border-[#2563EB] outline-none"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                <p className="text-[11px] font-pmedium text-green-700 uppercase tracking-widest">Consumable only</p>
                <p className="text-[11px] font-semibold text-green-700/80 mt-1">Use this page for items that are issued or consumed by employees.</p>
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-500 hover:text-slate-900 transition-all">
                CANCEL
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItem.name || !newItem.quantity || isSaving}
                className="flex-1 py-4 bg-[#2563EB] text-white rounded-2xl font-pmedium shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none hover:bg-blue-700 transition-all"
              >
                {isSaving ? 'SAVING...' : 'SUBMIT ENTRY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE STOCK */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-none flex items-center gap-2">
                  <RefreshCw size={22} /> Update Stock
                </h2>
                <p className="text-[10px] font-pmedium text-slate-600 uppercase tracking-widest mt-2">Adjust existing inventory quantities</p>
              </div>
              <button onClick={() => setIsUpdateModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-sm hover:scale-110 transition-transform">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Select Item</label>
                <div className="relative">
                  <select
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-bold text-slate-900 focus:border-slate-500 outline-none appearance-none cursor-pointer"
                    value={updateStock.itemId}
                    onChange={(e) => setUpdateStock({ ...updateStock, itemId: e.target.value })}
                  >
                    <option value="">-- Choose Item to Update --</option>
                    {inventory.map((a) => (
                      <option key={a.recordId || a.id} value={a.recordId || a.id || ''}>
                        {a.name} (Available: {typeof a.availableQuantity === 'number' ? a.availableQuantity : Math.max(0, a.totalQuantity - (a.allocatedQuantity || 0))})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Action</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                    <button type="button" onClick={() => setUpdateStock({ ...updateStock, actionType: 'increase' })}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${updateStock.actionType === 'increase' ? 'bg-white shadow-sm text-green-600 border border-slate-200' : 'text-slate-400'}`}>
                      + ADD
                    </button>
                    <button type="button" onClick={() => setUpdateStock({ ...updateStock, actionType: 'decrease' })}
                      className={`flex-1 py-3 rounded-xl text-[11px] font-black transition-all ${updateStock.actionType === 'decrease' ? 'bg-white shadow-sm text-red-600 border border-slate-200' : 'text-slate-400'}`}>
                      - REMOVE
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Adjustment Qty</label>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-black text-slate-900 focus:border-slate-500 outline-none"
                    value={updateStock.quantity}
                    onChange={(e) => setUpdateStock({ ...updateStock, quantity: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Reason for Update</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-400" size={16} />
                  <textarea
                    rows={2}
                    placeholder="e.g. New shipment arrived, restocked pantry..."
                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl font-medium text-slate-700 focus:border-slate-500 outline-none resize-none"
                    value={updateStock.reason}
                    onChange={(e) => setUpdateStock({ ...updateStock, reason: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsUpdateModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-500 hover:text-slate-900 transition-all">
                CANCEL
              </button>
              <button
                onClick={handleUpdateStock}
                disabled={!updateStock.itemId || !updateStock.quantity || isSaving}
                className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-pmedium shadow-lg shadow-slate-200 disabled:bg-slate-300 disabled:shadow-none hover:bg-slate-900 transition-all"
              >
                {isSaving ? 'UPDATING...' : 'UPDATE STOCK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK UPLOAD */}
      {isBulkUploadOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8 bg-blue-50 border-b border-blue-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-blue-900 leading-none flex items-center gap-2">
                  <UploadCloud size={22} /> Bulk Upload Inventory
                </h2>
                <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest mt-2">Import from Excel or CSV</p>
              </div>
              <button onClick={() => setIsBulkUploadOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 shadow-sm hover:scale-110 transition-transform">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 sm:p-10 space-y-6">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest">Department Locked</p>
                <p className="text-sm font-semibold text-[#2563EB] mt-1">Uploaded rows will be saved under {deptLabel}.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={downloadBulkTemplate}
                  className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:text-[#2563EB] hover:border-[#2563EB] transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} strokeWidth={2.5} /> Download Template
                </button>
                <button
                  onClick={() => bulkUploadInputRef.current?.click()}
                  disabled={isSaving}
                  className="flex-1 py-4 bg-[#2563EB] text-white rounded-2xl font-pmedium shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <UploadCloud size={16} strokeWidth={2.5} /> {isSaving ? 'Importing...' : 'Choose File'}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Required Fields</label>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600">name, quantity</div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Allowed Categories</label>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600">{categories.join(', ')}</div>
              </div>
              {bulkUploadFileName && (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] font-semibold text-slate-700">
                  Selected: <span className="font-black text-slate-900">{bulkUploadFileName}</span>
                </div>
              )}
              {bulkUploadSummary && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-[12px] font-semibold text-emerald-800 space-y-1">
                  <div>Imported {bulkUploadSummary.createdCount} row(s).</div>
                  {bulkUploadSummary.failedCount > 0 && (
                    <div>
                      {bulkUploadSummary.failedCount} row(s) failed.
                      {bulkUploadSummary.failedRows.length > 0 && (
                        <div className="mt-2 text-[11px] text-emerald-700/80">{bulkUploadSummary.failedRows.join(' | ')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setIsBulkUploadOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-500 hover:text-slate-900 transition-all">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentInventoryPage;
