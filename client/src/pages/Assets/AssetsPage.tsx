import { useState, useMemo, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import * as XLSX from 'xlsx';
import { getStoredUser } from '@/lib/auth-session';
import { useLocation } from 'react-router-dom';
import { createTicket } from '@/services/tickets';
import { AssetRequestsPanel } from './AssetRequestsPanel';
import { getOrganizationOverview } from '@/services/organization';
import { axiosPrivate } from '@/utils/axios';
import { getResources } from '@/services/resources';
import { createAsset, createAssetCategory, createAssetSubCategory, getAssets, getAssetSummary, updateAsset, transferAsset, releaseAssetAllocation, getDepartments } from '@/services/assets';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import {
  Search, ChevronDown, X, Eye, ShieldCheck,
  CheckCircle2, Wrench, Box, ArrowRightLeft, MapPin, Building2,
  Filter, Plus, Monitor, Server, Cloud, Briefcase, User, Package, Pencil, AlertTriangle, Loader2, ImageIcon, FileText,
  UploadCloud,
} from 'lucide-react';
import BulkUploadModal from '@/components/BulkUploadModal';
import PageFrame from '../../components/Pages/PageFrame';
import { statusPillClass } from '../../lib/status-pill';
import { exportRowsAsCsv, exportRowsAsPdf, rowsToReportRows, type ExportColumn } from '@/utils/exportTable';
import { downloadReportFile } from '@/utils/report-download';
import { createReport } from '@/services/reports';
import { toast } from 'sonner';
import ExportReportModal, { type ExportParams } from '@/components/ExportReportModal';
import ReportExportButton from '@/components/ReportExportButton';

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

interface AssetAllocation {
  id: string;
  departmentId?: string | null;
  department?: string;
  userId?: string | null;
  user?: string;
  quantity: number;
  note?: string;
  assignedAt?: string;
}
interface AssetUnit {
  unitCode: string;
  serialNumber?: string;
}

interface Asset {
  recordId?: string;
  _id?: string;
  id?: string;
  assetCode?: string;
  name: string;
  category?: string;
  categoryId?: { _id: string; categoryName: string; requiresSerialNumber?: boolean } | string | null;
  subCategoryId?: { _id: string; subCategoryName: string } | string | null;
  vendorId?: { _id: string; name: string } | string | null;
  units?: AssetUnit[];
  status: string;
  department?: string;
  departmentId?: string | null;
  assignedTo?: string;
  assignedToUserId?: string | null;
  assignedToDepartment?: string;
  assignedToDepartmentId?: string | null;
  location?: string;
  serialNumber?: string;
  brandModel?: string;
  purchaseDate?: string;
  quantity: number;
  ownershipType?: string;
  rentDurationMonths?: number | null;
  expiryDate?: string;
  warrantyExpiry?: string;
  warrantyMonths?: number | null;
  assetImage?: { url?: string; id?: string } | string | null;
  warrantyDocument?: { url?: string; id?: string } | string | null;
  unitPrice?: string;
  value?: string;
  notes?: string;
  transferReason?: string;
  updatedAt?: string;
  allocations: AssetAllocation[];
  allocatedQuantity: number;
  availableQuantity: number;
}

interface AssetForm {
  name: string;
  category: string;
  categoryId: string;
  subCategoryId: string;
  vendorId: string;
  serialNumber: string;
  brandModel: string;
  purchaseDate: string;
  quantity: string;
  ownershipType: string;
  rentDurationMonths: string;
  warrantyMonths: string;
  assetImage: File | null;
  warrantyDocument: File | null;
  department: string;
  status: string;
  assignedToType: string;
  assignedTo: string;
  assignedToUserId: string;
  location: string;
  floor: string;
  wing: string;
  unitPrice: string;
  notes: string;
}

interface AssetCategoryOption {
  _id: string;
  categoryName: string;
  requiresSerialNumber?: boolean;
  department?: { _id: string; name: string } | null;
}

interface AssetSubCategoryOption {
  _id: string;
  subCategoryName: string;
  category?: { _id: string; categoryName: string } | null;
  department?: { _id: string; name: string } | null;
}

interface VendorOption {
  _id: string;
  name: string;
}

interface TransferForm {
  department: string;
  assignedToType: string;
  assignedTo: string;
  assignedToUserId: string;
  transferReason: string;
  quantity: string;
}

const DEFAULT_OWNED_EXPIRY_MONTHS = 12;
const ADD_NEW_OPTION = '__add_new__';
const ASSETS_PAGE_SIZE = 25;

function getLocationLabel(floor: string, wing: string): string {
  const parts = [floor, wing].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '';
}

function getLocationParts(location?: string): { floor: string; wing: string } {
  const parts = String(location || '').split(',').map((part) => part.trim()).filter(Boolean);
  return {
    floor: parts[0] || '',
    wing: parts[1] || '',
  };
}

function normalizeDepartmentName(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function dateInputValue(value?: string): string {
  if (!value) return '';
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || '';
}

function displayDate(value?: string): string {
  const normalized = dateInputValue(value);
  if (!normalized) return '--';
  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
}

function getRoleBand(role: string): string {
  const r = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (r === 'founder' || r === 'owner') return 'owner';
  if (r === 'super_admin' || r === 'superadmin') return 'super_admin';
  if (r === 'admin' || r === 'admin_manager') return 'admin';
  if (r === 'manager') return 'manager';
  return 'employee';
}

function departmentNameOf(value: any): string {
  if (!value) return '';
  return String(typeof value === 'string' ? value : value?.name || '');
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
    .map((d) => departmentNameOf(d).trim())
    .filter(Boolean)
    .filter((d) => {
      const key = normalizeDepartmentName(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function parseISODate(value: string): Date | null {
  const raw = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== monthIndex || date.getUTCDate() !== day) return null;
  return date;
}

function formatISODate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addMonthsUTC(date: Date, monthsToAdd: number): Date | null {
  const months = Number(monthsToAdd);
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || !Number.isFinite(months)) return null;
  const startYear = date.getUTCFullYear();
  const startMonth = date.getUTCMonth();
  const startDay = date.getUTCDate();
  const targetMonthIndex = startMonth + months;
  const targetYear = startYear + Math.floor(targetMonthIndex / 12);
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(startDay, lastDayOfTargetMonth);
  return new Date(Date.UTC(targetYear, targetMonth, clampedDay));
}

function calculateExpiryPreview(purchaseDate: string, ownershipType: string, rentDurationMonths: string): string {
  const parsed = parseISODate(purchaseDate);
  if (!parsed || String(ownershipType || 'Owned').trim() !== 'Rented') return '';
  const monthsToAdd = Number(rentDurationMonths);
  if (!Number.isFinite(monthsToAdd) || monthsToAdd <= 0) return '';
  const computed = addMonthsUTC(parsed, monthsToAdd);
  return computed ? formatISODate(computed) : '';
}

function calculateWarrantyExpiryPreview(purchaseDate: string, warrantyMonths: string): string {
  const parsed = parseISODate(purchaseDate);
  const monthsToAdd = Number(warrantyMonths);
  if (!parsed || !Number.isFinite(monthsToAdd) || monthsToAdd <= 0) return '';
  const computed = addMonthsUTC(parsed, monthsToAdd);
  return computed ? formatISODate(computed) : '';
}

function getAssetFileUrl(file?: { url?: string; id?: string } | string | null): string {
  if (!file) return '';
  return typeof file === 'string' ? file : file.url || '';
}

// ---------------------------------------------------------------------------
// Bulk Upload – template & row helpers
// ---------------------------------------------------------------------------
const ASSET_BULK_SHEET_NAME = 'Assets';
const ASSET_BULK_HEADERS = [
  'Asset Name', 'Department', 'Category', 'Sub Category', 'Vendor', 'Brand / Model',
  'Serial Number', 'Purchase Date', 'Quantity', 'Price per Unit', 'Ownership Type',
  'Rent Duration (Months)', 'Warranty (Months)', 'Status', 'Location', 'Notes',
];

function buildAssetBulkTemplateWorkbook() {
  const workbook = XLSX.utils.book_new();
  const uploadSheet = XLSX.utils.aoa_to_sheet([
    ASSET_BULK_HEADERS,
    ['MacBook Pro M3', 'IT', 'Laptops', 'BIZNest Laptop', 'Dell India', 'MacBook Pro 14"', '', '2026-01-15', 5, 120000, 'Owned', '', 12, 'Active', 'Floor 3, Wing A', 'Bulk purchase for new hires'],
  ]);
  XLSX.utils.book_append_sheet(workbook, uploadSheet, ASSET_BULK_SHEET_NAME);

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['Field', 'Notes'],
    ['Asset Name', 'Required.'],
    ['Department', 'Must match an existing department you have access to. Required.'],
    ['Category', 'Existing category name for the department, or a new name to auto-create it. Required.'],
    ['Sub Category', 'Existing sub category under the category, or a new name to auto-create it. Required.'],
    ['Vendor', 'Optional. Free text.'],
    ['Brand / Model', 'Optional.'],
    ['Serial Number', 'Optional. Only used when Quantity is 1 — add serial numbers for multi-unit batches individually after import.'],
    ['Purchase Date', 'Optional. Format YYYY-MM-DD.'],
    ['Quantity', 'Number of identical units to create in this row. Defaults to 1. Each unit gets its own unique Asset ID.'],
    ['Price per Unit', 'Numeric price for a single unit. Total Price is calculated automatically as Price per Unit x Quantity.'],
    ['Ownership Type', '"Owned" or "Rented". Defaults to Owned.'],
    ['Rent Duration (Months)', 'Required only when Ownership Type is Rented.'],
    ['Warranty (Months)', 'Optional.'],
    ['Status', '"Active", "Inactive", "Disposed" or "Repair". Defaults to Active.'],
    ['Location', 'Optional free text, e.g. "Floor 3, Wing A".'],
    ['Notes', 'Optional.'],
  ]);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  return workbook;
}

function readBulkAssetCell(row: Record<string, any>, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim();
    }
  }
  return '';
}

