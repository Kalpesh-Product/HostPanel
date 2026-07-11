import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { getStoredUser } from '@/lib/auth-session';
import { getWorkspaceMembers } from '@/services/auth';
import { createAsset, getAssets, updateAsset } from '@/services/assets';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  Box,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  UploadCloud,
  UserPlus,
  Wrench,
  X,
} from 'lucide-react';

interface Member {
  userId?: string;
  id?: string;
  fullName?: string;
  role?: string;
  departments?: string[];
}

interface EmployeeOption {
  value: string;
  label: string;
  departments: string[];
}

interface Asset {
  recordId?: string;
  _id?: string;
  id?: string;
  assetCode?: string;
  name: string;
  category?: string;
  status: string;
  department?: string;
  assignedTo?: string;
  assignedToUserId?: string | null;
  assignedToDepartment?: string;
  location?: string;
  serialNumber?: string;
  brandModel?: string;
  purchaseDate?: string;
  quantity: number;
  ownershipType?: string;
  rentDurationMonths?: number | null;
  expiryDate?: string;
  warrantyExpiry?: string;
  value?: string;
  notes?: string;
  issueDate?: string;
  updatedAt?: string;
}

interface AssetForm {
  name: string;
  category: string;
  status: string;
  serialNumber: string;
  brandModel: string;
  purchaseDate: string;
  quantity: string;
  ownershipType: string;
  rentDurationMonths: string;
  location: string;
  floor: string;
  wing: string;
  value: string;
  notes: string;
}

interface AssignmentData {
  assetId: string;
  assignmentType: string;
  department: string;
  employee: string;
  quantity: string;
}

interface BulkUploadSummary {
  fileName: string;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  failedCount: number;
  failedRows: string[];
}

interface OrgDepartment {
  name?: string;
  managerUserId?: string;
  managerName?: string;
}

const FLOOR_OPTIONS = ['501', '601', '701'];
const WING_OPTIONS = ['Wing A', 'Wing B'];
const CATEGORY_OPTIONS = ['Hardware', 'Infrastructure', 'Software', 'Furniture', 'Other'];
const STATUS_OPTIONS = ['Active', 'Maintenance', 'Decommissioned'];
const BULK_TEMPLATE_HEADERS = ['name', 'category', 'quantity', 'ownershipType', 'rentDurationMonths', 'serialNumber', 'brandModel', 'purchaseDate', 'floor', 'wing', 'location', 'value', 'notes', 'status'];

const BULK_COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'assetname', 'asset', 'assettitle'],
  category: ['category', 'type', 'assetcategory'],
  quantity: ['quantity', 'qty', 'count', 'units'],
  ownershipType: ['ownershiptype', 'ownership', 'ownership type', 'typeownership'],
  rentDurationMonths: ['rentdurationmonths', 'rentmonths', 'rent month', 'rentalmonths', 'rentaldurationmonths', 'rentedmonths'],
  serialNumber: ['serialnumber', 'serialno', 'assettag', 'assetcode', 'tag'],
  brandModel: ['brandmodel', 'brand', 'model', 'make', 'makeandmodel'],
  purchaseDate: ['purchasedate', 'purchase date', 'datepurchased', 'acquireddate'],
  floor: ['floor', 'level'],
  wing: ['wing', 'block', 'section'],
  location: ['location', 'locationlabel', 'site'],
  value: ['value', 'cost', 'price', 'purchasevalue', 'assetvalue'],
  notes: ['notes', 'note', 'remarks', 'remark', 'description'],
  status: ['status', 'assetstatus'],
};

function getLocationLabel(floor: string, wing: string): string {
  const parts = [floor, wing].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

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
  const raw = user?.workspaceMembership?.departments?.[0] || user?.workspaceMembership?.department || user?.department || 'Department';
  return formatDepartmentName(raw);
}

function getDepartmentLabelFromPathname(pathname: string): string {
  const normalized = pathname.trim().toLowerCase();
  if (!normalized.startsWith('/dashboard/')) return '';
  const map: [string, string][] = [
    ['/dashboard/hr', 'HR'],
    ['/dashboard/administration', 'Administration'],
    ['/dashboard/sales-crm', 'Sales'],
    ['/dashboard/finance', 'Finance'],
    ['/dashboard/tech', 'Tech'],
    ['/dashboard/it', 'IT'],
    ['/dashboard/maintenance', 'Maintenance'],
  ];
  const match = map.find(([prefix]) => normalized.startsWith(prefix));
  return match ? match[1] : '';
}

function getResolvedDepartmentLabel(user: any, pathname: string): string {
  return getDepartmentLabelFromPathname(pathname) || getDepartmentLabel(user);
}

