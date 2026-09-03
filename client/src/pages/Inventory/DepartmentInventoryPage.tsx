import { useState, useMemo, useEffect, useRef, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { getStoredUser } from '@/lib/auth-session';
import { createInventory, getInventory, updateInventory, transferInventory } from '@/services/inventory';
import { getOrganizationOverview } from '@/services/organization';
import { getResources } from '@/services/resources';
import { axiosPrivate } from '@/utils/axios';
import { normalizeDepartmentKey } from '@/utils/user-helpers';
import {
  Search, Plus, X, Package, TrendingDown, TrendingUp, RefreshCw, Box, History, User,
  AlertTriangle, ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, Filter, Pencil, Wrench,
  Eye, ArrowRightLeft, Building2, UploadCloud, Info, Loader2, FileSpreadsheet, ChevronDown,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageFrame from '@/components/Pages/PageFrame';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import { createReport } from '@/services/reports';
import { downloadReportFile } from '@/utils/report-download';
import ExportReportModal, { type ExportParams } from '@/components/ExportReportModal';
import ReportExportButton from '@/components/ReportExportButton';

interface InventoryItem {
  recordId?: string;
  id?: string;
  inventoryCode?: string;
  name: string;
  category?: string;
  trackingType: string;
  status?: string;
  department: string;
  location?: string;
  unit?: string;
  unitPrice?: number;
  totalValue?: number;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity: number;
  addedByRole?: string;
  ledger: LedgerEntry[];
  createdAt?: string;
}

interface LedgerEntry {
  type?: string;
  date?: string;
  dateLabel?: string;
  target?: string;
  action?: string;
  qty?: number;
  unitPrice?: number;
  source?: string;
}

interface NewItemData {
  name: string;
  trackingType: string;
  category: string;
  department: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  floor: string;
  wing: string;
}

const ADD_NEW_OPTION = '__add_new__';

function getLocationLabel(floor: string, wing: string): string {
  const parts = [floor, wing].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

function getLocationParts(location?: string): { floor: string; wing: string } {
  const parts = String(location || '').split(',').map((part) => part.trim()).filter(Boolean);
  return { floor: parts[0] || '', wing: parts[1] || '' };
}

interface UpdateStockData {
  itemId: string;
  actionType: string;
  quantity: string;
  reason: string;
}

interface TransferData {
  targetDepartment: string;
  quantity: string;
}

type SortField = 'name' | 'category' | 'totalQuantity' | 'availableQuantity' | 'createdAt';
type SortDir = 'asc' | 'desc';

const LOW_STOCK_THRESHOLD = 10;

function getStockStatusKey(item: InventoryItem): 'out' | 'low' | 'ok' | 'other' {
  if (item.status === 'maintenance' || item.status === 'retired') return 'other';
  if ((item.availableQuantity || 0) === 0) return 'out';
  if ((item.availableQuantity || 0) <= LOW_STOCK_THRESHOLD) return 'low';
  return 'ok';
}

interface MonthlyBalanceRow {
  monthKey: string;
  monthLabel: string;
  opening: number;
  closing: number;
  netChange: number;
  entryCount: number;
}

function getLedgerEntryDelta(entry: LedgerEntry): number {
  const qty = Math.abs(entry.qty || 0);
  const text = String(entry.type || entry.action || '').toLowerCase();
  if (/initial|purchase|transfer in|return|received/.test(text)) return qty;
  if (/consumption|consumed|allocat|transfer out|utilized|issued/.test(text)) return -qty;
  return 0;
}

function getLedgerEntryDate(entry: LedgerEntry, fallback?: string): Date {
  const raw = entry.date || entry.dateLabel || fallback;
  const parsed = raw ? new Date(raw) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed;
  return fallback ? new Date(fallback) : new Date();
}

function computeMonthlyBalances(item: InventoryItem): MonthlyBalanceRow[] {
  const entries = [...(item.ledger || [])]
    .map((entry) => ({ entry, when: getLedgerEntryDate(entry, item.createdAt) }))
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  const rows: MonthlyBalanceRow[] = [];
  let runningBalance = 0;
  let currentRow: MonthlyBalanceRow | null = null;

  entries.forEach(({ entry, when }) => {
    const monthKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
    if (!currentRow || currentRow.monthKey !== monthKey) {
      currentRow = {
        monthKey,
        monthLabel: when.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        opening: runningBalance,
        closing: runningBalance,
        netChange: 0,
        entryCount: 0,
      };
      rows.push(currentRow);
    }
    const delta = getLedgerEntryDelta(entry);
    runningBalance += delta;
    currentRow.closing = runningBalance;
    currentRow.netChange += delta;
    currentRow.entryCount += 1;
  });

  return rows.reverse();
}

// ---------------------------------------------------------------------------
// Bulk Upload – template & row helpers
// ---------------------------------------------------------------------------
const INVENTORY_CATEGORY_OPTIONS = [
  'Physical', 'Digital', 'Other', 'Office Supplies', 'Pantry', 'Facilities', 'Branding', 'Hardware', 'Safety Equipment',
];
const INVENTORY_BULK_SHEET_NAME = 'Inventory';
const INVENTORY_BULK_HEADERS = ['Item Name', 'Category', 'Quantity', 'Available Quantity', 'Unit', 'Price per Unit', 'Floor', 'Wing'];

function buildInventoryBulkTemplateWorkbook() {
  const workbook = XLSX.utils.book_new();
  const uploadSheet = XLSX.utils.aoa_to_sheet([
    INVENTORY_BULK_HEADERS,
    ['Printer Paper A4', 'Office Supplies', 500, 500, 'ream', 35, 'Floor 3', 'A'],
  ]);
  XLSX.utils.book_append_sheet(workbook, uploadSheet, INVENTORY_BULK_SHEET_NAME);

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['Field', 'Notes'],
    ['Item Name', 'Required.'],
    ['Category', `One of: ${INVENTORY_CATEGORY_OPTIONS.join(', ')}. Defaults to "Other" if left blank or unrecognized.`],
    ['Quantity', 'Total units ever purchased/acquired for this item. Required, must be >= 0.'],
    ['Available Quantity', 'How many units are currently on hand and not yet used up. Defaults to Quantity if left blank.'],
    ['Unit', 'Optional unit of measurement, e.g. "pcs", "box", "kg", "ream".'],
    ['Price per Unit', 'Optional numeric price for a single unit. Total Value is calculated automatically as Price per Unit x Quantity.'],
    ['Floor', 'Optional physical location.'],
    ['Wing', 'Optional physical location.'],
    [],
    ['Note', 'All rows are added to your own department automatically. This item type is always Consumable.'],
  ]);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return workbook;
}

function readBulkInventoryCell(row: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

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
    status: item.status || 'active',
    location: item.location || '',
    availableQuantity,
    allocatedQuantity: typeof item.allocatedQuantity === 'number'
      ? item.allocatedQuantity
      : Math.max(0, (item.totalQuantity || 0) - availableQuantity),
  };
}