function normalizeBulkAssetDate(raw: any): string {
  if (!raw) return '';
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, '0')}-${String(raw.getDate()).padStart(2, '0')}`;
  }
  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }
  return '';
}

function normalizeAsset(a: any): Asset {
  return {
    ...a,
    notes: a.notes || '',
    recordId: a.recordId || a._id || a.id,
    id: a.id || a.assetCode || a._id,
    transferReason: a.transferReason || '',
    assignedTo: a.assignedTo || 'Unassigned',
    assignedToUserId: a.assignedToUserId || null,
    serialNumber: a.serialNumber || '',
    brandModel: a.brandModel || '',
    purchaseDate: a.purchaseDate || '',
    quantity: typeof a.quantity === 'number' ? a.quantity : Number(a.quantity) || 1,
    allocations: Array.isArray(a.allocations) ? a.allocations.map((allocation: any) => ({
      ...allocation,
      id: String(allocation.id || allocation._id || ''),
      quantity: Number(allocation.quantity) || 0,
    })) : [],
    allocatedQuantity: Number(a.allocatedQuantity) || 0,
    availableQuantity: Number.isFinite(Number(a.availableQuantity)) ? Number(a.availableQuantity) : (Number(a.quantity) || 1),
    ownershipType: a.ownershipType || 'Owned',
    rentDurationMonths: typeof a.rentDurationMonths === 'number' ? a.rentDurationMonths : a.rentDurationMonths ? Number(a.rentDurationMonths) || null : null,
    warrantyMonths: typeof a.warrantyMonths === 'number' ? a.warrantyMonths : a.warrantyMonths ? Number(a.warrantyMonths) || null : null,
    expiryDate: a.expiryDate || '',
    warrantyExpiry: a.warrantyExpiry || '',
    location: a.location || 'Unassigned',
    unitPrice: a.unitPrice || '-',
    value: a.value || '-',
  };
}

const INITIAL_ASSET_FORM: AssetForm = {
  name: '',
  category: 'Hardware',
  categoryId: '',
  subCategoryId: '',
  vendorId: '',
  serialNumber: '',
  brandModel: '',
  purchaseDate: '',
  quantity: '1',
  ownershipType: 'Owned',
  rentDurationMonths: '',
  warrantyMonths: '',
  assetImage: null,
  warrantyDocument: null,
  department: '',
  status: 'Active',
  assignedToType: 'department',
  assignedTo: '',
  assignedToUserId: '',
  location: '',
  floor: '',
  wing: '',
  unitPrice: '',
  notes: '',
};

export function AssetsPage() {
  const location = useLocation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<'assets' | 'requests'>('assets');
  const [showExportModal, setShowExportModal] = useState(false);
  const storedUser = getStoredUser();
  const rawUserName: string = storedUser?.fullName || 'Founder';
  const isOwnerProfile = (storedUser?.role || 'owner') === 'owner';
  const normalizedRole = String(storedUser?.workspaceMembership?.role || storedUser?.role || '').trim().toLowerCase();
  const roleBand = getRoleBand(normalizedRole);
  const isFounderScope = roleBand === 'owner' || roleBand === 'super_admin';
  const isDeptScope = roleBand === 'admin' || roleBand === 'manager';
  const canManageAssets = roleBand !== 'employee';
  const canAddAssets = isFounderScope || isDeptScope;
  const workspacePreferences = useWorkspacePreferences();
  const formatCurrency = (val: any) => formatWorkspaceCurrency(val, workspacePreferences.currency, { maximumFractionDigits: 2 });
  const currentUserId = String(storedUser?._id || storedUser?.id || '');
  const displayUserName = isOwnerProfile ? `${rawUserName} (Founder)` : rawUserName;

  const [orgData, setOrgData] = useState<Record<string, string[]>>({});
  const [memberDirectory, setMemberDirectory] = useState<Member[]>([]);
  // workspaceMembership.departments isn't always populated on the session object
  // (depends on which auth flow hydrated it), so cross-check against this user's
  // own entry in the org directory — the same roster already used to list
  // department employees elsewhere in this page — as a resilient fallback.
  const assignedDepartments = useMemo(() => {
    const fromSession = getAssignedDepartments(storedUser);
    const selfMember = memberDirectory.find((m) => String(m.userId || m.id || '') === currentUserId);
    const fromDirectory = Array.isArray(selfMember?.departments) ? selfMember.departments : [];
    const seen = new Set<string>();
    return [...fromSession, ...fromDirectory].filter((d) => {
      const key = normalizeDepartmentName(d);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [storedUser, memberDirectory, currentUserId]);
  const assignedDepartmentKeys = useMemo(
    () => new Set(assignedDepartments.map((d) => normalizeDepartmentName(d))),
    [assignedDepartments],
  );
  const pageTitle = isFounderScope
    ? 'Overall Assets'
    : roleBand === 'admin'
      ? 'Assigned Dept Assets'
      : assignedDepartments[0]
        ? `${assignedDepartments[0]} Assets`
        : 'Assets';
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [departmentRecords, setDepartmentRecords] = useState<Array<{ id: string; name: string }>>([]);
  const departmentOptions = useMemo(() => departmentRecords.map((department) => department.name), [departmentRecords]);
  const managedDepartmentKeys = useMemo(() => {
    const keys = new Set(assignedDepartmentKeys);
    departmentRecords.forEach((department) => {
      if (assignedDepartmentKeys.has(normalizeDepartmentName(department.id)) || assignedDepartmentKeys.has(normalizeDepartmentName(department.name))) {
        keys.add(normalizeDepartmentName(department.id));
        keys.add(normalizeDepartmentName(department.name));
      }
    });
    return keys;
  }, [assignedDepartmentKeys, departmentRecords]);
  const [resourceFloors, setResourceFloors] = useState<string[]>([]);
  const [resourceWings, setResourceWings] = useState<string[]>([]);
  const [floorMode, setFloorMode] = useState<'select' | 'custom'>('select');
  const [wingMode, setWingMode] = useState<'select' | 'custom'>('select');

  const [assetCategories, setAssetCategories] = useState<AssetCategoryOption[]>([]);
  const [assetSubCategories, setAssetSubCategories] = useState<AssetSubCategoryOption[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [serialNumbers, setSerialNumbers] = useState<string[]>(['']);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: '', phone: '', email: '' });
  const [isSavingVendor, setIsSavingVendor] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', requiresSerialNumber: false });
  const [subCategoryForm, setSubCategoryForm] = useState({ name: '' });
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [bulkAssetModal, setBulkAssetModal] = useState(false);
  const [bulkAssetFileName, setBulkAssetFileName] = useState('');
  const [bulkAssetRows, setBulkAssetRows] = useState<Record<string, any>[]>([]);
  const [bulkAssetImporting, setBulkAssetImporting] = useState(false);
  const [bulkAssetSummary, setBulkAssetSummary] = useState<{ created: number; skipped: number; issues: string[] } | null>(null);
  const [bulkAssetError, setBulkAssetError] = useState('');
  const bulkAssetFileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsPagination, setAssetsPagination] = useState({ page: 1, limit: ASSETS_PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoadingMoreAssets, setIsLoadingMoreAssets] = useState(false);
  const assetsLoadMoreSentinelRef = useRef<HTMLTableCellElement | null>(null);
  const assetsLoadMoreSentinelMobileRef = useRef<HTMLDivElement | null>(null);
  const [assetSummary, setAssetSummary] = useState<{ totalQuantity: number; totalAllocatedQuantity: number } | null>(null);
  const [issueAsset, setIssueAsset] = useState<Asset | null>(null);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'Medium' });
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadDepartments() {
      try {
        const data = await getDepartments();
        const depts = (Array.isArray(data) ? data : data?.departments || data?.data || [])
          .map((department: any) => ({
            id: String(department?.id || department?._id || ''),
            name: String(department?.name || department || '').trim(),
          }))
          .filter((department: { id: string; name: string }) => department.id && department.name && department.name !== 'Sales & CRM');
        if (mounted) setDepartmentRecords(depts);
      } catch {
        // non-critical
      }
    }
    loadDepartments();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadFloorsAndWings() {
      try {
        const response = await getResources();
        const resources = response?.data?.data?.resources || response?.data?.resources || [];
        if (!mounted) return;
        const floors = Array.from(new Set(resources.map((r: any) => String(r.floor || '').trim()).filter(Boolean))) as string[];
        const wings = Array.from(new Set(resources.map((r: any) => String(r.wing || '').trim().toUpperCase()).filter(Boolean))) as string[];
        setResourceFloors(floors);
        setResourceWings(wings.sort());
      } catch {
        // non-critical: floor/wing become free-text if resources can't be loaded
      }
    }
    loadFloorsAndWings();
    return () => { mounted = false; };
  }, []);

  const loadAssetTaxonomy = async () => {
    try {
      const [categoryResponse, subCategoryResponse, vendorResponse] = await Promise.all([
        axiosPrivate.get('/api/assets/get-category'),
        axiosPrivate.get('/api/assets/get-subcategory'),
        axiosPrivate.get('/api/finance/vendors'),
      ]);
      setAssetCategories(Array.isArray(categoryResponse.data) ? categoryResponse.data : []);
      setAssetSubCategories(Array.isArray(subCategoryResponse.data) ? subCategoryResponse.data : []);
      setVendors(vendorResponse?.data?.data?.vendors || []);
    } catch {
      // non-critical: category/vendor pickers stay empty if this fails
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadAssetTaxonomy();
    })();
    return () => { mounted = false; };
  }, []);

  const availableDepartments = useMemo(() => {
    const filterDepts = (departments: string[]) => {
      if (!isDeptScope || managedDepartmentKeys.size === 0) return departments;
      return departments.filter((d) => managedDepartmentKeys.has(normalizeDepartmentName(d)));
    };
    return filterDepts(departmentOptions);
  }, [departmentOptions, isDeptScope, managedDepartmentKeys]);

  const defaultDepartment = useMemo(() => availableDepartments.find(Boolean) || '', [availableDepartments]);

  // Backend already scopes visibility by role; this is a client-side safety net so an
  // owning-dept asset assigned to another dept (or to me personally) still shows.
  const scopedAssets = useMemo(() => {
    if (isFounderScope || managedDepartmentKeys.size === 0) return assets;
    return assets.filter((a) =>
      managedDepartmentKeys.has(normalizeDepartmentName(a.department || '')) ||
      a.allocations.some((allocation) => managedDepartmentKeys.has(normalizeDepartmentName(allocation.department || ''))) ||
      (currentUserId && (String(a.assignedToUserId || '') === currentUserId || a.allocations.some((allocation) => String(allocation.userId || '') === currentUserId)))
    );
  }, [assets, isFounderScope, managedDepartmentKeys, currentUserId]);

  useEffect(() => {
    let mounted = true;
    async function loadMembers() {
      try {
        const response = await getOrganizationOverview(axiosPrivate);
        const rawTeamMembers = response?.data?.data?.teamMembers || response?.data?.teamMembers || [];
        const members: Member[] = rawTeamMembers.map((m: any) => ({
          userId: m.userId || m.id,
          id: m.id,
          fullName: m.name || m.fullName || '',
          role: m.role || '',
          departments: Array.isArray(m.departmentNames) ? m.departmentNames : (Array.isArray(m.departments) ? m.departments : []),
        }));
        if (!mounted) return;
        setMemberDirectory(members);
        const grouped = members.reduce<Record<string, string[]>>((acc, member) => {
          const departments = Array.isArray(member.departments) ? member.departments : [];
          departments.forEach((dept) => {
            if (!dept) return;
            if (!acc[dept]) acc[dept] = [];
            const label = `${member.fullName} (${(member.role || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())})`;
            if (!acc[dept].includes(label)) acc[dept].push(label);
          });
          return acc;
        }, {});
        setOrgData(grouped);
      } catch {
        // keep page usable
      } finally {
        if (mounted) { setIsLoadingMembers(false); setIsInitialLoading(false); }
      }
    }
    loadMembers();
    return () => { mounted = false; };
  }, []);

  async function loadAssetsPage(page: number, { replace }: { replace: boolean }) {
    if (replace) setIsLoadingAssets(true); else setIsLoadingMoreAssets(true);
    try {
      const response = await getAssets({ page, limit: ASSETS_PAGE_SIZE });
      const rawAssets = (response?.data?.assets || response?.assets || []) as any[];
      const pagination = response?.data?.pagination || response?.pagination || null;
      const normalized = rawAssets.map(normalizeAsset);
      setAssets((prev) => {
        if (replace) return normalized;
        const existingIds = new Set(prev.map((a) => a.recordId));
        return [...prev, ...normalized.filter((a) => !existingIds.has(a.recordId))];
      });
      if (pagination) {
        setAssetsPagination({
          page: Number(pagination.page) || page,
          limit: Number(pagination.limit) || ASSETS_PAGE_SIZE,
          total: Number(pagination.total) || 0,
          totalPages: Number(pagination.totalPages) || 1,
        });
      }
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Unable to load assets right now.');
    } finally {
      if (replace) { setIsLoadingAssets(false); setIsInitialLoading(false); } else { setIsLoadingMoreAssets(false); }
    }
  }

  function handleLoadMoreAssets() {
    if (isLoadingMoreAssets || assetsPagination.page >= assetsPagination.totalPages) return;
    loadAssetsPage(assetsPagination.page + 1, { replace: false });
  }

  useEffect(() => {
    loadAssetsPage(1, { replace: true });
  }, [location.key]);

  // Infinite scroll: observe a sentinel row/card at the bottom of the currently visible
  // (desktop table or mobile card) list and load the next page once it scrolls into view.
  useEffect(() => {
    if (assetsPagination.page >= assetsPagination.totalPages) return undefined;
    const nodes = [assetsLoadMoreSentinelRef.current, assetsLoadMoreSentinelMobileRef.current].filter(Boolean) as Element[];
    if (nodes.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isLoadingMoreAssets) {
          handleLoadMoreAssets();
        }
      },
      { rootMargin: '300px' },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [assetsPagination.page, assetsPagination.totalPages, isLoadingMoreAssets]);

  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  async function refreshAssetSummary() {
    try {
      const targetDeptId = selectedDeptFilter === 'All'
        ? undefined
        : departmentRecords.find((d) => normalizeDepartmentName(d.name) === normalizeDepartmentName(selectedDeptFilter))?.id;
      const response = await getAssetSummary(targetDeptId ? { departmentId: targetDeptId } : undefined);
      const summary = response?.data || response;
      if (summary) {
        setAssetSummary({
          totalQuantity: Number(summary.totalQuantity) || 0,
          totalAllocatedQuantity: Number(summary.totalAllocatedQuantity) || 0,
        });
      }
    } catch {
      // non-critical: stat cards fall back to whatever's currently loaded
    }
  }

  useEffect(() => {
    refreshAssetSummary();
  }, [selectedDeptFilter, departmentRecords]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [activeAssetForTransfer, setActiveAssetForTransfer] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>({ ...INITIAL_ASSET_FORM, department: defaultDepartment, assignedTo: defaultDepartment });
  const [transferForm, setTransferForm] = useState<TransferForm>({ department: '', assignedToType: 'department', assignedTo: '', assignedToUserId: '', transferReason: '', quantity: '1' });

  useEffect(() => {
    if (!assetForm.department && defaultDepartment) {
      setAssetForm((prev) => ({ ...prev, department: defaultDepartment, assignedTo: prev.assignedToType === 'department' ? defaultDepartment : prev.assignedTo }));
    }
  }, [assetForm.department, defaultDepartment]);

  const employeeOptions = useMemo<EmployeeOption[]>(
    () => memberDirectory
      .filter((m) => !['owner', 'super_admin'].includes(getRoleBand(m.role || '')))
      .map((m) => ({ value: m.userId || m.id || '', label: m.fullName || '', departments: Array.isArray(m.departments) ? m.departments : [] }))
      .filter((m) => m.value && m.label),
    [memberDirectory],
  );

  const assetDepartmentEmployees = useMemo(
    () => employeeOptions.filter((m) => m.departments.includes(assetForm.department)),
    [assetForm.department, employeeOptions],
  );

  const transferDepartmentEmployees = useMemo(
    () => employeeOptions.filter((m) => m.departments.some((department) => normalizeDepartmentName(department) === normalizeDepartmentName(transferForm.department))),
    [transferForm.department, employeeOptions],
  );

  const expiryPreview = useMemo(
    () => calculateExpiryPreview(assetForm.purchaseDate, assetForm.ownershipType, assetForm.rentDurationMonths),
    [assetForm.purchaseDate, assetForm.ownershipType, assetForm.rentDurationMonths],
  );

  const warrantyExpiryPreview = useMemo(
    () => calculateWarrantyExpiryPreview(assetForm.purchaseDate, assetForm.warrantyMonths),
    [assetForm.purchaseDate, assetForm.warrantyMonths],
  );

  const totalPricePreview = useMemo(() => {
    const unitPriceNum = Number(String(assetForm.unitPrice || '').replace(/[^0-9.-]/g, '')) || 0;
    const qty = Math.max(1, parseInt(String(assetForm.quantity || '').trim(), 10) || 1);
    return unitPriceNum * qty;
  }, [assetForm.unitPrice, assetForm.quantity]);

  const selectedDepartmentRecord = useMemo(
    () => departmentRecords.find((department) => normalizeDepartmentName(department.name) === normalizeDepartmentName(assetForm.department)) || null,
    [assetForm.department, departmentRecords],
  );

  const availableAssetCategories = useMemo(() => {
    if (!assetForm.department) return isFounderScope ? assetCategories : [];
    return assetCategories.filter((category) => {
      const departmentName = category.department?.name || '';
      const departmentId = category.department?._id || '';
      return normalizeDepartmentName(departmentName) === normalizeDepartmentName(assetForm.department) ||
        (selectedDepartmentRecord?.id && String(departmentId) === selectedDepartmentRecord.id);
    });
  }, [assetCategories, assetForm.department, isFounderScope, selectedDepartmentRecord]);

  const selectedCategoryObj = useMemo(
    () => availableAssetCategories.find((c) => c._id === assetForm.categoryId) || null,
    [availableAssetCategories, assetForm.categoryId],
  );
  const requiresSerialNumber = !!selectedCategoryObj?.requiresSerialNumber;
  const filteredSubCategories = useMemo(
    () => (assetForm.categoryId ? assetSubCategories.filter((s) => s.category?._id === assetForm.categoryId) : []),
    [assetSubCategories, assetForm.categoryId],
  );

  useEffect(() => {
    const qty = Math.max(1, parseInt(String(assetForm.quantity || '').trim(), 10) || 1);
    setSerialNumbers((prev) => Array.from({ length: qty }, (_, i) => prev[i] || ''));
  }, [assetForm.quantity]);

  function openAddAsset() {
    setEditingAsset(null);
    setAssetForm({ ...INITIAL_ASSET_FORM, department: defaultDepartment, assignedTo: defaultDepartment });
    setSerialNumbers(['']);
    setFloorMode('select');
    setWingMode('select');
    setIsAddModalOpen(true);
  }

  function openEditAsset(asset: Asset) {
    const { floor, wing } = getLocationParts(asset.location);
    setEditingAsset(asset);
    const categoryIdValue = typeof asset.categoryId === 'object' && asset.categoryId ? asset.categoryId._id : (asset.categoryId as string) || '';
    const subCategoryIdValue = typeof asset.subCategoryId === 'object' && asset.subCategoryId ? asset.subCategoryId._id : (asset.subCategoryId as string) || '';
    const vendorIdValue = typeof asset.vendorId === 'object' && asset.vendorId ? asset.vendorId._id : (asset.vendorId as string) || '';
    setSerialNumbers(
      Array.isArray(asset.units) && asset.units.length > 0
        ? asset.units.map((u) => u.serialNumber || '')
        : [asset.serialNumber || ''],
    );
    setAssetForm({
      name: asset.name || '',
      category: asset.category || 'Hardware',
      categoryId: categoryIdValue,
      subCategoryId: subCategoryIdValue,
      vendorId: vendorIdValue,
      serialNumber: asset.serialNumber || '',
      brandModel: asset.brandModel || '',
      purchaseDate: dateInputValue(asset.purchaseDate),
      quantity: String(asset.quantity || 1),
      ownershipType: asset.ownershipType || 'Owned',
      rentDurationMonths: asset.rentDurationMonths ? String(asset.rentDurationMonths) : '',
      warrantyMonths: asset.warrantyMonths ? String(asset.warrantyMonths) : '',
      assetImage: null,
      warrantyDocument: null,
      department: asset.department || defaultDepartment,
      status: asset.status || 'Active',
      assignedToType: asset.assignedToUserId ? 'employee' : 'department',
      assignedTo: asset.assignedTo || asset.department || '',
      assignedToUserId: asset.assignedToUserId || '',
      location: asset.location || '',
      floor,
      wing,
      unitPrice: asset.unitPrice === '-' ? '' : asset.unitPrice || '',
      notes: asset.notes || '',
    });
    setFloorMode(floor && !resourceFloors.includes(floor) ? 'custom' : 'select');
    setWingMode(wing && !resourceWings.includes(wing) ? 'custom' : 'select');
    setViewingAsset(null);
    setIsAddModalOpen(true);
  }

  function closeAssetForm() {
    if (isSaving) return;
    setIsAddModalOpen(false);
    setEditingAsset(null);
    setAssetForm({ ...INITIAL_ASSET_FORM, department: defaultDepartment, assignedTo: defaultDepartment });
    setSerialNumbers(['']);
    setFloorMode('select');
    setWingMode('select');
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDepartmentRecord?.id || !categoryForm.name.trim()) return;
    setIsSavingCategory(true);
    setErrorMessage('');
    try {
      const response = await createAssetCategory({
        assetCategoryName: categoryForm.name.trim(),
        departmentId: selectedDepartmentRecord.id,
        requiresSerialNumber: categoryForm.requiresSerialNumber,
      });
      await loadAssetTaxonomy();
      const category = response?.data || response?.category || response;
      if (category?._id) setAssetForm((prev) => ({ ...prev, categoryId: category._id, subCategoryId: '' }));
      setCategoryForm({ name: '', requiresSerialNumber: false });
      setIsCategoryModalOpen(false);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error.message || 'Unable to create category.');
    } finally {
      setIsSavingCategory(false);
    }
  }

  async function handleCreateSubCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetForm.categoryId || !subCategoryForm.name.trim()) return;
    setIsSavingCategory(true);
    setErrorMessage('');
    try {
      const response = await createAssetSubCategory({
        assetCategoryId: assetForm.categoryId,
        assetSubCategoryName: subCategoryForm.name.trim(),
      });
      await loadAssetTaxonomy();
      const subCategory = response?.data || response?.subCategory || response;
      if (subCategory?._id) setAssetForm((prev) => ({ ...prev, subCategoryId: subCategory._id }));
      setSubCategoryForm({ name: '' });
      setIsSubCategoryModalOpen(false);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error.message || 'Unable to create sub category.');
    } finally {
      setIsSavingCategory(false);
    }
  }

  function openBulkAssetModal() {
    setBulkAssetModal(true);
    setBulkAssetFileName('');
    setBulkAssetRows([]);
    setBulkAssetSummary(null);
    setBulkAssetError('');
  }

  function closeBulkAssetModal() {
    if (bulkAssetImporting) return;
    setBulkAssetModal(false);
    setBulkAssetFileName('');
    setBulkAssetRows([]);
    setBulkAssetSummary(null);
    setBulkAssetError('');
  }

  function handleBulkAssetDownloadTemplate() {
    const workbook = buildAssetBulkTemplateWorkbook();
    XLSX.writeFile(workbook, 'asset-bulk-upload-template.xlsx');
  }

  function handleBulkAssetFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBulkAssetFileName(file.name);
    setBulkAssetSummary(null);
    setBulkAssetError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames.includes(ASSET_BULK_SHEET_NAME) ? ASSET_BULK_SHEET_NAME : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
        setBulkAssetRows(rows);
        if (rows.length === 0) setBulkAssetError('No rows found in the spreadsheet.');
      } catch {
        setBulkAssetError('Failed to parse spreadsheet. Please check the file format.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleBulkAssetImport() {
    if (bulkAssetRows.length === 0) return;
    setBulkAssetImporting(true);
    let created = 0;
    let skipped = 0;
    const issues: string[] = [];
    // Local working copies so a category/sub-category auto-created for an earlier row in
    // this same import is immediately visible to later rows, without waiting on React state.
    let workingCategories = [...assetCategories];
    let workingSubCategories = [...assetSubCategories];

    for (let i = 0; i < bulkAssetRows.length; i++) {
      const row = bulkAssetRows[i];
      const rowNum = i + 2;
      try {
        const name = readBulkAssetCell(row, 'Asset Name', 'name', 'Name');
        if (!name) { skipped++; issues.push(`Row ${rowNum}: Asset Name is required.`); continue; }

        const departmentName = readBulkAssetCell(row, 'Department', 'department');
        const deptRecord = departmentRecords.find((d) => normalizeDepartmentName(d.name) === normalizeDepartmentName(departmentName));
        if (!deptRecord) { skipped++; issues.push(`Row ${rowNum}: Department "${departmentName || '—'}" was not found.`); continue; }
        if (!isFounderScope && !managedDepartmentKeys.has(normalizeDepartmentName(deptRecord.name))) {
          skipped++; issues.push(`Row ${rowNum}: You do not have permission to add assets to "${deptRecord.name}".`); continue;
        }

        const categoryName = readBulkAssetCell(row, 'Category', 'category');
        if (!categoryName) { skipped++; issues.push(`Row ${rowNum}: Category is required.`); continue; }
        let categoryObj = workingCategories.find((c) =>
          c.categoryName.trim().toLowerCase() === categoryName.toLowerCase() &&
          normalizeDepartmentName(c.department?.name || '') === normalizeDepartmentName(deptRecord.name));
        if (!categoryObj) {
          const response = await createAssetCategory({ assetCategoryName: categoryName, departmentId: deptRecord.id, requiresSerialNumber: false });
          const createdCategory = response?.data || response?.category || response;
          if (!createdCategory?._id) throw new Error('Unable to create category.');
          categoryObj = { _id: createdCategory._id, categoryName, requiresSerialNumber: false, department: { _id: deptRecord.id, name: deptRecord.name } };
          workingCategories = [...workingCategories, categoryObj];
        }

        const subCategoryName = readBulkAssetCell(row, 'Sub Category', 'subCategory', 'Sub-Category');
        if (!subCategoryName) { skipped++; issues.push(`Row ${rowNum}: Sub Category is required.`); continue; }
        let subCategoryObj = workingSubCategories.find((s) =>
          s.category?._id === categoryObj!._id && s.subCategoryName.trim().toLowerCase() === subCategoryName.toLowerCase());
        if (!subCategoryObj) {
          const response = await createAssetSubCategory({ assetCategoryId: categoryObj._id, assetSubCategoryName: subCategoryName });
          const createdSub = response?.data || response?.subCategory || response;
          if (!createdSub?._id) throw new Error('Unable to create sub category.');
          subCategoryObj = { _id: createdSub._id, subCategoryName, category: { _id: categoryObj._id, categoryName: categoryObj.categoryName } };
          workingSubCategories = [...workingSubCategories, subCategoryObj];
        }

        const quantity = Math.max(1, parseInt(readBulkAssetCell(row, 'Quantity', 'quantity') || '1', 10) || 1);
        const unitPriceNum = Number(readBulkAssetCell(row, 'Price per Unit', 'unitPrice', 'Price').replace(/[^0-9.-]/g, '')) || 0;
        const ownershipRaw = readBulkAssetCell(row, 'Ownership Type', 'ownershipType');
        const ownershipType = ownershipRaw === 'Rented' ? 'Rented' : 'Owned';
        const statusRaw = readBulkAssetCell(row, 'Status', 'status');
        const status = ['Active', 'Inactive', 'Disposed', 'Repair'].includes(statusRaw) ? statusRaw : 'Active';
        const purchaseDate = normalizeBulkAssetDate(row['Purchase Date'] ?? row['purchaseDate']);
        const serialNumber = readBulkAssetCell(row, 'Serial Number', 'serialNumber');

        const payload = new FormData();
        payload.append('name', name);
        payload.append('categoryId', categoryObj._id);
        payload.append('subCategoryId', subCategoryObj._id);
        payload.append('departmentId', deptRecord.id);
        payload.append('department', deptRecord.name);
        payload.append('assignedTo', deptRecord.name);
        payload.append('quantity', String(quantity));
        payload.append('unitPrice', String(unitPriceNum));
        payload.append('ownershipType', ownershipType);
        payload.append('status', status);
        if (purchaseDate) payload.append('purchaseDate', purchaseDate);
        const vendorName = readBulkAssetCell(row, 'Vendor', 'vendor');
        if (vendorName) payload.append('vendor', vendorName);
        const brandModel = readBulkAssetCell(row, 'Brand / Model', 'brandModel', 'Brand/Model');
        if (brandModel) payload.append('brandModel', brandModel);
        if (serialNumber && quantity === 1) payload.append('serialNumber', serialNumber);
        const rentMonths = readBulkAssetCell(row, 'Rent Duration (Months)', 'rentDurationMonths');
        if (ownershipType === 'Rented' && rentMonths) payload.append('rentDurationMonths', rentMonths);
        const warrantyMonths = readBulkAssetCell(row, 'Warranty (Months)', 'warrantyMonths');
        if (warrantyMonths) payload.append('warrantyMonths', warrantyMonths);
        const location = readBulkAssetCell(row, 'Location', 'location');
        if (location) payload.append('location', location);
        const notes = readBulkAssetCell(row, 'Notes', 'notes');
        if (notes) payload.append('notes', notes);

        await createAsset(payload);
        created++;
      } catch (err: any) {
        skipped++;
        issues.push(`Row ${rowNum}: ${err?.response?.data?.message || err?.message || 'Failed to create asset.'}`);
      }
    }

    await loadAssetTaxonomy();
    if (created > 0) {
      await loadAssetsPage(1, { replace: true });
      refreshAssetSummary();
    }
    setBulkAssetImporting(false);
    setBulkAssetSummary({ created, skipped, issues });
  }

  async function handleSaveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSaving(true);
    try {
      const selectedEmployee = assetForm.assignedToType === 'employee'
        ? assetDepartmentEmployees.find((m) => m.value === assetForm.assignedToUserId)
        : null;
      if (!selectedDepartmentRecord?.id) throw new Error('Select a valid department before saving the asset.');
      const numericUnitPrice = assetForm.unitPrice ? Number(String(assetForm.unitPrice).replace(/[^0-9.-]/g, '')) : 0;
      const payload = new FormData();
      const appendPayload = (key: string, value: any) => {
        if (value === undefined || value === null || value === '') return;
        payload.append(key, value instanceof File ? value : String(value));
      };
      appendPayload('name', assetForm.name);
      appendPayload('serialNumber', serialNumbers[0] || assetForm.serialNumber);
      appendPayload('serialNumbers', JSON.stringify(serialNumbers));
      appendPayload('brandModel', assetForm.brandModel);
      appendPayload('categoryId', assetForm.categoryId);
      appendPayload('subCategoryId', assetForm.subCategoryId);
      appendPayload('vendorId', assetForm.vendorId);
      appendPayload('departmentId', selectedDepartmentRecord.id);
      appendPayload('department', assetForm.department);
      appendPayload('status', assetForm.status);
      appendPayload('assignedTo', assetForm.assignedToType === 'department' ? assetForm.department : selectedEmployee?.label || 'Unassigned');
      appendPayload('assignedToUserId', assetForm.assignedToType === 'employee' ? selectedEmployee?.value || null : null);
      appendPayload('purchaseDate', assetForm.purchaseDate);
      appendPayload('quantity', Math.max(1, parseInt(String(assetForm.quantity || '').trim(), 10) || 1));
      appendPayload('ownershipType', assetForm.ownershipType);
      appendPayload('rentDurationMonths', assetForm.ownershipType === 'Rented' ? assetForm.rentDurationMonths : null);
      appendPayload('warrantyMonths', assetForm.warrantyMonths);
      appendPayload('location', getLocationLabel(assetForm.floor, assetForm.wing) || assetForm.location);
      appendPayload('unitPrice', Number.isFinite(numericUnitPrice) ? numericUnitPrice : 0);
      appendPayload('expiryDate', expiryPreview || null);
      appendPayload('warrantyExpiry', warrantyExpiryPreview || null);
      appendPayload('notes', assetForm.notes);
      appendPayload('assetImage', assetForm.assetImage);
      appendPayload('warrantyDocument', assetForm.warrantyDocument);
      const response = editingAsset?.recordId
        ? await updateAsset(editingAsset.recordId, payload)
        : await createAsset(payload);
      const savedAsset = response?.data?.asset || response?.asset;
      if (savedAsset) {
        const normalized = normalizeAsset(savedAsset);
        setAssets((prev) => editingAsset
          ? prev.map((asset) => asset.recordId === editingAsset.recordId ? normalized : asset)
          : [normalized, ...prev]);
        refreshAssetSummary();
      }
      setAssetForm({ ...INITIAL_ASSET_FORM, department: defaultDepartment, assignedTo: defaultDepartment });
      setIsAddModalOpen(false);
      setEditingAsset(null);
    } catch (error: any) {
      setErrorMessage(error.message || `Unable to ${editingAsset ? 'update' : 'create'} asset right now.`);
    } finally {
      setIsSaving(false);
    }
  }

  function departmentAvailableQuantity(asset: Asset, department: string): number {
    if (normalizeDepartmentName(asset.department || '') === normalizeDepartmentName(department)) {
      return asset.availableQuantity;
    }
    return asset.allocations
      .filter((allocation) => !allocation.userId && normalizeDepartmentName(allocation.department || '') === normalizeDepartmentName(department))
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
  }

  // Employee assignment always draws from a specific department's pool. A department-to-department
  // transfer draws from the owning department's overall pool instead, for Founder/Super Admin always,
  // and for an Admin/Manager only when their own department is the one that owns the asset.
  function effectiveAvailableQuantity(asset: Asset, form: TransferForm): number {
    if (form.assignedToType === 'employee') return departmentAvailableQuantity(asset, form.department);
    return (isFounderScope || canActAsOwnerFor(asset)) ? asset.availableQuantity : departmentAvailableQuantity(asset, form.department);
  }

  function canManageAssignedAsset(asset: Asset): boolean {
    if (isFounderScope) return true;
    return managedDepartmentKeys.has(normalizeDepartmentName(asset.department || '')) ||
      asset.allocations.some((allocation) => managedDepartmentKeys.has(normalizeDepartmentName(allocation.department || '')));
  }

  // Founder/Super Admin can always transfer stock between departments. An Admin/Manager gets
  // that same right only for assets their own department actually owns — everyone else stays
  // limited to assigning already-held/allocated units to their own employees.
  function canActAsOwnerFor(asset: Asset): boolean {
    return isFounderScope || managedDepartmentKeys.has(normalizeDepartmentName(asset.department || ''));
  }

  function canTransferAsset(asset: Asset): boolean {
    if (isFounderScope) return asset.availableQuantity > 0;
    return assignedDepartments.some((department) => departmentAvailableQuantity(asset, department) > 0);
  }

  function transferDepartmentsFor(asset: Asset, assignedToType: string = transferForm.assignedToType): string[] {
    if (isFounderScope) return departmentOptions;
    if (assignedToType === 'department' && canActAsOwnerFor(asset)) {
      // Owning-department admin transferring stock: any other department in the workspace is a valid target.
      return departmentOptions.filter((department) => normalizeDepartmentName(department) !== normalizeDepartmentName(asset.department || ''));
    }
    return assignedDepartments.filter((department) => departmentAvailableQuantity(asset, department) > 0);
  }

  function canReleaseAllocation(allocation: AssetAllocation): boolean {
    return isFounderScope || managedDepartmentKeys.has(normalizeDepartmentName(allocation.department || ''));
  }

  function openTransferAsset(asset: Asset) {
    const canActAsOwner = canActAsOwnerFor(asset);
    const initialAssignedToType = canActAsOwner ? 'department' : 'employee';
    const availableDepartment = initialAssignedToType === 'department' ? '' : (transferDepartmentsFor(asset, initialAssignedToType)[0] || '');
    setActiveAssetForTransfer(asset);
    setTransferForm({
      department: availableDepartment,
      assignedToType: initialAssignedToType,
      assignedTo: '',
      assignedToUserId: '',
      transferReason: '',
      quantity: '1',
    });
    setShowTransferDialog(true);
    setViewingAsset(null);
  }

  async function handleTransferAsset() {
    if (!activeAssetForTransfer?.recordId || !transferForm.department) return;
    const targetDepartment = departmentRecords.find((department) => department.name === transferForm.department);
    if (!targetDepartment) {
      setErrorMessage('Select a valid target department.');
      return;
    }
    setErrorMessage('');
    setIsSaving(true);
    try {
      const response = await transferAsset(activeAssetForTransfer.recordId, {
        assignedToDepartmentId: targetDepartment.id,
        assignedToUserId: transferForm.assignedToType === 'employee' ? transferForm.assignedToUserId || null : null,
        quantity: Math.max(1, Number(transferForm.quantity) || 1),
        transferReason: transferForm.transferReason,
      });
      const updated = response?.data?.asset || response?.asset;
      if (updated) {
        const normalized = normalizeAsset(updated);
        setAssets((prev) => prev.map((asset) => asset.recordId === normalized.recordId ? normalized : asset));
        if (viewingAsset?.recordId === normalized.recordId) setViewingAsset(normalized);
        refreshAssetSummary();
      }
      setTransferForm({ department: '', assignedToType: 'department', assignedTo: '', assignedToUserId: '', transferReason: '', quantity: '1' });
      setShowTransferDialog(false);
      setActiveAssetForTransfer(null);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error.message || 'Unable to allocate asset quantity right now.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReleaseAllocation(allocation: AssetAllocation) {
    if (!viewingAsset?.recordId || !allocation.id) return;
    setErrorMessage('');
    setIsSaving(true);
    try {
      const response = await releaseAssetAllocation(viewingAsset.recordId, allocation.id, {
        quantity: allocation.quantity,
        reason: allocation.userId ? 'Employee assignment removed' : 'Returned to owning department',
      });
      const updated = response?.data?.asset || response?.asset;
      if (updated) {
        const normalized = normalizeAsset(updated);
        setAssets((prev) => prev.map((asset) => asset.recordId === normalized.recordId ? normalized : asset));
        setViewingAsset(normalized);
        refreshAssetSummary();
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error.message || 'Unable to release this allocation.');
    } finally {
      setIsSaving(false);
    }
  }
  function openAssetIssue(asset: Asset) {
    setIssueAsset(asset);
    setIssueSuccess('');
    setIssueForm({ title: `Issue with ${asset.name} (${asset.id || asset.assetCode || 'asset'})`, description: '', priority: 'Medium' });
  }

  async function handleRaiseAssetIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issueAsset?.recordId) return;
    setIsSubmittingIssue(true);
    setIssueSuccess('');
    setErrorMessage('');
    try {
      const requesterDepartment = departmentRecords.find((department) => managedDepartmentKeys.has(normalizeDepartmentName(department.id)) || managedDepartmentKeys.has(normalizeDepartmentName(department.name)))?.name || '';
      const requesterName = storedUser?.fullName || storedUser?.name || rawUserName;
      const created = await createTicket({
        title: issueForm.title.trim(),
        description: issueForm.description.trim(),
        priority: issueForm.priority,
        department: issueAsset.department || 'Administration',
        departmentId: issueAsset.departmentId || null,
        assignedTo: `${issueAsset.department || 'Administration'} Queue`,
        submittedBy: requesterName,
        submittedByDept: requesterDepartment,
        assetId: issueAsset.recordId,
        assetCode: issueAsset.assetCode || issueAsset.id || '',
        assetName: issueAsset.name,
        assetDepartmentId: issueAsset.departmentId || null,
        assetAssignedTo: issueAsset.assignedTo || requesterDepartment,
      });
      setIssueSuccess(`Issue ${created?.ticketCode || ''} raised to ${issueAsset.department || 'the owning department'}.`.trim());
    } catch (issueError: any) {
      setErrorMessage(issueError?.response?.data?.message || issueError?.message || 'Unable to raise this asset issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  }
  const displayedAssets = useMemo(() => {
    return scopedAssets.filter((a) => {
      const matchesDept = selectedDeptFilter === 'All' || normalizeDepartmentName(a.department || '') === normalizeDepartmentName(selectedDeptFilter) ||
        a.allocations.some((allocation) => normalizeDepartmentName(allocation.department || '') === normalizeDepartmentName(selectedDeptFilter));
      const matchesStatus = statusFilter === 'All' ? true : a.status === statusFilter;
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || (a.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [scopedAssets, searchQuery, selectedDeptFilter, statusFilter]);

  // Each asset "line" can cover several identical physical units (units[]); the table
  // shows one row per unit (same specs, distinct unit code) instead of one row per line,
  // per the "5 laptops = 5 rows with different IDs" requirement. Row-level actions still
  // target the parent line item since allocation/transfer operate on the whole batch.
  const displayUnitRows = useMemo(() => {
    return displayedAssets.flatMap((asset) => {
      if (Array.isArray(asset.units) && asset.units.length > 0) {
        return asset.units.map((unit, index) => ({
          asset,
          rowKey: `${asset.recordId || asset.id}-${unit.unitCode || index}`,
          unitCode: unit.unitCode || asset.id || '',
          unitSerial: unit.serialNumber || '',
        }));
      }
      return [{ asset, rowKey: String(asset.recordId || asset.id), unitCode: asset.id || '', unitSerial: asset.serialNumber || '' }];
    });
  }, [displayedAssets]);

  const ASSET_EXPORT_COLUMNS: ExportColumn[] = [
    { header: 'Asset', key: 'name', width: 2 },
    { header: 'Code', key: 'id' },
    { header: 'Category', key: 'category' },
    { header: 'Department', key: 'department' },
    { header: 'Status', key: 'status' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Allocated', key: 'allocatedQuantity' },
    { header: 'Available', key: 'availableQuantity' },
    { header: 'Unit Price', key: 'unitPrice' },
    { header: 'Total Price', key: 'value' },
    { header: 'Assigned To', key: 'assignedTo', width: 1.5 },
    { header: 'Location', key: 'location', width: 1.5 },
  ];

  // Server-side report pipeline: file is generated on the backend, stored in
  // S3 and archived in the Reports module (same as Finance/HR exports).
  const handleExportAssets = async ({ format, dataWindow, period, reportMonth }: ExportParams) => {
    const rows = displayedAssets.map((asset) => ({
      ...asset,
      quantity: asset.quantity,
      allocatedQuantity: asset.allocatedQuantity,
      availableQuantity: asset.availableQuantity,
    })) as Record<string, any>[];
    if (rows.length === 0) {
      toast.error('No assets to export.');
      return;
    }

    try {
      const response = await createReport({
        title: 'Assets Report',
        department: 'General',
        category: 'Other',
        dataWindow,
        reportMonth,
        period: period || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        description: `Asset inventory export (${rows.length} assets).`,
        format,
        sourceType: 'assets',
        sourceRef: 'assets-page',
        reportRows: rowsToReportRows(ASSET_EXPORT_COLUMNS, rows),
      });
      const downloadUrl = response?.data?.download?.url;
      if (!downloadUrl) throw new Error('Download URL missing.');
      await downloadReportFile(downloadUrl, { openInNewTab: false });
      toast.success('Assets report exported and saved to Reports.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export assets report.');
    }
  };

  const statsBase = useMemo(() => {
    return scopedAssets.filter((a) => selectedDeptFilter === 'All' || normalizeDepartmentName(a.department || '') === normalizeDepartmentName(selectedDeptFilter) ||
      a.allocations.some((allocation) => normalizeDepartmentName(allocation.department || '') === normalizeDepartmentName(selectedDeptFilter)));
  }, [scopedAssets, selectedDeptFilter]);

  function getCategoryIcon(category?: string) {
    switch (category) {
      case 'Hardware': return <Monitor size={14} className="text-blue-500" />;
      case 'Infrastructure': return <Server size={14} className="text-indigo-500" />;
      case 'Software': return <Cloud size={14} className="text-sky-500" />;
      case 'Furniture': return <Briefcase size={14} className="text-amber-600" />;
      default: return <Box size={14} className="text-slate-500" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status.toLowerCase()) {
      case 'active': return <span className={statusPillClass("Active")}>Active</span>;
      case 'maintenance': return <span className={statusPillClass("In Maintenance")}>In Maintenance</span>;
      case 'decommissioned': return <span className={statusPillClass("Decommissioned")}>Decommissioned</span>;
      default: return null;
    }
  }

function AssetsSkeleton() {
  return (
    <div className="space-y-4 w-full animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="grid grid-cols-4 gap-4 mt-8">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-24 bg-slate-200 rounded-2xl"></div>
        ))}
      </div>
      <div className="h-64 bg-slate-200 rounded-3xl mt-8"></div>
    </div>
  );
}

  if (activeModule === 'requests') return <AssetRequestsPanel onShowAssets={() => setActiveModule('assets')} />;

  return (
    <>
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        {isInitialLoading && <AssetsSkeleton />}
        {!isInitialLoading && (
          <div className="flex flex-col gap-4">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                   {pageTitle}
                </h2>
                <p className="text-xs font-pmedium text-slate-500 mt-1">
                  {isFounderScope
                    ? 'Founder View: Track all company hardware, software licenses, infrastructure, and equipment globally.'
                    : isDeptScope
                    ? 'Admin View: track assets only for the departments assigned to you.'
                    : 'Department View: assets owned by or assigned to your department.'}
                </p>
              </div>
                <div className="flex items-center gap-2 flex-wrap">
                              {canAddAssets && (
                                <button
                                  type="button"
                                  onClick={openBulkAssetModal}
                                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-blue-50 hover:border-blue-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                  <UploadCloud size={16} className="text-blue-500"/>
                                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-[#2563EB] text-white px-1.5 py-0.5 rounded">BULK UPLOAD</span>
                                </button>
                              )}
                              <ReportExportButton onClick={() => setShowExportModal(true)} />

                            </div>

            </div>

            <div data-tour="assets-module-tabs" className="mb-3 flex flex-wrap gap-1.5 rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              <button type="button" className="flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all bg-[#2563EB] text-white shadow-sm">Assets</button>
              <button type="button" onClick={() => setActiveModule('requests')} className="flex-1 rounded-xl px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900">Asset Requests</button>
            </div>
            {errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] font-pmedium text-red-600">{errorMessage}</div>
            ) : null}

            {/* 2. STAT CARDS */}
            <div data-tour="assets-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
              {[
                { key: 'total', label: 'Total Units', value: assetSummary ? assetSummary.totalQuantity : statsBase.reduce((sum, asset) => sum + asset.quantity, 0), cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: Box, iconClass: 'bg-slate-50 text-slate-600' },
                { key: 'active', label: 'Allocated Units', value: assetSummary ? assetSummary.totalAllocatedQuantity : statsBase.reduce((sum, asset) => sum + asset.allocatedQuantity, 0), cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: ShieldCheck, iconClass: 'bg-emerald-50 text-emerald-600' },
                { key: 'maintenance', label: 'In Maintenance', value: statsBase.filter(t => t.status === 'Maintenance').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-amber-500', icon: Wrench, iconClass: 'bg-amber-50 text-amber-600' },
                { key: 'decommissioned', label: 'Decommissioned', value: statsBase.filter(t => t.status === 'Decommissioned').length, cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-slate-400', icon: Box, iconClass: 'bg-slate-50 text-slate-500' },
              ].map((card) => {
                const Icon = card.icon;
                const labelToneClass = card.cardClass.includes('border-l')
                  ? (card.iconClass.split(' ').find((cls) => cls.startsWith('text-')) || 'text-slate-400')
                  : 'text-slate-400';
                return (
                  <div key={card.key} className={card.cardClass}>
                    <div className="min-w-0">
                      <p className={`text-[10px] font-pmedium ${labelToneClass} uppercase tracking-widest mb-1`}>{card.label}</p>
                      <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-2xl ${card.iconClass} shrink-0`}><Icon size={16} /></div>
                  </div>
                );
              })}
            </div>

            {/* 3. DATA PANEL */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">

              {/* Toolbar: status pills + search + filter + action */}
              <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">

                <div data-tour="assets-status-filter" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {['All', 'Active', 'Maintenance', 'Decommissioned'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                      }`}
                    >
                      {status === 'Maintenance' ? 'In Maintenance' : status}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                  <div className="relative">
                    <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2563EB]" size={13} />
                    <select
                      data-tour="assets-department-filter"
                      className="pl-9 pr-4 py-2.5 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 text-[#2563EB] rounded-lg text-[10px] font-pmedium uppercase tracking-widest outline-none cursor-pointer appearance-none shadow-sm min-w-[170px]"
                      value={selectedDeptFilter} onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedDeptFilter(e.target.value)}
                    >
                      <option value="All">All Departments</option>
                      {availableDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#2563EB] pointer-events-none" size={12} />
                  </div>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      data-tour="assets-search"
                      type="text" placeholder="Search assets..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-500"
                      value={searchQuery} onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  {canAddAssets && (
                    <button
                      data-tour="assets-add-btn"
                      onClick={openAddAsset}
                      className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-primary/95 active:scale-95 transition-all whitespace-nowrap"
                    >
                      <Plus size={13} strokeWidth={3} /> ADD ASSET
                    </button>
                  )}
                </div>
              </div>

              {/* Table (Desktop) / Cards (Mobile) */}
              <div className="overflow-x-auto flex-1 [&::-webkit-scrollbar]:hidden bg-white/20">

                {/* Desktop Table */}
                <table data-tour="assets-table" className="hidden lg:table w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] font-pmedium text-slate-500 uppercase tracking-widest border-b border-slate-100/60">
                    <tr>
                      <th className="px-5 py-4">Asset Identity</th>
                      <th className="px-5 py-4">Owning Dept</th>
                      <th className="px-5 py-4">Assigned Dept</th>
                      <th className="px-5 py-4 text-center">Batch Qty</th>
                      <th className="px-5 py-4 text-right">Unit Price</th>
                      <th className="px-5 py-4">Location</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayUnitRows.map(({ asset, rowKey, unitCode, unitSerial }) => (
                      <tr key={rowKey} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-5 py-4 align-top max-w-[250px] xl:max-w-[350px]">
                          <span className="text-[10px] font-pmedium text-slate-600 mb-1.5 inline-block">{unitCode}</span>
                          <div className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]" title={asset.name}>{asset.name}</div>
                          <div className="text-[11px] sm:text-[12px] text-slate-500 mt-1 flex items-center gap-1.5">
                            {getCategoryIcon(asset.category)} {asset.category}
                          </div>
                          {unitSerial ? <div className="text-[10px] text-slate-400 mt-0.5">SN: {unitSerial}</div> : null}
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex items-center gap-1.5 text-[12px] sm:text-[13px] font-pmedium text-[#0F172A]">
                            <Building2 size={12} className="text-slate-400" /> {asset.department || '--'}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top min-w-[200px]">
                          {asset.allocations.length > 0 ? (
                            <span className="text-[12px] sm:text-[13px] font-pmedium text-[#0F172A]">
                              {asset.allocations.map((allocation) => `${allocation.department || asset.department || '--'} (${allocation.quantity} unit${allocation.quantity > 1 ? 's' : ''})`).join(', ')}
                            </span>
                          ) : (
                            <span className="text-[12px] text-slate-400">Not allocated</span>
                          )}
                        </td>
                        <td className="px-5 py-4 align-top text-center">
                          <div className="inline-flex flex-col rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                            <span className="text-[12px] font-pmedium text-slate-900">{asset.quantity} total</span>
                            <span className="text-[10px] text-emerald-600">{asset.availableQuantity} available</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top text-right">
                          <span className="text-[12px] font-pmedium text-slate-700">{asset.unitPrice && asset.unitPrice !== '-' ? formatCurrency(asset.unitPrice) : '--'}</span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className="inline-flex items-center gap-1 text-[12px] font-pmedium text-slate-700 bg-slate-50 border border-slate-100 px-2 py-1.5 rounded-lg shadow-sm">
                            <MapPin size={12} className="text-slate-400" /> {asset.location}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">{getStatusBadge(asset.status)}</td>
                        <td className="px-5 py-4 align-top text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewingAsset(asset)}
                              className="p-1.5 bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 rounded-lg transition-all"
                              title="View"
                            >
                              <Eye size={15} strokeWidth={2.5} />
                            </button>
                            {canManageAssets && canManageAssignedAsset(asset) && (
                              <button
                                onClick={() => openEditAsset(asset)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Pencil size={15} strokeWidth={2.5} />
                              </button>
                            )}
                            {canManageAssets && canTransferAsset(asset) && (
                              <button
                                onClick={() => openTransferAsset(asset)}
                                className="p-1.5 bg-slate-100 text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-lg transition-all"
                                title={canActAsOwnerFor(asset) ? 'Transfer' : 'Assign Employee'}
                              >
                                <ArrowRightLeft size={15} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {displayedAssets.length > 0 && assetsPagination.page < assetsPagination.totalPages && (
                      <tr>
                        <td colSpan={8} ref={assetsLoadMoreSentinelRef} className="py-6 text-center text-[11px] font-pmedium text-slate-400">
                          {isLoadingMoreAssets && (
                            <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Loading more assets...</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div data-tour="assets-table" className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {displayUnitRows.map(({ asset, rowKey, unitCode, unitSerial }) => (
                    <div key={rowKey} className={`bg-white border p-4 sm:p-5 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all ${asset.status === 'Maintenance' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200/60'}`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{unitCode}</span>
                          <h3 className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]">{asset.name}</h3>
                          <p className="text-[12px] text-slate-500 font-pmedium flex items-center gap-1.5">{getCategoryIcon(asset.category)} {asset.category}</p>
                          {unitSerial ? <p className="text-[10px] text-slate-400">SN: {unitSerial}</p> : null}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">{getStatusBadge(asset.status)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                        <div>
                          <span className={statusPillClass("Owning Dept")}>Owning Dept</span>
                          <span className="text-[11px] font-pmedium text-[#0F172A] truncate flex items-center gap-1" title={asset.department}><Building2 size={10} className="text-slate-400 shrink-0" /> {asset.department || '--'}</span>
                        </div>
                        <div>
                          <span className={statusPillClass("Assigned Dept")}>Assigned Dept</span>
                          <span className="text-[11px] font-pmedium text-[#2563EB] flex items-start gap-1"><Building2 size={10} className="mt-0.5 text-blue-400 shrink-0" /><span>{asset.allocations[0]?.department || 'Not allocated'}{asset.allocations[0]?.user ? <small className="block text-[9px] text-slate-500">{asset.allocations[0].user}</small> : null}</span></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-100 bg-white p-2 text-center">
                        <div><span className="block text-[9px] uppercase text-slate-400">Total</span><span className="text-[12px] font-pmedium">{asset.quantity}</span></div>
                        <div><span className="block text-[9px] uppercase text-slate-400">Allocated</span><span className="text-[12px] font-pmedium text-blue-600">{asset.allocatedQuantity}</span></div>
                        <div><span className="block text-[9px] uppercase text-slate-400">Available</span><span className="text-[12px] font-pmedium text-emerald-600">{asset.availableQuantity}</span></div>
                        <div><span className="block text-[9px] uppercase text-slate-400">Unit Price</span><span className="text-[12px] font-pmedium">{asset.unitPrice && asset.unitPrice !== '-' ? formatCurrency(asset.unitPrice) : '--'}</span></div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[10px] sm:text-[11px] font-pmedium text-slate-600 truncate">{asset.location}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 border-t border-slate-100/60 pt-3">
                        {canManageAssets && canTransferAsset(asset) && (
                              <button
                                onClick={() => openTransferAsset(asset)}
                            className="flex-1 justify-center px-3 py-2 bg-slate-50 border border-slate-200 text-indigo-600 rounded-xl font-pmedium text-[10px] uppercase shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-white transition-all flex items-center gap-1.5"
                          >
                            <ArrowRightLeft size={13} strokeWidth={2} /> {canActAsOwnerFor(asset) ? 'Transfer' : 'Assign'}
                          </button>
                        )}
                        {canManageAssets && canManageAssignedAsset(asset) && (
                              <button
                                onClick={() => openEditAsset(asset)}
                            className="flex-1 justify-center px-3 py-2 bg-white border border-slate-200 text-amber-700 rounded-xl font-pmedium text-[10px] uppercase shadow-sm hover:shadow-md hover:border-amber-200 hover:bg-amber-50 transition-all flex items-center gap-1.5"
                          >
                            <Pencil size={13} strokeWidth={2} /> Edit
                          </button>
                        )}
                        <button
                          onClick={() => setViewingAsset(asset)}
                          className="flex-1 justify-center px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-pmedium text-[10px] uppercase shadow-sm hover:shadow-md hover:border-blue-200 hover:text-[#2563EB] transition-all flex items-center gap-1.5"
                        >
                          <Eye size={14} strokeWidth={2} /> View
                        </button>
                      </div>
                    </div>
                  ))}
                  {displayedAssets.length > 0 && assetsPagination.page < assetsPagination.totalPages && (
                    <div ref={assetsLoadMoreSentinelMobileRef} className="py-4 text-center text-[11px] font-pmedium text-slate-400">
                      {isLoadingMoreAssets && (
                        <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" /> Loading more assets...</span>
                      )}
                    </div>
                  )}
                </div>

                {displayedAssets.length === 0 && (
                  <div className="text-center py-20 px-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
                      <Box className="text-slate-400" size={24} />
                    </div>
                    <p className="text-slate-500 font-pmedium mb-1">No assets found</p>
                    <p className="text-slate-400 text-[13px]">Try adjusting your filters or search terms.</p>
                  </div>
                )}
              </div>

              {assetsPagination.total > assets.length && (
                <div className="flex items-center justify-center border-t border-slate-100/70 bg-white/70 px-4 py-3">
                  <p className="text-[11px] font-pmedium text-slate-500">Showing {assets.length} of {assetsPagination.total} assets — scroll down to load more.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageFrame>

      <BulkUploadModal
        open={bulkAssetModal}
        onClose={closeBulkAssetModal}
        title="Bulk Upload Assets"
        description="Import assets from a spreadsheet — one row per asset."
        fileInputRef={bulkAssetFileInputRef}
        onFileChange={handleBulkAssetFileChange}
        onDownloadTemplate={handleBulkAssetDownloadTemplate}
        rules={[
          'Fill in Asset Name, Department, Category, Sub Category, Quantity and Price per Unit per row.',
          'A row with Quantity 5 creates 5 identical units, each with its own unique Asset ID.',
          'Unknown categories/sub categories are created automatically.',
        ]}
        fileName={bulkAssetFileName}
        isImporting={bulkAssetImporting}
        staged={Boolean(bulkAssetFileName) && !bulkAssetSummary}
        stagedInfo={`${bulkAssetRows.length} row${bulkAssetRows.length === 1 ? '' : 's'} detected`}
        onConfirmImport={handleBulkAssetImport}
        onChangeFile={() => { setBulkAssetFileName(''); setBulkAssetRows([]); setBulkAssetError(''); }}
        importLabel={`Import ${bulkAssetRows.length} Row${bulkAssetRows.length === 1 ? '' : 's'}`}
        summary={bulkAssetSummary ? {
          created: bulkAssetSummary.created,
          failed: bulkAssetSummary.skipped,
          fileName: bulkAssetFileName,
          errors: bulkAssetSummary.issues,
        } : null}
        error={bulkAssetError}
      />

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
            <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  {editingAsset ? <Pencil size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 className="text-[15px] font-pmedium text-slate-900">{editingAsset ? 'Edit Asset' : 'Add Asset'}</h3>
                  <p className="text-[12px] text-slate-500">{editingAsset ? 'Update asset details; use Transfer to change assignment.' : 'Register hardware, software, furniture, or infra for your department.'}</p>
                </div>
              </div>
              <button type="button" onClick={closeAssetForm} disabled={isSaving} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-50"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveAsset} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Package size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Item Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Asset Name <span className="text-red-400">*</span></label>
                    <input required value={assetForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" placeholder="e.g. MacBook Pro M3 Max" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category <span className="text-red-400">*</span></label>
                    <select required disabled={!assetForm.department} value={assetForm.categoryId} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      if (e.target.value === ADD_NEW_OPTION) { setCategoryForm({ name: '', requiresSerialNumber: false }); setIsCategoryModalOpen(true); return; }
                      setAssetForm((prev) => ({ ...prev, categoryId: e.target.value, subCategoryId: '' }));
                    }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed">
                      <option value="" disabled>{assetForm.department ? 'Select category' : 'Select department first'}</option>
                      {availableAssetCategories.map((c) => (
                        <option key={c._id} value={c._id}>{c.categoryName}{isFounderScope && c.department?.name ? ` (${c.department.name})` : ''}</option>
                      ))}
                      {assetForm.department ? <option value={ADD_NEW_OPTION}>+ Add New Category</option> : null}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Sub Category <span className="text-red-400">*</span></label>
                    <select required disabled={!assetForm.categoryId} value={assetForm.subCategoryId} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      if (e.target.value === ADD_NEW_OPTION) { setSubCategoryForm({ name: '' }); setIsSubCategoryModalOpen(true); return; }
                      setAssetForm((prev) => ({ ...prev, subCategoryId: e.target.value }));
                    }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer disabled:bg-slate-50 disabled:cursor-not-allowed">
                      <option value="">Select sub category</option>
                      {filteredSubCategories.map((s) => (
                        <option key={s._id} value={s._id}>{s.subCategoryName}</option>
                      ))}
                      {assetForm.categoryId ? <option value={ADD_NEW_OPTION}>+ Add New Sub Category</option> : null}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Vendor</label>
                    <select value={assetForm.vendorId} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      if (e.target.value === ADD_NEW_OPTION) { setIsVendorModalOpen(true); return; }
                      setAssetForm((prev) => ({ ...prev, vendorId: e.target.value }));
                    }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                      <option value="">Select vendor</option>
                      {vendors.map((v) => (
                        <option key={v._id} value={v._id}>{v.name}</option>
                      ))}
                      <option value={ADD_NEW_OPTION}>+ Add New Vendor</option>
                    </select>
                  </div>
                  {!requiresSerialNumber && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Serial Number</label>
                      <input type="text" value={serialNumbers[0] || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setSerialNumbers((prev) => { const next = [...prev]; next[0] = e.target.value; return next; })} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" placeholder="IT asset tag or serial number" />
                    </div>
                  )}
                  {requiresSerialNumber && (
                    <div className="flex flex-col gap-2 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Serial Number(s) <span className="text-red-400">*</span></label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {serialNumbers.map((value, index) => (
                          <input
                            key={index}
                            required
                            type="text"
                            value={value}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSerialNumbers((prev) => { const next = [...prev]; next[index] = e.target.value; return next; })}
                            className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500"
                            placeholder={`Unit ${index + 1} serial number`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Brand / Model</label>
                    <input type="text" value={assetForm.brandModel} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, brandModel: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" placeholder="e.g. Dell Latitude 5440" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Purchase Date</label>
                    <input type="date" value={assetForm.purchaseDate} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, purchaseDate: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" required={assetForm.ownershipType === 'Rented'} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Quantity <span className="text-red-400">*</span></label>
                    <input type="number" min={1} value={assetForm.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, quantity: e.target.value === '' || /^\d+$/.test(e.target.value) ? e.target.value : prev.quantity }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" required />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Price per Unit ({workspacePreferences.currency})</label>
                    <input type="number" min={0} step="0.01" value={assetForm.unitPrice} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, unitPrice: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" placeholder="e.g. 3499" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Total Price ({workspacePreferences.currency})</label>
                    <input type="text" readOnly value={formatCurrency(totalPricePreview)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Warranty (Months)</label>
                    <input type="number" min={0} value={assetForm.warrantyMonths} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, warrantyMonths: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" placeholder="e.g. 12" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Warranty Expiry</label>
                    <input type="date" readOnly value={warrantyExpiryPreview} className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><ImageIcon size={13} /> Asset Image</label>
                    <input type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, assetImage: e.target.files?.[0] || null }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-[10px] file:font-pmedium file:text-blue-700" />
                    {editingAsset && getAssetFileUrl(editingAsset.assetImage) ? <a href={getAssetFileUrl(editingAsset.assetImage)} target="_blank" rel="noreferrer" className="text-[10px] font-pmedium text-blue-600">View current image</a> : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><FileText size={13} /> Warranty Document</label>
                    <input type="file" accept="image/*,.pdf" onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, warrantyDocument: e.target.files?.[0] || null }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-[10px] file:font-pmedium file:text-blue-700" />
                    {editingAsset && getAssetFileUrl(editingAsset.warrantyDocument) ? <a href={getAssetFileUrl(editingAsset.warrantyDocument)} target="_blank" rel="noreferrer" className="text-[10px] font-pmedium text-blue-600">View current warranty</a> : null}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Ownership & Assignment</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Ownership Type</label>
                    <select value={assetForm.ownershipType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm((prev) => ({ ...prev, ownershipType: e.target.value, rentDurationMonths: e.target.value === 'Rented' ? prev.rentDurationMonths : '' }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                      <option value="Owned">Owned</option>
                      <option value="Rented">Rented</option>
                    </select>
                  </div>
                  {assetForm.ownershipType === 'Rented' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Rent Duration (Months)</label>
                      <input type="number" min={1} value={assetForm.rentDurationMonths} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, rentDurationMonths: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" placeholder="e.g. 12" required />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Expiry Date (Auto)</label>
                    <input type="date" readOnly value={expiryPreview} className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-500 outline-none cursor-not-allowed" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Status</label>
                    <select value={assetForm.status} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm((prev) => ({ ...prev, status: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Decommissioned">Decommissioned</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Department <span className="text-red-400">*</span></label>
                    {isFounderScope ? (
                      <select required disabled={Boolean(editingAsset)} value={assetForm.department} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm((prev) => ({ ...prev, department: e.target.value, assignedToUserId: '', assignedTo: prev.assignedToType === 'department' ? e.target.value : '' }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        <option value="">Select department</option>
                        {availableDepartments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    ) : (
                      <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600">{assetForm.department || 'No department assigned'}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assign To</label>
                    <select disabled={Boolean(editingAsset)} value={assetForm.assignedToType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm((prev) => ({ ...prev, assignedToType: e.target.value, assignedToUserId: '', assignedTo: e.target.value === 'department' ? prev.department : '' }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                      <option value="department">Department</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>
                  {assetForm.assignedToType === 'employee' ? (
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Employee <span className="text-red-400">*</span></label>
                      <select required disabled={Boolean(editingAsset)} value={assetForm.assignedToUserId} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                        const selected = assetDepartmentEmployees.find((m) => m.value === e.target.value);
                        setAssetForm((prev) => ({ ...prev, assignedToUserId: e.target.value, assignedTo: selected?.label || '' }));
                      }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        <option value="">Select employee</option>
                        {assetDepartmentEmployees.map((emp) => <option key={emp.value} value={emp.value}>{emp.label}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assigned Department</label>
                      <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600">{assetForm.department || 'Select a department'}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><MapPin size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Location & Notes</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Floor</label>
                    {floorMode === 'custom' ? (
                      <div className="space-y-1.5">
                        <input
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500"
                          value={assetForm.floor}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, floor: e.target.value }))}
                          placeholder="Enter new floor"
                        />
                        <button type="button" onClick={() => { setFloorMode('select'); setAssetForm((prev) => ({ ...prev, floor: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                      </div>
                    ) : (
                      <select value={assetForm.floor} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                        const nextValue = e.target.value;
                        if (nextValue === ADD_NEW_OPTION) { setFloorMode('custom'); setAssetForm((prev) => ({ ...prev, floor: '' })); return; }
                        setAssetForm((prev) => ({ ...prev, floor: nextValue }));
                      }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
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
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500"
                          value={assetForm.wing}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, wing: e.target.value }))}
                          placeholder="Enter new wing"
                        />
                        <button type="button" onClick={() => { setWingMode('select'); setAssetForm((prev) => ({ ...prev, wing: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Back to dropdown</button>
                      </div>
                    ) : (
                      <select value={assetForm.wing} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                        const nextValue = e.target.value;
                        if (nextValue === ADD_NEW_OPTION) { setWingMode('custom'); setAssetForm((prev) => ({ ...prev, wing: '' })); return; }
                        setAssetForm((prev) => ({ ...prev, wing: nextValue }));
                      }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                        <option value="">Select wing</option>
                        {resourceWings.map((w) => <option key={w} value={w}>{w}</option>)}
                        <option value={ADD_NEW_OPTION}>Add new wing</option>
                      </select>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Location Preview</label>
                    <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-500">{getLocationLabel(assetForm.floor, assetForm.wing) || 'Select floor and wing'}</div>
                  </div>
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Notes</label>
                    <textarea rows={2} value={assetForm.notes} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAssetForm((prev) => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600 outline-none resize-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-500" placeholder="Additional notes for this asset" />
                  </div>
                </div>
              </div>

              <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
                <button type="button" onClick={closeAssetForm} disabled={isSaving} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase disabled:opacity-50">CANCEL</button>
                <button type="submit" disabled={isSaving} className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'SAVING...' : editingAsset ? 'UPDATE ASSET' : 'CREATE ASSET'} <Plus size={13} strokeWidth={3} /></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleCreateCategory} className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div><h3 className="text-[15px] font-pmedium text-slate-900">Add Category</h3><p className="text-[11px] text-slate-500 mt-1">{assetForm.department || 'Select department'} department</p></div>
              <button type="button" disabled={isSavingCategory} onClick={() => setIsCategoryModalOpen(false)} className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              <label className="block text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category Name *<input required maxLength={120} value={categoryForm.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#2563EB]/20" placeholder="e.g. Laptops" /></label>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-pmedium text-slate-700"><input type="checkbox" checked={categoryForm.requiresSerialNumber} onChange={(event: ChangeEvent<HTMLInputElement>) => setCategoryForm((prev) => ({ ...prev, requiresSerialNumber: event.target.checked }))} />Requires serial number per unit</label>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end"><button type="button" disabled={isSavingCategory} onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] uppercase">Cancel</button><button type="submit" disabled={isSavingCategory || !selectedDepartmentRecord?.id} className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-[10px] uppercase inline-flex items-center gap-1.5 disabled:opacity-60">{isSavingCategory ? 'Saving...' : 'Save Category'}</button></div>
          </form>
        </div>
      )}

      {isSubCategoryModalOpen && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleCreateSubCategory} className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div><h3 className="text-[15px] font-pmedium text-slate-900">Add Sub Category</h3><p className="text-[11px] text-slate-500 mt-1">{selectedCategoryObj?.categoryName || 'Selected category'} - {assetForm.department}</p></div>
              <button type="button" disabled={isSavingCategory} onClick={() => setIsSubCategoryModalOpen(false)} className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3"><label className="block text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Sub Category Name *<input required maxLength={120} value={subCategoryForm.name} onChange={(event: ChangeEvent<HTMLInputElement>) => setSubCategoryForm({ name: event.target.value })} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#2563EB]/20" placeholder="e.g. MacBook" /></label></div>
            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end"><button type="button" disabled={isSavingCategory} onClick={() => setIsSubCategoryModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] uppercase">Cancel</button><button type="submit" disabled={isSavingCategory || !assetForm.categoryId} className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-[10px] uppercase inline-flex items-center gap-1.5 disabled:opacity-60">{isSavingCategory ? 'Saving...' : 'Save Sub Category'}</button></div>
          </form>
        </div>
      )}

      {viewingAsset && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-lg h-[80vh] sm:h-auto sm:max-h-[85vh] rounded-t-[24px] sm:rounded-[24px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
            <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex justify-between items-start shrink-0 relative">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[11px] font-pmedium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{viewingAsset.id || viewingAsset.recordId}</span>
                  {getStatusBadge(viewingAsset.status)}
                </div>
                <h2 className="text-xl sm:text-2xl font-pmedium text-[#0F172A] leading-tight pr-8">{viewingAsset.name}</h2>
                <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1">{getCategoryIcon(viewingAsset.category)} {viewingAsset.category}</p>
              </div>
              {getAssetFileUrl(viewingAsset.assetImage) ? (
                <a href={getAssetFileUrl(viewingAsset.assetImage)} target="_blank" rel="noreferrer" className="mr-10 hidden sm:flex h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={getAssetFileUrl(viewingAsset.assetImage)} alt={viewingAsset.name} className="h-full w-full object-cover" />
                </a>
              ) : null}
              <button onClick={() => setViewingAsset(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-all absolute top-4 sm:top-5 right-4 sm:right-5"><X size={18} strokeWidth={2.5} /></button>
            </div>

            <div className="p-3 space-y-3 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Assignment</span>
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center"><Building2 size={14} /></div>
                    <div>
                      <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Owning Dept</p>
                      <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingAsset.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center"><User size={14} /></div>
                    <div>
                      <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-widest">Assigned To</p>
                      <p className="text-[13px] font-pmedium text-[#0F172A]">{viewingAsset.assignedTo}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Package size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Asset Details</span>
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Serial Number</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.serialNumber || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Brand / Model</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.brandModel || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Purchase Date</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{displayDate(viewingAsset.purchaseDate)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Rental Expiry</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{displayDate(viewingAsset.expiryDate)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Total Quantity</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.quantity || 1}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Available in Owning Dept</span>
                    <span className="text-[12px] font-pmedium text-emerald-600 block">{viewingAsset.availableQuantity}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Ownership</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.ownershipType || 'Owned'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Warranty Months</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.warrantyMonths || '--'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Warranty Expiry</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{displayDate(viewingAsset.warrantyExpiry)}</span>
                  </div>
                  {getAssetFileUrl(viewingAsset.warrantyDocument) ? (
                    <div>
                      <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Warranty File</span>
                      <a href={getAssetFileUrl(viewingAsset.warrantyDocument)} target="_blank" rel="noreferrer" className="text-[12px] font-pmedium text-blue-600 underline">Open file</a>
                    </div>
                  ) : null}
                  {String(viewingAsset.ownershipType || '').trim() === 'Rented' && (
                    <div>
                      <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Rent (Months)</span>
                      <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.rentDurationMonths || '--'}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Physical Location</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.location}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Price per Unit</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.unitPrice && viewingAsset.unitPrice !== '-' ? formatCurrency(viewingAsset.unitPrice) : '--'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Total Price</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.value && viewingAsset.value !== '-' ? formatCurrency(viewingAsset.value) : '--'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Notes</span>
                    <span className="text-[12px] font-pmedium text-slate-600 block bg-slate-50 p-2 border border-slate-100 rounded-lg">{viewingAsset.notes || 'No notes added yet.'}</span>
                  </div>
                </div>
              </div>

              {Array.isArray(viewingAsset.units) && viewingAsset.units.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em] block border-b border-slate-200/80 pb-2">Unit Asset IDs ({viewingAsset.units.length})</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {viewingAsset.units.map((unit, index) => (
                      <div key={unit.unitCode || index} className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
                        <p className="text-[11px] font-pmedium text-slate-800 truncate">{unit.unitCode}</p>
                        {unit.serialNumber ? <p className="text-[9px] text-slate-400 truncate">SN: {unit.serialNumber}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Quantity Allocations</span>
                  <span className="text-[10px] text-slate-500">{viewingAsset.allocatedQuantity} allocated</span>
                </div>
                {viewingAsset.allocations.length === 0 ? (
                  <p className="text-[11px] text-slate-400">All units are available in the owning department.</p>
                ) : viewingAsset.allocations.map((allocation) => (
                  <div key={allocation.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="min-w-0 flex-1 grid grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider">Department</p>
                        <p className="text-[11px] font-pmedium text-slate-800 truncate">{allocation.department || '--'} <span className="text-slate-400">({allocation.quantity})</span></p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider">Assigned Employee</p>
                        <p className="text-[11px] font-pmedium text-slate-800 truncate">{allocation.user || '--'}</p>
                      </div>
                    </div>
                    {canReleaseAllocation(allocation) && (
                      <button type="button" disabled={isSaving} onClick={() => handleReleaseAllocation(allocation)} className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[9px] font-pmedium uppercase text-amber-700 disabled:opacity-50">
                        {allocation.userId ? 'Unassign Employee' : 'Return to Owning Dept'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 sm:pt-6 p-4 sm:p-6 border-t border-slate-200/60 bg-white shrink-0 flex gap-3 flex-col-reverse sm:flex-row sm:justify-center">
              <button onClick={() => setViewingAsset(null)} className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CLOSE</button>
              <button type="button" disabled title="Issue reporting will be enabled later" className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-pmedium text-[10px] uppercase flex items-center justify-center gap-1.5 opacity-70 cursor-not-allowed"><AlertTriangle size={13} /> Raise Issue</button>
              {canManageAssets && canTransferAsset(viewingAsset) && (
                <button onClick={() => openTransferAsset(viewingAsset)} className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl font-pmedium text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-all"><ArrowRightLeft size={13} /> {canActAsOwnerFor(viewingAsset) ? 'Transfer' : 'Assign Employee'}</button>
              )}
              {canManageAssets && canManageAssignedAsset(viewingAsset) && (
                <button onClick={() => openEditAsset(viewingAsset)} className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5"><Pencil size={13} /> EDIT ASSET</button>
              )}
            </div>
          </div>
        </div>
      )}

      {issueAsset && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleRaiseAssetIssue} className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-wider">Raise Issue to Owning Department</p><h3 className="text-[15px] font-pmedium text-slate-900 mt-1">{issueAsset.name} · {issueAsset.assetCode || issueAsset.id}</h3><p className="mt-1 text-[10px] text-slate-400">Assigned to {issueAsset.department || 'the owning department'} queue</p></div>
              <button type="button" disabled={isSubmittingIssue} onClick={() => setIssueAsset(null)} className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              {issueSuccess && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-700">{issueSuccess}</div>}
              <label className="block text-[9px] font-pmedium text-slate-500 uppercase tracking-wider">Issue Title *<input required maxLength={180} value={issueForm.title} onChange={(event) => setIssueForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] normal-case tracking-normal" /></label>
              <label className="block text-[9px] font-pmedium text-slate-500 uppercase tracking-wider">Priority<select value={issueForm.priority} onChange={(event) => setIssueForm((current) => ({ ...current, priority: event.target.value }))} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] normal-case tracking-normal"><option>Low</option><option>Medium</option><option>High</option></select></label>
              <label className="block text-[9px] font-pmedium text-slate-500 uppercase tracking-wider">Describe the Issue *<textarea required minLength={5} maxLength={3000} rows={4} value={issueForm.description} onChange={(event) => setIssueForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] normal-case tracking-normal resize-none" /></label>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end"><button type="button" disabled={isSubmittingIssue} onClick={() => setIssueAsset(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] uppercase">Cancel</button><button type="submit" disabled={isSubmittingIssue || Boolean(issueSuccess)} className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-[10px] uppercase inline-flex items-center gap-1.5 disabled:opacity-60">{isSubmittingIssue && <Loader2 size={13} className="animate-spin" />}{issueSuccess ? 'Issue Raised' : 'Raise Issue'}</button></div>
          </form>
        </div>
      )}
      {showTransferDialog && activeAssetForTransfer && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md h-[75vh] sm:h-auto sm:max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
            <div className="p-4 sm:p-6 border-b border-slate-200/60 flex justify-between items-center shrink-0">
              <h2 className="text-[14px] sm:text-[16px] font-pmedium text-[#0F172A] flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700"><ArrowRightLeft size={16} /></span>
                {isFounderScope ? 'TRANSFER ASSET' : 'ASSIGN ASSET'}
              </h2>
              <button onClick={() => setShowTransferDialog(false)} className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm transition-all"><X size={18} strokeWidth={2.5} /></button>
            </div>

            <div className="p-3 sm:p-4 space-y-4 overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0"><Package size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Transferring</span>
                </h4>
                <div className="flex items-center gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center"><Package size={14} /></div>
                  <div>
                    <p className="text-[13px] font-pmedium text-[#0F172A]">{activeAssetForTransfer.name}</p>
                    <span className="text-[10px] font-pmedium text-[#2563EB]">{activeAssetForTransfer.id || activeAssetForTransfer.recordId}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
                  <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">{canActAsOwnerFor(activeAssetForTransfer) ? 'Transfer Details' : 'Assignment Details'}</span>
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Department <span className="text-red-400">*</span></label>
                    <select required disabled={!isFounderScope && !canActAsOwnerFor(activeAssetForTransfer)} value={transferForm.department} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransferForm((prev) => ({ ...prev, department: e.target.value, assignedToType: !canManageAssignedAsset(activeAssetForTransfer) && e.target.value === activeAssetForTransfer.department ? 'department' : prev.assignedToType, assignedToUserId: '', assignedTo: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all cursor-pointer">
                      <option value="">Select department</option>
                      {transferDepartmentsFor(activeAssetForTransfer).map((dept) => <option key={dept} value={dept}>{dept === activeAssetForTransfer.department ? `${dept} (Owning Department)` : dept}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assign To</label>
                    <div className="relative">
                      <select disabled={!isFounderScope && !canActAsOwnerFor(activeAssetForTransfer)} value={transferForm.assignedToType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransferForm((prev) => ({ ...prev, assignedToType: e.target.value, department: '', assignedToUserId: '', assignedTo: '', quantity: e.target.value === 'employee' ? '1' : prev.quantity }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all appearance-none cursor-pointer">
                        <option value="department">Department</option>
                        <option value="employee">Employee</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>
                  </div>

                  {transferForm.assignedToType === 'employee' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Employee *</label>
                      <div className="relative">
                        <select required value={transferForm.assignedToUserId} onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                          const selected = transferDepartmentEmployees.find((m) => m.value === e.target.value);
                          setTransferForm((prev) => ({ ...prev, assignedToUserId: e.target.value, assignedTo: selected?.label || '' }));
                        }} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all appearance-none cursor-pointer">
                          <option value="">Select employee</option>
                          {transferDepartmentEmployees.map((emp) => <option key={emp.value} value={emp.value}>{emp.label}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assigned Department</label>
                      <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A]">{transferForm.department || 'Select a department'}</div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Quantity *</label>
                    <input type="number" min={1} max={transferForm.assignedToType === 'employee' ? 1 : effectiveAvailableQuantity(activeAssetForTransfer, transferForm)} disabled={transferForm.assignedToType === 'employee'} value={transferForm.assignedToType === 'employee' ? '1' : transferForm.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => setTransferForm((prev) => ({ ...prev, quantity: e.target.value }))} className="w-full px-3 py-2 bg-white disabled:bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    <p className="text-[10px] text-slate-400">Available: {effectiveAvailableQuantity(activeAssetForTransfer, transferForm)} unit(s)</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">{canActAsOwnerFor(activeAssetForTransfer) ? 'Reason for Transfer' : 'Assignment Note'}</label>
                    <textarea rows={2} value={transferForm.transferReason} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTransferForm((prev) => ({ ...prev, transferReason: e.target.value }))} placeholder="Optional reason..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none transition-all placeholder:text-slate-500" />
                  </div>
                </div>
              </div>


            </div>

            <div className="pt-4 sm:pt-6 p-4 sm:p-6 border-t border-slate-200/60 bg-white shrink-0 flex gap-3 flex-col-reverse sm:flex-row sm:justify-center">
              <button onClick={() => setShowTransferDialog(false)} className="w-full sm:w-auto px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
              <button onClick={handleTransferAsset} disabled={isSaving || !transferForm.department || !transferForm.quantity || Number(transferForm.quantity) < 1 || Number(transferForm.quantity) > effectiveAvailableQuantity(activeAssetForTransfer, transferForm) || (transferForm.assignedToType === 'employee' && !transferForm.assignedToUserId)} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-indigo-700 active:scale-95 transition-all uppercase disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'SAVING...' : canActAsOwnerFor(activeAssetForTransfer) ? 'TRANSFER' : 'ASSIGN'}</button>
            </div>
          </div>
        </div>
      )}
    </div>

    <ExportReportModal
      isOpen={showExportModal}
      onClose={() => setShowExportModal(false)}
      title="Export Assets Report"
      subtitle="Select format and date range to export."
      department="General"
      category="Other"
      sourceRef="assets-page"
      reportTitle={`Assets Report - ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
      defaultDataWindow="Custom"
      onExport={handleExportAssets}
    />
    </>
  );
}