function areDepartmentsEqual(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function normalizeAsset(a: any): Asset {
  return {
    ...a,
    id: a.id || a.assetCode,
    assetCode: a.assetCode || a.id,
    assignedToUserId: a.assignedToUserId || null,
    issueDate: a.updatedAt ? new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '-',
    serialNumber: a.serialNumber || '',
    brandModel: a.brandModel || '',
    purchaseDate: a.purchaseDate || '',
    quantity: typeof a.quantity === 'number' ? a.quantity : Number(a.quantity) || 1,
    ownershipType: a.ownershipType || 'Owned',
    rentDurationMonths: typeof a.rentDurationMonths === 'number' ? a.rentDurationMonths : a.rentDurationMonths ? Number(a.rentDurationMonths) || null : null,
    expiryDate: a.expiryDate || a.warrantyExpiry || '',
    warrantyExpiry: a.warrantyExpiry || a.expiryDate || '',
  };
}

function getAssetState(asset: Asset, departmentLabel?: string): string {
  if (asset.status === 'Maintenance') return 'Under Repair';
  if (asset.status === 'Decommissioned') return 'Decommissioned';
  if (asset.assignedToUserId || (asset.assignedTo && asset.assignedTo !== 'Unassigned')) return 'Assigned';
  return 'Available';
}

function getStatusStyle(state: string): string {
  switch (state) {
    case 'Available': return 'bg-green-50 text-green-600 border-green-200';
    case 'Assigned': return 'bg-blue-50 text-blue-600 border-blue-200';
    case 'Under Repair': return 'bg-orange-50 text-orange-600 border-orange-200';
    case 'Decommissioned': return 'bg-gray-100 text-gray-500 border-gray-200';
    default: return 'bg-gray-50 text-gray-600';
  }
}

function getAssignmentMeta(asset: Asset): { primary: string; departmentBadge: string } {
  const assignedTo = (asset?.assignedTo || '').trim();
  const assignedDepartment = (asset?.assignedToDepartment || '').trim();
  if (!assignedTo || assignedTo.toLowerCase() === 'unassigned') return { primary: 'Unassigned', departmentBadge: '' };
  if (asset?.assignedToUserId) return { primary: assignedTo, departmentBadge: assignedDepartment };
  return { primary: assignedTo, departmentBadge: '' };
}

function isManagerStyleRole(user: any): boolean {
  const role = String(user?.workspaceMembership?.role || user?.role || '').trim().toLowerCase();
  return role === 'owner' || role === 'super-admin' || role === 'super_admin' || role === 'admin' || role.includes('manager');
}

function getManagedDepartmentLabels(user: any): string[] {
  const userId = String(user?.id || user?._id || '').trim().toLowerCase();
  const userName = String(user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || '').trim().toLowerCase();
  const organizationDepartments: OrgDepartment[] = Array.isArray(user?.workspace?.organizationDepartments) ? user.workspace.organizationDepartments : [];
  return organizationDepartments
    .filter((dept) => {
      const managerUserId = String(dept?.managerUserId || '').trim().toLowerCase();
      const managerName = String(dept?.managerName || '').trim().toLowerCase();
      return (userId && managerUserId && userId === managerUserId) || (userName && managerName && userName === managerName);
    })
    .map((dept) => String(dept?.name || '').trim().toLowerCase())
    .filter(Boolean);
}

function isInboundDepartmentTransfer(asset: Asset, departmentLabel: string): boolean {
  const current = departmentLabel.trim().toLowerCase();
  const owning = (asset?.department || '').trim().toLowerCase();
  const assignedDept = (asset?.assignedToDepartment || '').trim().toLowerCase();
  const assignedTo = (asset?.assignedTo || '').trim().toLowerCase();
  return !asset?.assignedToUserId && assignedDept === current && assignedTo === current && owning !== current;
}

function assetBelongsToDepartmentScope(asset: Asset, departmentLabel: string): boolean {
  const current = departmentLabel.trim().toLowerCase();
  if (!current) return true;
  const owning = (asset?.department || '').trim().toLowerCase();
  const assignedDept = (asset?.assignedToDepartment || '').trim().toLowerCase();
  const assignedTo = (asset?.assignedTo || '').trim().toLowerCase();
  const isAssignedToDeptOnly = !asset?.assignedToUserId && assignedTo !== 'unassigned';
  return owning === current || assignedDept === current || (isAssignedToDeptOnly && assignedTo === current);
}

function getDepartmentOptions(user: any, fallbackDepartment: string): string[] {
  const orgDepts: string[] = Array.isArray(user?.workspace?.organizationDepartments) ? user.workspace.organizationDepartments.map((d: OrgDepartment) => d?.name).filter(Boolean) : [];
  const wsDepts: string[] = Array.isArray(user?.workspace?.departments) ? user.workspace.departments : [];
  const draftDepts: string[] = Array.isArray(user?.workspaceDraft?.departments) ? user.workspaceDraft.departments : [];
  const membershipDepts: string[] = Array.isArray(user?.workspaceMembership?.departments) ? user.workspaceMembership.departments : [];
  const current = formatDepartmentName(fallbackDepartment).toLowerCase();
  const seen = new Set<string>();
  return [...orgDepts, ...wsDepts, ...draftDepts, ...membershipDepts]
    .map(formatDepartmentName)
    .filter(Boolean)
    .filter((d) => d.toLowerCase() !== current)
    .filter((d) => {
      const key = d.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeBulkHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function resolveBulkCellValue(row: Record<string, any>, aliases: string[]): string {
  const entries = Object.entries(row).map(([k, v]) => [normalizeBulkHeader(k), v]);
  for (const alias of aliases) {
    const normalized = normalizeBulkHeader(alias);
    const match = entries.find(([key]) => key === normalized);
    if (match && String(match[1] ?? '').trim()) return String(match[1]);
  }
  return '';
}

function normalizeBulkCategory(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (['hardware', 'physical', 'asset', 'device'].includes(normalized)) return 'Hardware';
  if (['infrastructure', 'infra'].includes(normalized)) return 'Infrastructure';
  if (['software', 'digital', 'app', 'application'].includes(normalized)) return 'Software';
  if (['furniture', 'desk', 'chair', 'cabinet'].includes(normalized)) return 'Furniture';
  const match = CATEGORY_OPTIONS.find((c) => c.toLowerCase() === normalized);
  return match || 'Other';
}

function normalizeBulkStatus(value: string): string {
  const normalized = value.trim().toLowerCase();
  return STATUS_OPTIONS.find((s) => s.toLowerCase() === normalized) || 'Active';
}

function normalizeBulkOwnershipType(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 'Owned';
  if (['rented', 'rent', 'rental', 'lease', 'leased'].includes(normalized)) return 'Rented';
  return 'Owned';
}

function normalizeBulkQuantity(value: string): number {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 1;
}

function normalizeBulkRentDurationMonths(value: string): number | null {
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

function buildBulkAssetPayload(row: Record<string, any>, owningDepartment: string): Record<string, any> | null {
  const name = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.name).trim();
  if (!name) return null;
  const ownershipType = normalizeBulkOwnershipType(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.ownershipType));
  const floor = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.floor).trim();
  const wing = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.wing).trim();
  const locationText = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.location).trim();
  const resolvedLocation = getLocationLabel(floor, wing) || locationText;
  return {
    name,
    category: normalizeBulkCategory(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.category)),
    department: owningDepartment,
    status: normalizeBulkStatus(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.status)),
    quantity: normalizeBulkQuantity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.quantity)),
    ownershipType,
    rentDurationMonths: ownershipType === 'Rented' ? normalizeBulkRentDurationMonths(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.rentDurationMonths)) : null,
    serialNumber: resolveBulkCellValue(row, BULK_COLUMN_ALIASES.serialNumber).trim(),
    brandModel: resolveBulkCellValue(row, BULK_COLUMN_ALIASES.brandModel).trim(),
    purchaseDate: resolveBulkCellValue(row, BULK_COLUMN_ALIASES.purchaseDate).trim(),
    location: resolvedLocation,
    value: resolveBulkCellValue(row, BULK_COLUMN_ALIASES.value).trim(),
    notes: resolveBulkCellValue(row, BULK_COLUMN_ALIASES.notes).trim(),
  };
}