function StockStatusBadge({ status, availableQuantity }: { status?: string; availableQuantity: number }) {
  if (status === 'maintenance') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-700">
        <Wrench size={10} /> MAINTENANCE
      </span>
    );
  }
  if (status === 'retired') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-slate-200 text-slate-600">
        <AlertTriangle size={10} /> RETIRED
      </span>
    );
  }
  if ((availableQuantity || 0) === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">
        <AlertTriangle size={10} /> OUT
      </span>
    );
  }
  if ((availableQuantity || 0) <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">
        <TrendingDown size={10} /> LOW
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
      <ShieldCheck size={10} /> OK
    </span>
  );
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
  const [showExportModal, setShowExportModal] = useState(false);
  const storedUser = getStoredUser();
  const normalizedRole = String(storedUser?.workspaceMembership?.role || storedUser?.role || '').trim().toLowerCase();
  const roleBand = getRoleBand(normalizedRole);
  const [resolvedDeptLabel, setResolvedDeptLabel] = useState('');
  const deptLabel = resolvedDeptLabel || getDepartmentLabel(storedUser);
  const categories = getDeptCategories(deptLabel);
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (val: any) => formatWorkspaceCurrency(val, workspacePreferences.currency, { maximumFractionDigits: 2 });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'ok' | 'low' | 'out'>('All');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [fetchedDepartments, setFetchedDepartments] = useState<string[]>([]);

  const [bulkInventoryModal, setBulkInventoryModal] = useState(false);
  const [bulkInventoryFileName, setBulkInventoryFileName] = useState('');
  const [bulkInventoryRows, setBulkInventoryRows] = useState<Record<string, any>[]>([]);
  const [bulkInventoryImporting, setBulkInventoryImporting] = useState(false);
  const [bulkInventorySummary, setBulkInventorySummary] = useState<{ created: number; skipped: number; issues: string[] } | null>(null);
  const [bulkInventoryError, setBulkInventoryError] = useState('');
  const bulkInventoryFileInputRef = useRef<HTMLInputElement>(null);

  const [newItem, setNewItem] = useState<NewItemData>({
    name: '',
    trackingType: 'Consumable',
    category: categories[0] || 'Office Supplies',
    department: deptLabel,
    quantity: '',
    unit: '',
    unitPrice: '',
    floor: '',
    wing: '',
  });
  const totalValuePreview = useMemo(() => {
    const unitPriceNum = Number(String(newItem.unitPrice || '').replace(/[^0-9.-]/g, '')) || 0;
    const qty = Math.max(0, parseInt(String(newItem.quantity || '').trim(), 10) || 0);
    return unitPriceNum * qty;
  }, [newItem.unitPrice, newItem.quantity]);
  const [updateStock, setUpdateStock] = useState<UpdateStockData>({
    itemId: '', actionType: 'increase', quantity: '', reason: '',
  });
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState<TransferData>({ targetDepartment: '', quantity: '' });
  const [activeTransferItem, setActiveTransferItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [resourceFloors, setResourceFloors] = useState<string[]>([]);
  const [resourceWings, setResourceWings] = useState<string[]>([]);
  const [floorMode, setFloorMode] = useState<'select' | 'custom'>('select');
  const [wingMode, setWingMode] = useState<'select' | 'custom'>('select');

  useEffect(() => {
    let isMounted = true;
    async function loadFloorsAndWings() {
      try {
        const response = await getResources();
        const resources = response?.data?.data?.resources || response?.data?.resources || [];
        if (!isMounted) return;
        const floors = Array.from(new Set(resources.map((r: any) => String(r.floor || '').trim()).filter(Boolean))) as string[];
        const wings = Array.from(new Set(resources.map((r: any) => String(r.wing || '').trim().toUpperCase()).filter(Boolean))) as string[];
        setResourceFloors(floors);
        setResourceWings(wings.sort());
      } catch {
        // non-critical: floor/wing become free-text if resources can't be loaded
      }
    }
    loadFloorsAndWings();
    return () => { isMounted = false; };
  }, []);

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
          .filter((n: string) => n && n !== 'Sales & CRM');
        if (isMounted && names.length > 0) {
          setFetchedDepartments(names);
        }

        // The stored user object never carries workspaceMembership.departments,
        // so derive "my" real department from the org overview's team member
        // list instead (same pattern Sidebar.tsx uses).
        const teamMembers = Array.isArray(data?.teamMembers) ? data.teamMembers : [];
        const currentUserId = String(storedUser?.id || storedUser?._id || '').trim();
        const currentUserEmail = String(storedUser?.email || '').trim().toLowerCase();
        const me = teamMembers.find((member: any) => {
          const memberUserId = String(member?.userId || member?.id || '').trim();
          const memberEmail = String(member?.email || '').trim().toLowerCase();
          return (memberUserId && memberUserId === currentUserId) || (currentUserEmail && memberEmail === currentUserEmail);
        });
        const myDepartments = Array.isArray(me?.departmentNames) ? me.departmentNames.filter(Boolean) : [];
        if (isMounted && myDepartments.length > 0) {
          setResolvedDeptLabel(myDepartments[0]);
        }
      } catch {
        // silently fall back
      }
    }
    loadDepartments();
    return () => { isMounted = false; };
  }, []);

  const otherDepartmentOptions = useMemo(() => {
    return fetchedDepartments.filter(
      (d) => normalizeDepartmentKey(d) !== normalizeDepartmentKey(deptLabel)
    );
  }, [fetchedDepartments, deptLabel]);

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
    if (categoryFilter !== 'All') {
      items = items.filter((i) => i.category === categoryFilter);
    }
    if (stockStatusFilter !== 'All') {
      items = items.filter((i) => getStockStatusKey(i) === stockStatusFilter);
    }
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
  }, [inventory, categoryFilter, stockStatusFilter, searchQuery, sortField, sortDir]);

  const totalItems = processedInventory.length;
  const totalStock = processedInventory.reduce((acc, i) => acc + (i.totalQuantity || 0), 0);
  const availableStock = processedInventory.reduce((acc, i) => acc + (i.availableQuantity || 0), 0);
  const lowStockItems = processedInventory.filter((i) => (i.availableQuantity || 0) <= LOW_STOCK_THRESHOLD && (i.availableQuantity || 0) > 0).length;

  const handleExportReport = async ({ format, dataWindow, period, reportMonth }: ExportParams) => {
    if (!processedInventory.length) throw new Error('There are no inventory records to export.');
    const reportFormat = format === 'Excel' ? 'Excel' : 'PDF';
    const response = await createReport({
      title: `${deptLabel} Inventory`, department: deptLabel, category: 'Other', dataWindow, reportMonth,
      period, generatedBy: 'Department Manager', format: reportFormat,
      description: `${deptLabel} inventory export for the current filtered view.`, sourceType: 'inventory',
      sourceRef: `department-inventory-${normalizeDepartmentKey(deptLabel)}`,
      reportRows: processedInventory.map((item, index) => ({
        label: `${index + 1}. ${item.name}`,
        value: `Code: ${item.inventoryCode || '-'} | Category: ${item.category || '-'} | Total: ${item.totalQuantity || 0} | Available: ${item.availableQuantity || 0} | Allocated: ${item.allocatedQuantity || 0} | Location: ${item.location || '-'}`,
      })), monthlyData: [],
    });
    await downloadReportFile(response?.data?.download?.url, { openInNewTab: false });
    window.dispatchEvent(new Event('reports:refresh'));
    setSuccessMessage(`${reportFormat} inventory report downloaded and saved to Reports.`);
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.quantity) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const payload = {
        name: newItem.name,
        category: newItem.category,
        trackingType: 'Consumable',
        department: deptLabel,
        location: getLocationLabel(newItem.floor, newItem.wing),
        unit: newItem.unit,
        unitPrice: newItem.unitPrice ? Number(String(newItem.unitPrice).replace(/[^0-9.-]/g, '')) : 0,
        totalQuantity: parseInt(newItem.quantity, 10),
      };
      const response = editingItem?.recordId
        ? await updateInventory(editingItem.recordId, payload)
        : await createInventory(payload);
      const savedItem = response?.data?.inventoryItem || response?.inventoryItem;
      if (savedItem) {
        const normalized = normalizeInventoryItem(savedItem);
        setInventory((current) => editingItem
          ? current.map((item) => (item.recordId === editingItem.recordId ? normalized : item))
          : [normalized, ...current]);
        setSuccessMessage(editingItem ? `"${newItem.name}" updated successfully.` : `"${newItem.name}" added successfully.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setIsAddModalOpen(false);
      setEditingItem(null);
      setNewItem({ name: '', trackingType: 'Consumable', category: categories[0] || 'Office Supplies', department: deptLabel, quantity: '', unit: '', unitPrice: '', floor: '', wing: '' });
      setFloorMode('select');
      setWingMode('select');
    } catch (error: any) {
      setErrorMessage(error.message || `Unable to ${editingItem ? 'update' : 'add'} inventory item right now.`);
    } finally {
      setIsSaving(false);
    }
  };

  function openEditItem(item: InventoryItem) {
    const { floor, wing } = getLocationParts(item.location);
    setEditingItem(item);
    setNewItem({
      name: item.name || '',
      trackingType: 'Consumable',
      category: item.category || categories[0] || 'Office Supplies',
      department: deptLabel,
      quantity: String(item.totalQuantity ?? ''),
      unit: item.unit || '',
      unitPrice: item.unitPrice ? String(item.unitPrice) : '',
      floor,
      wing,
    });
    setFloorMode(floor && !resourceFloors.includes(floor) ? 'custom' : 'select');
    setWingMode(wing && !resourceWings.includes(wing) ? 'custom' : 'select');
    setIsAddModalOpen(true);
  }

  function openBulkInventoryModal() {
    setBulkInventoryModal(true);
    setBulkInventoryFileName('');
    setBulkInventoryRows([]);
    setBulkInventorySummary(null);
    setBulkInventoryError('');
  }

  function closeBulkInventoryModal() {
    if (bulkInventoryImporting) return;
    setBulkInventoryModal(false);
    setBulkInventoryFileName('');
    setBulkInventoryRows([]);
    setBulkInventorySummary(null);
    setBulkInventoryError('');
  }

  function handleBulkInventoryDownloadTemplate() {
    const workbook = buildInventoryBulkTemplateWorkbook();
    XLSX.writeFile(workbook, 'inventory-bulk-upload-template.xlsx');
  }

  function handleBulkInventoryFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkInventoryFileName(file.name);
    setBulkInventorySummary(null);
    setBulkInventoryError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames.includes(INVENTORY_BULK_SHEET_NAME) ? INVENTORY_BULK_SHEET_NAME : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
        setBulkInventoryRows(rows);
        if (rows.length === 0) setBulkInventoryError('No rows found in the spreadsheet.');
      } catch {
        setBulkInventoryError('Failed to parse spreadsheet. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleBulkInventoryImport() {
    if (bulkInventoryRows.length === 0) return;
    setBulkInventoryImporting(true);
    let created = 0;
    let skipped = 0;
    const issues: string[] = [];

    for (let i = 0; i < bulkInventoryRows.length; i++) {
      const row = bulkInventoryRows[i];
      const rowNum = i + 2;
      try {
        const name = readBulkInventoryCell(row, 'Item Name', 'name', 'itemName');
        if (!name) { skipped++; issues.push(`Row ${rowNum}: Item Name is required.`); continue; }

        const categoryRaw = readBulkInventoryCell(row, 'Category', 'category');
        const category = INVENTORY_CATEGORY_OPTIONS.includes(categoryRaw) ? categoryRaw : 'Other';

        const quantity = Math.max(0, parseInt(readBulkInventoryCell(row, 'Quantity', 'quantity') || '0', 10) || 0);
        const availableQuantityRaw = readBulkInventoryCell(row, 'Available Quantity', 'availableQuantity');
        const availableQuantity = availableQuantityRaw ? Math.max(0, parseInt(availableQuantityRaw, 10) || 0) : quantity;
        const unit = readBulkInventoryCell(row, 'Unit', 'unit');
        const unitPriceNum = Number(readBulkInventoryCell(row, 'Price per Unit', 'unitPrice', 'Price').replace(/[^0-9.-]/g, '')) || 0;
        const floor = readBulkInventoryCell(row, 'Floor', 'floor');
        const wing = readBulkInventoryCell(row, 'Wing', 'wing');

        await createInventory({
          name,
          category,
          trackingType: 'Consumable',
          department: deptLabel,
          location: getLocationLabel(floor, wing),
          unit,
          unitPrice: unitPriceNum,
          totalQuantity: quantity,
          availableQuantity: Math.min(availableQuantity, quantity),
        });
        created++;
      } catch (err: any) {
        skipped++;
        issues.push(`Row ${rowNum}: ${err?.response?.data?.message || err?.message || 'Failed to create inventory item.'}`);
      }
    }

    if (created > 0) {
      try {
        const response = await getInventory();
        const items = Array.isArray(response?.data?.inventory) ? response.data.inventory
          : Array.isArray(response?.inventory) ? response.inventory
          : [];
        const normalized = items
          .map(normalizeInventoryItem)
          .filter((item: InventoryItem) =>
            normalizeDepartmentKey(String(item.department || '')) === normalizeDepartmentKey(deptLabel)
          );
        setInventory(normalized);
      } catch {
        // non-critical: newly created items just won't appear until next manual refresh
      }
    }

    setBulkInventoryImporting(false);
    setBulkInventorySummary({ created, skipped, issues });
  }

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

  const handleTransferStock = async () => {
    if (!transferData.targetDepartment || !transferData.quantity || !activeTransferItem?.recordId) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);
    try {
      const response = await transferInventory(activeTransferItem.recordId, {
        targetDepartment: transferData.targetDepartment,
        quantity: transferData.quantity,
      });
      const sourceItem = response?.data?.sourceItem || response?.sourceItem;
      if (sourceItem) {
        const normalized = normalizeInventoryItem(sourceItem);
        setInventory((current) => current.map((item) => (item.recordId === normalized.recordId ? normalized : item)));
        setSuccessMessage(`Transferred ${transferData.quantity} units to ${transferData.targetDepartment}.`);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setIsTransferModalOpen(false);
      setTransferData({ targetDepartment: '', quantity: '' });
      setActiveTransferItem(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to transfer stock right now.');
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
                <Package size={18} /> {deptLabel} Inventory
              </h2>
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <ReportExportButton onClick={() => setShowExportModal(true)} />
              {roleBand !== 'employee' && (
                <button
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:text-[#2563EB] hover:border-[#2563EB] transition-all whitespace-nowrap"
                >
                  <RefreshCw size={14} strokeWidth={2.5} /> UPDATE STOCK
                </button>
              )}
              {roleBand !== 'employee' && (
                <button
                  onClick={openBulkInventoryModal}
                  className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:text-[#2563EB] hover:border-[#2563EB] transition-all whitespace-nowrap"
                >
                  <UploadCloud size={14} strokeWidth={2.5} /> BULK UPLOAD
                </button>
              )}
              {roleBand !== 'employee' && (
                <button
                  data-tour="dept-inventory-add-btn"
                  onClick={() => {
                    setEditingItem(null);
                    setNewItem({ name: '', trackingType: 'Consumable', category: categories[0] || 'Office Supplies', department: deptLabel, quantity: '', unit: '', unitPrice: '', floor: '', wing: '' });
                    setFloorMode('select');
                    setWingMode('select');
                    setIsAddModalOpen(true);
                  }}
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Plus size={14} strokeWidth={3} /> ADD NEW ITEM
                </button>
              )}
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
          <div data-tour="dept-inventory-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
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
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              <div data-tour="dept-inventory-status-filter" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {[
                  { key: 'All', label: 'All Stock' },
                  { key: 'ok', label: 'OK' },
                  { key: 'low', label: 'Low Stock' },
                  { key: 'out', label: 'Out of Stock' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setStockStatusFilter(key as typeof stockStatusFilter)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-pmedium whitespace-nowrap transition-all ${
                      stockStatusFilter === key
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                {categories.length > 0 && (
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      data-tour="dept-inventory-category-filter"
                      className="pl-9 pr-8 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-xl text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[120px]"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={12} />
                  </div>
                )}
                <div className="relative w-full sm:w-72 shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    data-tour="dept-inventory-search"
                    type="text"
                    placeholder="Search items..."
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-semibold text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400 shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto flex-1">
              <table data-tour="dept-inventory-table" className="hidden lg:table w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                  <tr>
                    <th className="px-5 py-4">Item ID</th>
                    <th className="px-5 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('name')}>
                      <span className="flex items-center gap-1.5">Item Name <SortIcon field="name" /></span>
                    </th>
                    <th className="px-5 py-4 cursor-pointer select-none hover:text-slate-700 transition-colors" onClick={() => handleSort('category')}>
                      <span className="flex items-center gap-1.5">Category <SortIcon field="category" /></span>
                    </th>
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
                          <p className="text-[12px] font-pmedium text-slate-500 whitespace-nowrap">{item.inventoryCode || '--'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200/60">
                              <Package className="text-slate-500" size={16} />
                            </div>
                            <p className="text-[12px] font-pmedium text-[#0F172A] truncate">{item.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-pmedium ${style.bg}`}>
                            {item.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-pmedium text-slate-900">{item.totalQuantity}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="font-pmedium text-[#2563EB]">{item.allocatedQuantity}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-pmedium ${isOut ? 'bg-red-100 text-red-600' : isLowStock ? 'bg-amber-100 text-amber-700' : 'bg-green-50 text-green-600'}`}>
                            {item.availableQuantity}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StockStatusBadge status={item.status} availableQuantity={item.availableQuantity} />
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingItem(item)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              title="View Ledger"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => {
                                setUpdateStock({ itemId: item.recordId || item.id || '', actionType: 'increase', quantity: '', reason: '' });
                                setIsUpdateModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition-all"
                              title="Update Stock"
                            >
                              <RefreshCw size={15} strokeWidth={2.5} />
                            </button>
                            {roleBand !== 'employee' && item.availableQuantity > 0 && (
                              <button
                                onClick={() => {
                                  setActiveTransferItem(item);
                                  setTransferData({ targetDepartment: '', quantity: '' });
                                  setIsTransferModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                                title="Transfer to Another Department"
                              >
                                <ArrowRightLeft size={15} strokeWidth={2.5} />
                              </button>
                            )}
                            {roleBand !== 'employee' && (
                              <button
                                onClick={() => openEditItem(item)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Pencil size={15} strokeWidth={2.5} />
                              </button>
                            )}
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
              <div data-tour="dept-inventory-table" className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
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
                          <div className="min-w-0">
                            {item.inventoryCode && (
                              <p className="text-[9px] font-pmedium text-slate-400 mb-0.5">{item.inventoryCode}</p>
                            )}
                            <h3 className="text-[13px] font-pmedium text-[#0F172A] leading-tight mb-1 truncate">{item.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-pmedium ${style.bg}`}>
                                {item.category || 'Other'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <StockStatusBadge status={item.status} availableQuantity={item.availableQuantity} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                        <div>
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Total</p>
                          <p className="text-[11px] font-pmedium text-[#0F172A]">{item.totalQuantity}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium text-[#2563EB] uppercase tracking-widest mb-0.5">Allocated</p>
                          <p className="text-[11px] font-pmedium text-[#2563EB]">{item.allocatedQuantity}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-pmedium text-slate-500 uppercase tracking-widest mb-0.5">Available</p>
                          <p className={`text-[11px] font-pmedium ${isOut ? 'text-red-600' : isLowStock ? 'text-amber-700' : 'text-green-600'}`}>{item.availableQuantity}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setViewingItem(item)}
                          className="flex-1 py-2 bg-slate-900 border border-slate-900 rounded-xl text-white font-pmedium hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Eye size={14} /> Ledger
                        </button>
                        <button
                          onClick={() => {
                            setUpdateStock({ itemId: item.recordId || item.id || '', actionType: 'increase', quantity: '', reason: '' });
                            setIsUpdateModalOpen(true);
                          }}
                          className="flex-1 py-2 bg-white border border-slate-200 text-emerald-700 rounded-xl text-[11px] hover:bg-emerald-50 font-pmedium transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw size={13} /> Update
                        </button>
                        {roleBand !== 'employee' && item.availableQuantity > 0 && (
                          <button
                            onClick={() => {
                              setActiveTransferItem(item);
                              setTransferData({ targetDepartment: '', quantity: '' });
                              setIsTransferModalOpen(true);
                            }}
                            className="flex-1 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-[11px] hover:bg-indigo-50 font-pmedium transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <ArrowRightLeft size={13} /> Transfer
                          </button>
                        )}
                        {roleBand !== 'employee' && (
                          <button
                            onClick={() => openEditItem(item)}
                            className="py-2 px-3 bg-white border border-slate-200 text-amber-700 rounded-xl text-[11px] hover:bg-amber-50 font-pmedium transition-all shadow-sm flex items-center justify-center"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
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

      {bulkInventoryModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-auto rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-pmedium text-slate-900 flex items-center gap-2"><UploadCloud size={16} /> Bulk Upload Inventory</h3>
              <button onClick={closeBulkInventoryModal}
                className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              {!bulkInventoryFileName ? (
                <>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleBulkInventoryDownloadTemplate}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 hover:border-[#2563EB] hover:text-[#2563EB] transition-all">
                      <FileSpreadsheet size={13} /> Download Template
                    </button>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-pmedium text-blue-700 leading-relaxed">Fill in Item Name, Category, Quantity, Unit and Price per Unit per row. Every row is added to {deptLabel} automatically. Total Value is calculated automatically.</p>
                  </div>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-[#2563EB] transition-colors cursor-pointer" onClick={() => bulkInventoryFileInputRef.current?.click()}>
                    <UploadCloud size={28} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-[12px] font-pmedium text-slate-600 mb-1">Click to upload spreadsheet</p>
                    <p className="text-[10px] text-slate-400">Supports .xlsx, .xls, .csv — use the template above for the required columns.</p>
                  </div>
                  <input ref={bulkInventoryFileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkInventoryFileChange} />
                </>
              ) : bulkInventorySummary ? (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[12px] font-pmedium text-emerald-800">Import Complete</p>
                    <p className="text-[11px] text-emerald-600 mt-1">{bulkInventorySummary.created} item(s) created, {bulkInventorySummary.skipped} skipped</p>
                  </div>
                  {bulkInventorySummary.issues.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 max-h-40 overflow-y-auto space-y-1">
                      {bulkInventorySummary.issues.map((issue, i) => (
                        <p key={i} className="text-[10px] font-pmedium text-amber-700">{issue}</p>
                      ))}
                    </div>
                  )}
                  <button onClick={closeBulkInventoryModal}
                    className="w-full py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-[#2563EB]/90 transition-all">Done</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-[12px] font-pmedium text-slate-700 truncate">{bulkInventoryFileName}</span>
                    <span className="text-[10px] font-pmedium text-slate-400 shrink-0">{bulkInventoryRows.length} rows</span>
                  </div>
                  {bulkInventoryError && <p className="text-[11px] font-pmedium text-red-500">{bulkInventoryError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => { setBulkInventoryFileName(''); setBulkInventoryRows([]); setBulkInventoryError(''); }}
                      className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-slate-50 transition-all">Change File</button>
                    <button onClick={handleBulkInventoryImport} disabled={bulkInventoryImporting || bulkInventoryRows.length === 0}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider hover:bg-[#2563EB]/90 disabled:opacity-50 transition-all">
                      {bulkInventoryImporting ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                      {bulkInventoryImporting ? 'Importing...' : `Import ${bulkInventoryRows.length} Rows`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                    {editingItem ? <Pencil size={18} /> : <Plus size={18} />}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-pmedium text-slate-900">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
                    <p className="text-[12px] text-slate-500">{editingItem ? `Update details for ${editingItem.name}.` : `Register new inventory for ${deptLabel}.`}</p>
                  </div>
                </div>
                <button onClick={() => { setIsAddModalOpen(false); setEditingItem(null); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
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
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Unit</label>
                      <input
                        type="text"
                        placeholder="e.g. pcs, box, kg"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={newItem.unit}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Price per Unit ({workspacePreferences.currency})</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 35"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={newItem.unitPrice}
                        onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Total Value ({workspacePreferences.currency})</label>
                      <input type="text" readOnly value={formatCurrency(totalValuePreview)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-500 outline-none cursor-not-allowed" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Floor</label>
                      {floorMode === 'custom' ? (
                        <div className="space-y-1.5">
                          <input
                            className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                            value={newItem.floor}
                            onChange={(e) => setNewItem({ ...newItem, floor: e.target.value })}
                            placeholder="Enter new floor"
                          />
                          <button type="button" onClick={() => { setFloorMode('select'); setNewItem((prev) => ({ ...prev, floor: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                        </div>
                      ) : (
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                          value={newItem.floor}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            if (nextValue === ADD_NEW_OPTION) { setFloorMode('custom'); setNewItem((prev) => ({ ...prev, floor: '' })); return; }
                            setNewItem({ ...newItem, floor: nextValue });
                          }}
                        >
                          <option value="">Select floor</option>
                          {resourceFloors.map((f) => <option key={f} value={f}>{f}</option>)}
                          <option value={ADD_NEW_OPTION}>Add new floor</option>
                        </select>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Wing</label>
                      {wingMode === 'custom' ? (
                        <div className="space-y-1.5">
                          <input
                            className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                            value={newItem.wing}
                            onChange={(e) => setNewItem({ ...newItem, wing: e.target.value })}
                            placeholder="Enter new wing"
                          />
                          <button type="button" onClick={() => { setWingMode('select'); setNewItem((prev) => ({ ...prev, wing: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                        </div>
                      ) : (
                        <select
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer"
                          value={newItem.wing}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            if (nextValue === ADD_NEW_OPTION) { setWingMode('custom'); setNewItem((prev) => ({ ...prev, wing: '' })); return; }
                            setNewItem({ ...newItem, wing: nextValue });
                          }}
                        >
                          <option value="">Select wing</option>
                          {resourceWings.map((w) => <option key={w} value={w}>{w}</option>)}
                          <option value={ADD_NEW_OPTION}>Add new wing</option>
                        </select>
                      )}
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

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-center">
                  <button type="button" onClick={() => { setIsAddModalOpen(false); setEditingItem(null); }} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
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
                          - Utilize
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

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-center">
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

        {/* Transfer Modal */}
        {isTransferModalOpen && activeTransferItem && (
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
                    <p className="text-[12px] text-slate-500">Move units from {deptLabel} to another department.</p>
                  </div>
                </div>
                <button onClick={() => { setIsTransferModalOpen(false); setActiveTransferItem(null); }} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleTransferStock(); }} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><ArrowRightLeft size={16} /></span>
                    <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Transfer Details</span>
                  </h4>
                  <div className="flex items-center gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center"><Package size={14} /></div>
                    <div>
                      <p className="text-[13px] font-pmedium text-[#0F172A]">{activeTransferItem.name}</p>
                      <span className="text-[10px] font-pmedium text-indigo-700">Available: {activeTransferItem.availableQuantity}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Source Department</label>
                      <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600 flex items-center gap-1.5"><Building2 size={12} className="text-slate-400" /> {deptLabel}</div>
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
                        {otherDepartmentOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Quantity to Transfer <span className="text-red-400">*</span></label>
                      <input
                        required
                        type="number"
                        min="1"
                        max={activeTransferItem.availableQuantity}
                        placeholder={`Max: ${activeTransferItem.availableQuantity}`}
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={transferData.quantity}
                        onChange={(e) => setTransferData({ ...transferData, quantity: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => { setIsTransferModalOpen(false); setActiveTransferItem(null); }} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
                  <button
                    type="submit"
                    disabled={isSaving || !transferData.targetDepartment || !transferData.quantity || parseInt(transferData.quantity) > (activeTransferItem.availableQuantity || 0) || parseInt(transferData.quantity) <= 0}
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
                <div className="min-w-0 flex-1 pr-16 sm:pr-20 md:pr-24">
                  <h2 className="text-base sm:text-lg font-pmedium text-[#0F172A] leading-tight break-words">{viewingItem.name}</h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-sm">
                      Dept: {viewingItem.department}
                    </span>
                    {viewingItem.location && (
                      <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest bg-slate-50 border border-slate-200 px-2.5 py-1 rounded shadow-sm">
                        {viewingItem.location}
                      </span>
                    )}
                    {viewingItem.inventoryCode && (
                      <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded shadow-sm">
                        {viewingItem.inventoryCode}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute top-5 sm:top-6 md:top-8 right-14 sm:right-16 md:right-20 flex gap-2">
                  {roleBand !== 'employee' && (
                    <button
                      onClick={() => { setViewingItem(null); openEditItem(viewingItem); }}
                      className="w-10 h-10 bg-white hover:bg-amber-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-amber-600 shadow-sm transition-all"
                      title="Edit"
                    >
                      <Pencil size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
                <button onClick={() => setViewingItem(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-all absolute top-5 sm:top-6 md:top-8 right-5 sm:right-6 md:right-8">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 sm:p-6 md:p-8 overflow-y-auto flex-1 space-y-6 [&::-webkit-scrollbar]:hidden bg-slate-50/30 min-h-[200px]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Category</p>
                    <p className="text-[12px] font-pmedium text-[#0F172A] mt-1 truncate">{viewingItem.category || '--'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Status</p>
                    <p className="text-[12px] font-pmedium text-[#0F172A] mt-1 capitalize">{viewingItem.status || 'active'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Added By</p>
                    <p className="text-[12px] font-pmedium text-[#0F172A] mt-1 capitalize truncate">{viewingItem.addedByRole || '--'}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-100 p-3">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Created</p>
                    <p className="text-[12px] font-pmedium text-[#0F172A] mt-1">{formatDate(viewingItem.createdAt)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                    <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Total{viewingItem.unit ? ` (${viewingItem.unit})` : ''}</p>
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
                {(viewingItem.unitPrice || viewingItem.totalValue) ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                      <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Price per Unit</p>
                      <p className="text-[13px] font-pmedium text-[#0F172A] mt-1">{formatCurrency(viewingItem.unitPrice || 0)}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 p-3 text-center">
                      <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Total Value</p>
                      <p className="text-[13px] font-pmedium text-[#0F172A] mt-1">{formatCurrency(viewingItem.totalValue || 0)}</p>
                    </div>
                  </div>
                ) : null}

                <h3 className="text-[11px] font-black text-[#2563EB] uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-100">
                  <TrendingUp size={15} /> Monthly Stock Balance
                </h3>
                {(() => {
                  const monthlyRows = computeMonthlyBalances(viewingItem);
                  return monthlyRows.length > 0 ? (
                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white">
                      <div className="grid grid-cols-4 px-4 py-2.5 bg-slate-50/70 text-[9px] font-pmedium text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <span>Month</span>
                        <span className="text-center">Opening</span>
                        <span className="text-center">Closing</span>
                        <span className="text-right">Net Change</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden divide-y divide-slate-50">
                        {monthlyRows.map((row) => (
                          <div key={row.monthKey} className="grid grid-cols-4 px-4 py-2.5 items-center">
                            <span className="text-[12px] font-pmedium text-[#0F172A]">{row.monthLabel}</span>
                            <span className="text-[12px] font-pmedium text-slate-500 text-center">{row.opening}{viewingItem.unit ? ` ${viewingItem.unit}` : ''}</span>
                            <span className="text-[12px] font-pmedium text-[#0F172A] text-center">{row.closing}{viewingItem.unit ? ` ${viewingItem.unit}` : ''}</span>
                            <span className={`text-[12px] font-pmedium text-right ${row.netChange > 0 ? 'text-emerald-600' : row.netChange < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              {row.netChange > 0 ? '+' : ''}{row.netChange}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50">
                      <p className="text-[12px] text-slate-500 font-pmedium">No monthly movement recorded yet.</p>
                    </div>
                  );
                })()}

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
                        {entry.source ? <p className="text-[9px] text-slate-400 mt-1">Source: {entry.source}</p> : null}
                      </div>
                      <div className="text-right">
                        <span className="font-black text-lg text-[#0F172A]">{entry.qty}</span>
                        <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest block mt-0.5">Units</span>
                        {entry.unitPrice ? <span className="text-[9px] text-slate-400 block mt-0.5">@ {formatCurrency(entry.unitPrice)}</span> : null}
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

      </AnimatePresence>
      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title={`Export ${deptLabel} Inventory`}
        department={deptLabel}
        category="Other"
        sourceRef={`department-inventory-${normalizeDepartmentKey(deptLabel)}`}
        reportTitle={`${deptLabel} Inventory`}
        defaultDataWindow="Annual"
        onExport={handleExportReport}
      />
    </div>
  );
}

export default DepartmentInventoryPage;