async function readSpreadsheetRows(file: File): Promise<Record<string, any>[]> {
  const name = file.name.toLowerCase();
  const isCsv = name.endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function DepartmentAssetsPage() {
  const location = useLocation();
  const storedUser = getStoredUser();
  const deptLabel = getResolvedDepartmentLabel(storedUser, location.pathname);
  const departmentOptions = useMemo(() => getDepartmentOptions(storedUser, deptLabel), [storedUser, deptLabel]);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);
  const canAssignAcrossDepartments = useMemo(
    () => isManagerStyleRole(storedUser) || getManagedDepartmentLabels(storedUser).length > 0 || ['it', 'maintenance'].includes(deptLabel.trim().toLowerCase()),
    [deptLabel, storedUser],
  );

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadFileName, setBulkUploadFileName] = useState('');
  const [bulkUploadSummary, setBulkUploadSummary] = useState<BulkUploadSummary | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [assignmentData, setAssignmentData] = useState<AssignmentData>({ assetId: '', assignmentType: 'department', department: '', employee: '', quantity: '1' });
  const [memberOptions, setMemberOptions] = useState<EmployeeOption[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetForm, setAssetForm] = useState<AssetForm>({
    name: '', category: 'Hardware', status: 'Active', serialNumber: '', brandModel: '', purchaseDate: '', quantity: '1',
    ownershipType: 'Owned', rentDurationMonths: '', location: '', floor: '', wing: '', value: '', notes: '',
  });

  const refreshAssets = useCallback(async () => {
    const response = await getAssets();
    const allAssets = (Array.isArray(response?.data?.assets) ? response.data.assets : Array.isArray(response?.assets) ? response.assets : []) as any[];
    const normalized = allAssets.map(normalizeAsset);
    setAssets(normalized);
    return normalized;
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadMembers() {
      try {
        const response = await getWorkspaceMembers();
        if (!mounted) return;
        const members: Member[] = Array.isArray(response?.data?.members) ? response.data.members : Array.isArray(response?.members) ? response.members : [];
        const options = members
          .map((m) => ({ value: m.userId || m.id || '', label: m.fullName || '', departments: Array.isArray(m.departments) ? m.departments : [] }))
          .filter((m) => m.value && m.label);
        setMemberOptions(options);
      } catch {
        if (mounted) setMemberOptions([]);
      } finally {
        if (mounted) setIsLoadingMembers(false);
      }
    }
    loadMembers();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadAssets() {
      try {
        const response = await getAssets();
        if (!mounted) return;
        const allAssets = (Array.isArray(response?.data?.assets) ? response.data.assets : Array.isArray(response?.assets) ? response.assets : []) as any[];
        setAssets(allAssets.map(normalizeAsset));
        setErrorMessage('');
      } catch (error: any) {
        if (mounted) setErrorMessage(error.message || 'Unable to load assets right now.');
      } finally {
        if (mounted) setIsLoadingAssets(false);
      }
    }
    loadAssets();
    return () => { mounted = false; };
  }, [deptLabel]);

  useEffect(() => {
    if (!isLoadingMembers && !isLoadingAssets) {
      setIsInitialLoading(false);
    }
  }, [isLoadingMembers, isLoadingAssets]);

  const assignmentEmployeeOptions = useMemo(() => {
    return memberOptions.filter((emp) =>
      emp.departments.some((d) => areDepartmentsEqual(d, deptLabel)),
    );
  }, [deptLabel, memberOptions]);

  const visibleAssets = useMemo(() => assets.filter((a) => assetBelongsToDepartmentScope(a, deptLabel)), [assets, deptLabel]);

  const displayedAssets = useMemo(() => {
    return visibleAssets.filter((a) => {
      const state = getAssetState(a, deptLabel);
      const matchesStatus = statusFilter === 'all' || state.toLowerCase() === statusFilter.toLowerCase();
      const categoryLabel = (a.category || '').toLowerCase();
      const matchesCategory = categoryFilter === 'all' || categoryLabel === categoryFilter.toLowerCase();
      const searchTerm = searchQuery.trim().toLowerCase();
      const matchesSearch = !searchTerm || ['name', 'id', 'assetCode', 'category', 'location', 'department', 'assignedTo', 'serialNumber']
        .some((field) => String((a as any)[field] || '').toLowerCase().includes(searchTerm));
      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, deptLabel, searchQuery, statusFilter, visibleAssets]);

  const assignableAssets = visibleAssets.filter((a) => getAssetState(a, deptLabel) === 'Available');
  const totalCount = visibleAssets.length;
  const assignedCount = visibleAssets.filter((a) => getAssetState(a, deptLabel) === 'Assigned').length;
  const availableCount = visibleAssets.filter((a) => getAssetState(a, deptLabel) === 'Available').length;
  const repairCount = visibleAssets.filter((a) => getAssetState(a, deptLabel) === 'Under Repair').length;
  const assignedAssets = useMemo(() => visibleAssets.filter((a) => getAssetState(a, deptLabel) === 'Assigned').sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()), [deptLabel, visibleAssets]);
  const isEmployeeAssignment = assignmentData.assignmentType === 'employee';
  const selectedAssignmentAsset = useMemo(() => visibleAssets.find((a) => a.id === assignmentData.assetId) || null, [visibleAssets, assignmentData.assetId]);
  const selectedAssetRequiresEmployeeAssignment = Boolean(selectedAssignmentAsset && isInboundDepartmentTransfer(selectedAssignmentAsset, deptLabel));
  const maxAssignableQuantity = selectedAssignmentAsset?.quantity || 1;
  const assignmentDepartmentOptions = useMemo(() => Array.from(new Set([deptLabel, ...(canAssignAcrossDepartments ? departmentOptions : [])].filter(Boolean))).map((d) => ({ value: d, label: d })), [deptLabel, canAssignAcrossDepartments, departmentOptions]);
  const canTransferBackToOwningDept = Boolean(viewingAsset && (viewingAsset.assignedTo || '').trim() && (viewingAsset.assignedTo || '').trim().toLowerCase() !== (viewingAsset.department || '').trim().toLowerCase() && getAssetState(viewingAsset, deptLabel) !== 'Decommissioned');

  const getAssetCategoryLabel = (category?: string): string => {
    const labels: Record<string, string> = { Hardware: 'Hardware', Infrastructure: 'Infrastructure', Software: 'Software', Furniture: 'Furniture', Other: 'Other' };
    return labels[category || ''] || category || 'Other';
  };

  async function handleCreateAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSaving(true);
    try {
      const response = await createAsset({
        name: assetForm.name,
        category: assetForm.category,
        department: deptLabel,
        status: assetForm.status,
        serialNumber: assetForm.serialNumber,
        brandModel: assetForm.brandModel,
        purchaseDate: assetForm.purchaseDate,
        quantity: Math.max(1, parseInt(assetForm.quantity || '1', 10) || 1),
        ownershipType: assetForm.ownershipType,
        rentDurationMonths: assetForm.ownershipType === 'Rented' ? assetForm.rentDurationMonths : null,
        location: getLocationLabel(assetForm.floor, assetForm.wing) || assetForm.location,
        value: assetForm.value,
        notes: assetForm.notes,
        assignedTo: 'Unassigned',
        assignedToUserId: null,
      });
      const createdAsset = response?.data?.asset || response?.asset;
      if (createdAsset) {
        const latestAssets = await refreshAssets();
        const createdId = String(createdAsset.recordId || createdAsset._id || createdAsset.id || createdAsset.assetCode || '').trim();
        const exists = latestAssets.some((a: any) =>
          [a.recordId, a._id, a.id, a.assetCode].map((v) => String(v || '').trim()).includes(createdId),
        );
        if (!exists) setErrorMessage('Asset save response received, but it was not returned by the latest server list.');
      }
      setAssetForm({ name: '', category: 'Hardware', status: 'Active', serialNumber: '', brandModel: '', purchaseDate: '', quantity: '1', ownershipType: 'Owned', rentDurationMonths: '', location: '', floor: '', wing: '', value: '', notes: '' });
      setIsAddModalOpen(false);
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to create asset right now.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAssignAsset() {
    if (!assignmentData.assetId) return;
    const targetAsset = assets.find((a) => a.id === assignmentData.assetId);
    if (!targetAsset) return;
    const selectedEmployee = isEmployeeAssignment ? assignmentEmployeeOptions.find((e) => e.value === assignmentData.employee) : null;
    if (isEmployeeAssignment && !selectedEmployee) return;
    setErrorMessage('');
    setIsSaving(true);
    try {
      const selectedDepartment = !isEmployeeAssignment ? assignmentDepartmentOptions.find((d) => d.value === assignmentData.department) : null;
      if (!isEmployeeAssignment && !selectedDepartment) return;
      await updateAsset(targetAsset.recordId || targetAsset.id || '', {
        assignedTo: isEmployeeAssignment ? selectedEmployee?.label || assignmentData.employee : selectedDepartment?.value || assignmentData.department,
        assignedToUserId: isEmployeeAssignment ? selectedEmployee?.value || null : null,
        assignedToDepartment: isEmployeeAssignment ? '' : selectedDepartment?.value || assignmentData.department,
        assignmentQuantity: isEmployeeAssignment ? 1 : Math.max(1, parseInt(assignmentData.quantity || '1', 10) || 1),
        status: 'Active',
      });
      await refreshAssets();
      setShowAssignDialog(false);
      setAssignmentData({ assetId: '', assignmentType: 'department', department: '', employee: '', quantity: '1' });
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to assign asset right now.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTransferBackToOwningDept() {
    if (!viewingAsset?.recordId && !viewingAsset?.id) return;
    setErrorMessage('');
    setIsSaving(true);
    try {
      const response = await updateAsset(viewingAsset.recordId || viewingAsset.id || '', {
        assignedTo: 'Unassigned',
        assignedToUserId: null,
        status: 'Active',
        transferReason: `Returned to owning department: ${viewingAsset.department}`,
      });
      const updated = response?.data?.asset || response?.asset;
      if (updated) {
        await refreshAssets();
        setViewingAsset(normalizeAsset(updated));
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to transfer asset right now.');
    } finally {
      setIsSaving(false);
    }
  }

  function downloadBulkTemplate() {
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([Object.fromEntries(BULK_TEMPLATE_HEADERS.map((h) => [h, '']))]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Assets');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(CATEGORY_OPTIONS.map((c) => ({ 'Allowed Category': c }))), 'Allowed Categories');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(FLOOR_OPTIONS.map((f) => ({ 'Allowed Floor': f }))), 'Allowed Floors');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(WING_OPTIONS.map((w) => ({ 'Allowed Wing': w }))), 'Allowed Wings');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(STATUS_OPTIONS.map((s) => ({ 'Allowed Status': s }))), 'Allowed Status');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(BULK_TEMPLATE_HEADERS.map((h) => ({ Field: h, Requirement: h === 'name' ? 'Required' : 'Optional', Notes: '' }))), 'Field Guide');
    XLSX.writeFile(workbook, `department-assets-template-${deptLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'template'}.xlsx`);
  }

  async function handleBulkFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setErrorMessage('');
    setIsSaving(true);
    setBulkUploadSummary(null);
    setBulkUploadFileName(file.name);
    try {
      const rows = await readSpreadsheetRows(file);
      if (!rows.length) throw new Error('The file does not contain any asset rows.');
      const importRows = rows.map((row, idx) => ({ row, index: idx + 2 })).filter(({ row }) => buildBulkAssetPayload(row, deptLabel));
      if (!importRows.length) throw new Error('No valid asset rows were found. Make sure each row has at least a name.');
      let createdCount = 0;
      const failedRows: string[] = [];
      for (const { row, index } of importRows) {
        const payload = buildBulkAssetPayload(row, deptLabel);
        if (!payload) { failedRows.push(`Row ${index}: missing asset name.`); continue; }
        try {
          const response = await createAsset(payload);
          if (response?.data?.asset || response?.asset) createdCount += 1;
          else failedRows.push(`Row ${index}: asset was not returned by the server.`);
        } catch (err: any) {
          failedRows.push(`Row ${index}: ${err.message || 'failed to import.'}`);
        }
      }
      setBulkUploadSummary({ fileName: file.name, totalRows: rows.length, processedRows: importRows.length, createdCount, failedCount: failedRows.length, failedRows: failedRows.slice(0, 5) });
      if (createdCount > 0) await refreshAssets();
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to import assets right now.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 bg-[#F8FAFC] min-h-screen text-[#1E293B] font-sans flex flex-col">
      <input ref={bulkUploadInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkFileSelected} />
      {isInitialLoading && (
        <div className="space-y-4">
          <div className="h-12 w-56 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-3xl border border-gray-100 animate-pulse" />)}
          </div>
          <div className="h-105 bg-white rounded-[2.5rem] border border-gray-100 animate-pulse" />
        </div>
      )}

      {!isInitialLoading && (
        <>
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div>
              <h1 className="text-3xl font-black text-[#0F172A] tracking-tight">Tracked Assets</h1>
              <p className="text-sm font-bold text-[#2563EB] uppercase tracking-widest mt-1">{deptLabel} &bull; Department Assets</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button onClick={() => { setBulkUploadSummary(null); setBulkUploadFileName(''); setIsBulkUploadOpen(true); }} className="bg-white text-[#0F172A] px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-2 border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                <UploadCloud size={18} strokeWidth={2.75} /> BULK UPLOAD
              </button>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-[#2563EB] px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-2 border border-blue-200 shadow-sm hover:border-blue-300 transition-all">
                <Box size={18} strokeWidth={2.75} /> ADD ASSET
              </button>
              <button onClick={() => { setAssignmentData({ assetId: '', assignmentType: 'department', department: '', employee: '', quantity: '1' }); setShowAssignDialog(true); }} className="bg-[#2563EB] text-white px-5 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-200 hover:scale-[1.01] transition-all">
                <UserPlus size={18} strokeWidth={2.75} /> ASSIGN ASSET
              </button>
            </div>
          </div>
          {errorMessage ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-600">{errorMessage}</div> : null}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 shrink-0">
            {[
              { label: 'Tracked Assets', count: totalCount, color: 'gray', icon: <Box size={24} /> },
              { label: 'Assigned', count: assignedCount, color: 'blue', icon: <ShieldCheck size={24} /> },
              { label: 'Available', count: availableCount, color: 'green', icon: <CheckCircle2 size={24} /> },
              { label: 'In Repair', count: repairCount, color: 'orange', icon: <Wrench size={24} /> },
            ].map((stat) => (
              <div key={stat.label} className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center border-l-4 border-l-${stat.color}-500`}>
                <div>
                  <p className={`text-[10px] font-pmedium text-${stat.color}-500 uppercase tracking-widest mb-1`}>{stat.label}</p>
                  <p className={`text-4xl font-black text-${stat.color}-600`}>{stat.count}</p>
                </div>
                <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600`}>{stat.icon}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 min-h-100">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 shrink-0">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Search name, code, location, or assignee..." className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#2563EB] outline-none shadow-sm" value={searchQuery} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-48">
                  <select className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#2563EB] outline-none appearance-none cursor-pointer shadow-sm" value={statusFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="under repair">Under Repair</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
                <div className="relative w-full md:w-52">
                  <select className="w-full px-4 py-3 pl-11 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 focus:ring-2 focus:ring-[#2563EB] outline-none appearance-none cursor-pointer shadow-sm" value={categoryFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}>
                    <option value="all">All Categories</option>
                    {CATEGORY_OPTIONS.map((c) => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                  </select>
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-white text-[10px] font-pmedium text-gray-400 uppercase tracking-widest border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-5">Asset Info</th>
                    <th className="px-8 py-5">Type</th>
                    <th className="px-8 py-5 text-center">Quantity</th>
                    <th className="px-8 py-5">Assignment</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5">Last Updated</th>
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayedAssets.map((asset) => {
                    const state = getAssetState(asset);
                    const meta = getAssignmentMeta(asset);
                    return (
                      <tr key={asset.id} className="hover:bg-blue-50/30 transition-all group">
                        <td className="px-8 py-5">
                          <div className="font-bold text-gray-900">{asset.name}</div>
                          <div className="text-[10px] font-pmedium text-[#2563EB] tracking-wider uppercase mt-0.5">{asset.assetCode || asset.id}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-pmedium uppercase tracking-widest text-gray-500">
                            <span className="px-2 py-1 rounded-md bg-gray-50 border border-gray-100">Location: {asset.location || '--'}</span>
                            <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-100 text-[#2563EB]">Owning Dept: {asset.department || deptLabel}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-pmedium uppercase tracking-widest ${asset.category === 'Hardware' ? 'bg-slate-100 text-slate-700' : 'bg-purple-50 text-purple-700'}`}>
                            {getAssetCategoryLabel(asset.category)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="inline-flex min-w-12 items-center justify-center rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-black text-slate-800">{asset.quantity || 1}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="font-bold text-gray-900">{meta.primary}</div>
                          {meta.departmentBadge ? <div className="mt-1"><span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-wide text-[#2563EB]">{meta.departmentBadge}</span></div> : null}
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`px-3 py-1.5 rounded-md text-[9px] font-pmedium uppercase tracking-widest border ${getStatusStyle(state)}`}>{state}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-gray-600">{asset.issueDate}</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {state === 'Available' ? (
                              <button onClick={() => { setAssignmentData({ assetId: asset.id || '', assignmentType: 'department', department: '', employee: '', quantity: '1' }); setShowAssignDialog(true); }} className="px-3 py-1.5 bg-blue-50 text-[#2563EB] border border-blue-100 hover:border-blue-200 hover:bg-blue-100 rounded-full text-[10px] font-pmedium tracking-wide transition-all shadow-sm">Assign</button>
                            ) : null}
                            <button onClick={() => setViewingAsset(asset)} className="p-2 bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] hover:border-blue-200 rounded-lg transition-all shadow-sm"><Eye size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {displayedAssets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center"><Box className="text-gray-300" size={24} /></div>
                          <p className="text-gray-500 font-bold text-sm">No assets found</p>
                          <p className="text-gray-400 text-xs">Try adjusting your filters or search terms.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showAssignDialog && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-150 p-4">
          <div className="bg-white rounded-4xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-start bg-white shrink-0">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-pmedium tracking-[0.18em] uppercase text-[#2563EB]"><UserPlus size={14} strokeWidth={2.5} /> Assign asset</div>
                <h2 className="mt-3 text-xl sm:text-2xl font-black text-slate-900 leading-tight">Assign tracked assets without losing department context</h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2 max-w-2xl">Pick any trackable asset, choose the target, and keep the department ledger in sync.</p>
              </div>
              <button onClick={() => setShowAssignDialog(false)} className="w-9 h-9 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 border border-slate-200 shadow-sm hover:scale-105 transition-all"><X size={18} /></button>
            </div>
            <div className="grid gap-0 lg:grid-cols-[1.35fr_0.85fr] flex-1 min-h-0">
              <div className="p-5 sm:p-6 lg:p-7 space-y-5 overflow-y-auto">
                {assignableAssets.length === 0 ? (
                  <div className="p-5 rounded-2xl flex gap-3 border border-red-200 bg-red-50 items-center"><AlertCircle className="text-red-600 shrink-0" size={24} /><p className="text-sm text-red-800 font-semibold">No trackable assets are currently available.</p></div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.22em]">Select asset</label>
                      <div className="relative">
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:border-[#2563EB] focus:bg-white outline-none appearance-none cursor-pointer transition-all" value={assignmentData.assetId} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                          const next = visibleAssets.find((a) => a.id === e.target.value);
                          setAssignmentData((prev) => ({ ...prev, assetId: e.target.value, quantity: next ? String(next.quantity || 1) : '1', assignmentType: next && isInboundDepartmentTransfer(next, deptLabel) ? 'employee' : prev.assignmentType }));
                        }}>
                          <option value="">Choose an asset</option>
                          {assignableAssets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.assetCode || a.id}) - Qty {a.quantity || 1}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
                      <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-[0.2em]">Department scope</p>
                      <p className="text-sm font-medium text-[#2563EB] mt-1">Choose the department or employee this asset is assigned to. The record stays visible in its owning department.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.22em]">Assignment target</label>
                      <div className="relative">
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:border-[#2563EB] focus:bg-white outline-none appearance-none cursor-pointer transition-all" value={selectedAssetRequiresEmployeeAssignment ? 'employee' : assignmentData.assignmentType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssignmentData((prev) => ({ ...prev, assignmentType: e.target.value, department: e.target.value === 'department' ? prev.department : '', employee: e.target.value === 'employee' ? prev.employee : '', quantity: e.target.value === 'employee' ? '1' : selectedAssignmentAsset ? String(selectedAssignmentAsset.quantity || 1) : prev.quantity }))} disabled={selectedAssetRequiresEmployeeAssignment}>
                          <option value="department">Department</option>
                          <option value="employee">Employee</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                      {selectedAssetRequiresEmployeeAssignment ? <p className="text-[11px] font-medium text-slate-400">This transferred asset can only be assigned to an employee in {deptLabel}.</p> : null}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.22em]">{(selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? 'Employee' : 'Department'}</label>
                      <div className="relative">
                        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:border-[#2563EB] focus:bg-white outline-none appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-all" value={(selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? assignmentData.employee : assignmentData.department} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssignmentData((prev) => ({ ...prev, ...((selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? { employee: e.target.value } : { department: e.target.value }) }))} disabled={(selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? !assignmentEmployeeOptions.length : !assignmentDepartmentOptions.length}>
                          {(selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? (
                            <><option value="">-- Choose Employee --</option>{assignmentEmployeeOptions.map((emp) => <option key={emp.value} value={emp.value}>{emp.label}</option>)}</>
                          ) : (
                            <><option value="">-- Choose Department --</option>{assignmentDepartmentOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}</>
                          )}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.22em]">Quantity to transfer</label>
                      {(selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-sm font-semibold text-slate-900">1 item</p></div>
                      ) : (
                        <><input type="number" min={1} max={maxAssignableQuantity} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 focus:border-[#2563EB] focus:bg-white outline-none transition-all" value={assignmentData.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setAssignmentData((prev) => ({ ...prev, quantity: v })); }} disabled={!selectedAssignmentAsset} />
                        <p className="text-[11px] font-medium text-slate-400">Available to transfer: {maxAssignableQuantity}</p></>
                      )}
                    </div>
                  </>
                )}
              </div>
              <aside className="border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/60 p-5 sm:p-6 lg:p-7 flex flex-col min-h-0">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.22em]">Assigned assets</p>
                    <p className="text-sm font-medium text-slate-500">Current assignments in {deptLabel}</p>
                  </div>
                  <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">{assignedAssets.length} total</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                  {assignedAssets.length > 0 ? assignedAssets.map((a) => {
                    const meta = getAssignmentMeta(a);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{a.name}</p>
                          <p className="text-[11px] font-medium text-slate-500 truncate">Assigned to {meta.primary}</p>
                          {meta.departmentBadge ? <span className="mt-1 inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-pmedium uppercase tracking-wide text-[#2563EB]">{meta.departmentBadge}</span> : null}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-black text-slate-700">Qty {a.quantity || 1}</p>
                          <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-[0.2em]">{a.issueDate}</p>
                        </div>
                      </div>
                    );
                  }) : <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-center"><p className="text-sm font-medium text-slate-500">No assets are assigned yet.</p></div>}
                </div>
                <div className="pt-4 mt-4 border-t border-slate-200/80 flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setShowAssignDialog(false)} className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-sm font-pmedium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all">Cancel</button>
                  <button disabled={!assignmentData.assetId || isSaving || ((selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) ? !assignmentData.employee : !assignmentData.department) || (!(selectedAssetRequiresEmployeeAssignment || isEmployeeAssignment) && (!assignmentData.quantity || Number(assignmentData.quantity) <= 0 || Number(assignmentData.quantity) > maxAssignableQuantity))} onClick={handleAssignAsset} className="flex-1 py-3 rounded-xl bg-[#2563EB] text-sm font-pmedium text-white shadow-lg shadow-blue-200 disabled:bg-slate-300 disabled:shadow-none hover:bg-blue-700 transition-all">{isSaving ? 'Saving...' : 'Confirm'}</button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {viewingAsset && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-150 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{viewingAsset.name}</h2>
                <span className="font-black text-[#2563EB] font-mono bg-blue-50 px-2 py-0.5 rounded text-xs mt-1 inline-block">{viewingAsset.assetCode || viewingAsset.id}</span>
              </div>
              <button onClick={() => setViewingAsset(null)} className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:text-red-500"><X size={18} /></button>
            </div>
            <div className="p-8 space-y-5 bg-white flex-1">
              {[
                { label: 'Owning Dept', value: viewingAsset.department || deptLabel },
                { label: 'Category', value: getAssetCategoryLabel(viewingAsset.category) },
                { label: 'Quantity', value: String(viewingAsset.quantity || 1) },
                { label: 'Ownership', value: viewingAsset.ownershipType || 'Owned' },
                ...(String(viewingAsset.ownershipType || '').trim() === 'Rented' ? [{ label: 'Rent (Months)', value: String(viewingAsset.rentDurationMonths || '-') }] : []),
                { label: 'Expiry Date', value: viewingAsset.expiryDate || viewingAsset.warrantyExpiry || '-' },
                { label: 'Assignment', value: getAssignmentMeta(viewingAsset).primary },
                { label: 'Location', value: viewingAsset.location || '-' },
                { label: 'Last Updated', value: viewingAsset.issueDate },
                { label: 'Current Status', value: getAssetState(viewingAsset, deptLabel), isStatus: true },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center pb-3 border-b border-gray-50">
                  <span className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">{row.label}</span>
                  {row.isStatus ? (
                    <span className={`px-3 py-1 rounded-md text-[9px] font-pmedium uppercase tracking-widest border ${getStatusStyle(row.value)}`}>{row.value}</span>
                  ) : (
                    <span className="font-bold text-gray-900">{row.value}</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-8 pb-8 pt-2 bg-white border-t border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleTransferBackToOwningDept} disabled={!canTransferBackToOwningDept || isSaving} className="flex-1 py-3 rounded-2xl bg-[#2563EB] text-white font-pmedium shadow-lg shadow-blue-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-blue-700 transition-all">{isSaving ? 'Saving...' : 'Transfer Back to Owning Dept'}</button>
                <button onClick={() => setViewingAsset(null)} className="flex-1 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-pmedium hover:bg-gray-50 transition-all">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkUploadOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-150 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-8 bg-slate-950 text-white border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black leading-none flex items-center gap-2"><UploadCloud size={24} /> Bulk Upload Assets</h2>
                <p className="text-[10px] font-pmedium text-slate-300 uppercase tracking-widest mt-2">Import many assets from Excel or CSV</p>
              </div>
              <button onClick={() => setIsBulkUploadOpen(false)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-5 overflow-y-auto flex-1 bg-slate-50/60">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest">Ownership locked</p>
                <p className="text-sm font-semibold text-[#2563EB] mt-1">Imported assets will be owned by {deptLabel}.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Required</p><p className="mt-2 text-sm font-semibold text-slate-700">`name`</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest">Optional</p><p className="mt-2 text-sm font-semibold text-slate-700">`category`, `quantity`, `ownershipType`, `rentDurationMonths`, `serialNumber`, `brandModel`, `purchaseDate`, `location`, `value`, `notes`, `status`</p></div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={downloadBulkTemplate} className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-pmedium text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"><Download size={16} /> Download Template</button>
                <button onClick={() => bulkUploadInputRef.current?.click()} disabled={isSaving} className="flex-1 py-3 rounded-2xl bg-[#2563EB] text-sm font-pmedium text-white shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-2"><UploadCloud size={16} /> {isSaving ? 'Importing...' : 'Choose File'}</button>
              </div>
              {bulkUploadSummary && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
                  <p className="text-[10px] font-pmedium text-green-700 uppercase tracking-widest">Import summary</p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl bg-white p-3 border border-green-100"><p className="text-[10px] font-pmedium text-slate-400 uppercase">Rows</p><p className="mt-1 font-bold text-slate-900">{bulkUploadSummary.totalRows}</p></div>
                    <div className="rounded-xl bg-white p-3 border border-green-100"><p className="text-[10px] font-pmedium text-slate-400 uppercase">Processed</p><p className="mt-1 font-bold text-slate-900">{bulkUploadSummary.processedRows}</p></div>
                    <div className="rounded-xl bg-white p-3 border border-green-100"><p className="text-[10px] font-pmedium text-slate-400 uppercase">Created</p><p className="mt-1 font-bold text-green-700">{bulkUploadSummary.createdCount}</p></div>
                    <div className="rounded-xl bg-white p-3 border border-green-100"><p className="text-[10px] font-pmedium text-slate-400 uppercase">Failed</p><p className="mt-1 font-bold text-rose-700">{bulkUploadSummary.failedCount}</p></div>
                  </div>
                  {bulkUploadSummary.failedRows?.length ? <div className="mt-3 rounded-xl bg-white p-3 border border-green-100"><ul className="space-y-1 text-xs font-medium text-slate-600">{bulkUploadSummary.failedRows.map((r) => <li key={r}>{r}</li>)}</ul></div> : null}
                </div>
              )}
            </div>
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              <button onClick={() => setIsBulkUploadOpen(false)} className="w-full py-3 rounded-2xl border border-slate-200 bg-white text-sm font-pmedium text-slate-600 hover:bg-slate-50 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center z-150 p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-8 bg-blue-50 border-b border-blue-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-2xl font-black text-blue-900 leading-none flex items-center gap-2"><Box size={24} /> Add Asset</h2>
                <p className="text-[10px] font-pmedium text-blue-600 uppercase tracking-widest mt-2">Create a new department asset record</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 shadow-sm hover:scale-110"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAsset} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Asset Name</label>
                <input type="text" required value={assetForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, name: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" placeholder="e.g. Office Laptop" />
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-[10px] font-pmedium text-[#2563EB] uppercase tracking-widest">Department Locked</p><p className="text-sm font-semibold text-[#2563EB] mt-1">{deptLabel} will own this asset entry.</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Category</label>
                  <div className="relative">
                    <select className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none appearance-none cursor-pointer" value={assetForm.category} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm({ ...assetForm, category: e.target.value })}>
                      {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Status</label>
                  <div className="relative">
                    <select className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none appearance-none cursor-pointer" value={assetForm.status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm({ ...assetForm, status: e.target.value })}>
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Decommissioned">Decommissioned</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Serial Number</label>
                  <input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" value={assetForm.serialNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, serialNumber: e.target.value })} placeholder="IT asset tag or serial number" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Brand / Model</label>
                  <input type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" value={assetForm.brandModel} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, brandModel: e.target.value })} placeholder="e.g. Dell Latitude 5440" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Purchase Date</label>
                  <input type="date" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" value={assetForm.purchaseDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Quantity</label>
                  <input type="number" min={1} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" value={assetForm.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => { const v = e.target.value; if (v === '' || /^\d+$/.test(v)) setAssetForm({ ...assetForm, quantity: v }); }} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Ownership Type</label>
                  <div className="relative">
                    <select className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none appearance-none cursor-pointer" value={assetForm.ownershipType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm({ ...assetForm, ownershipType: e.target.value, rentDurationMonths: e.target.value === 'Rented' ? assetForm.rentDurationMonths : '' })}>
                      <option value="Owned">Owned</option>
                      <option value="Rented">Rented</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
                {assetForm.ownershipType === 'Rented' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Rent Duration (Months)</label>
                    <input type="number" min={1} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" value={assetForm.rentDurationMonths} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, rentDurationMonths: e.target.value })} placeholder="e.g. 12" required />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Floor</label>
                  <div className="relative">
                    <select className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none appearance-none cursor-pointer" value={assetForm.floor} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm({ ...assetForm, floor: e.target.value })}>
                      <option value="">Select floor</option>
                      {FLOOR_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Wing</label>
                  <div className="relative">
                    <select className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none appearance-none cursor-pointer" value={assetForm.wing} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm({ ...assetForm, wing: e.target.value })}>
                      <option value="">Select wing</option>
                      {WING_OPTIONS.map((w) => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Location Preview</label>
                  <div className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-700">{getLocationLabel(assetForm.floor, assetForm.wing) || 'Select floor and wing'}</div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Value</label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={assetForm.value} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm({ ...assetForm, value: e.target.value.replace(/\D+/g, '') })} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold text-gray-900 focus:border-[#2563EB] outline-none" placeholder="e.g. 45000" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-[10px] font-pmedium text-gray-400 uppercase tracking-widest">Notes</label>
                  <textarea rows={3} value={assetForm.notes} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAssetForm({ ...assetForm, notes: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl font-medium text-gray-700 focus:border-[#2563EB] outline-none resize-none" placeholder="Optional notes for handover, warranty, condition, or storage" />
                </div>
              </div>
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-500 hover:text-gray-900 transition-all">CANCEL</button>
                <button type="submit" disabled={!assetForm.name || isSaving} className="flex-1 py-4 bg-[#2563EB] text-white rounded-2xl font-pmedium shadow-lg shadow-blue-200 disabled:bg-gray-300 disabled:shadow-none hover:bg-blue-700 transition-all">{isSaving ? 'SAVING...' : 'CREATE ASSET'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentAssetsPage;
