import { useState, useMemo, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { getStoredUser } from '@/lib/auth-session';
import { useLocation } from 'react-router-dom';
import { createTicket } from '@/services/tickets';
import { AssetRequestsPanel } from './AssetRequestsPanel';
import { getOrganizationOverview } from '@/services/organization';
import { axiosPrivate } from '@/utils/axios';
import { getResources } from '@/services/resources';
import { createAsset, getAssets, updateAsset, transferAsset, releaseAssetAllocation, getDepartments } from '@/services/assets';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';
import {
  Search, ChevronDown, X, Eye, ShieldCheck,
  CheckCircle2, Wrench, Box, ArrowRightLeft, MapPin, Building2,FileSpreadsheet,FileDown,
  Filter, Plus, Monitor, Server, Cloud, Briefcase, User, Package, Pencil, AlertTriangle, Loader2,
} from 'lucide-react';
import PageFrame from '../../components/Pages/PageFrame';
import { statusPillClass } from '../../lib/status-pill';

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
interface Asset {
  recordId?: string;
  _id?: string;
  id?: string;
  assetCode?: string;
  name: string;
  category?: string;
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
  serialNumber: string;
  brandModel: string;
  purchaseDate: string;
  quantity: string;
  ownershipType: string;
  rentDurationMonths: string;
  department: string;
  status: string;
  assignedToType: string;
  assignedTo: string;
  assignedToUserId: string;
  location: string;
  floor: string;
  wing: string;
  value: string;
  notes: string;
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
  if (!parsed) return '';
  const normalized = String(ownershipType || 'Owned').trim();
  const monthsToAdd = normalized === 'Rented' ? Number(rentDurationMonths) : DEFAULT_OWNED_EXPIRY_MONTHS;
  if (!Number.isFinite(monthsToAdd) || monthsToAdd <= 0) return '';
  const computed = addMonthsUTC(parsed, monthsToAdd);
  return computed ? formatISODate(computed) : '';
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
    expiryDate: a.expiryDate || a.warrantyExpiry || '',
    warrantyExpiry: a.warrantyExpiry || a.expiryDate || '',
    location: a.location || 'Unassigned',
    value: a.value || '-',
  };
}

const INITIAL_ASSET_FORM: AssetForm = {
  name: '',
  category: 'Hardware',
  serialNumber: '',
  brandModel: '',
  purchaseDate: '',
  quantity: '1',
  ownershipType: 'Owned',
  rentDurationMonths: '',
  department: '',
  status: 'Active',
  assignedToType: 'department',
  assignedTo: '',
  assignedToUserId: '',
  location: '',
  floor: '',
  wing: '',
  value: '',
  notes: '',
};

export function AssetsPage() {
  const location = useLocation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<'assets' | 'requests'>('assets');
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

  const [assets, setAssets] = useState<Asset[]>([]);
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

  useEffect(() => {
    let mounted = true;
    async function loadAssets() {
      try {
        const response = await getAssets();
        if (!mounted) return;
        const rawAssets = (response?.data?.assets || response?.assets || []) as any[];
        setAssets(rawAssets.map(normalizeAsset));
        setErrorMessage('');
      } catch (error: any) {
        if (mounted) setErrorMessage(error.message || 'Unable to load assets right now.');
      } finally {
        if (mounted) { setIsLoadingAssets(false); setIsInitialLoading(false); }
      }
    }
    loadAssets();
    return () => { mounted = false; };
  }, [location.key]);

  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [activeAssetForTransfer, setActiveAssetForTransfer] = useState<Asset | null>(null);
  const [assetForm, setAssetForm] = useState<AssetForm>({ ...INITIAL_ASSET_FORM, department: defaultDepartment, assignedTo: defaultDepartment });
  const [transferForm, setTransferForm] = useState<TransferForm>({ department: '', assignedToType: 'department', assignedTo: '', assignedToUserId: '', transferReason: '', quantity: '1' });

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

  function openAddAsset() {
    setEditingAsset(null);
    setAssetForm({ ...INITIAL_ASSET_FORM, department: defaultDepartment, assignedTo: defaultDepartment });
    setFloorMode('select');
    setWingMode('select');
    setIsAddModalOpen(true);
  }

  function openEditAsset(asset: Asset) {
    const { floor, wing } = getLocationParts(asset.location);
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name || '',
      category: asset.category || 'Hardware',
      serialNumber: asset.serialNumber || '',
      brandModel: asset.brandModel || '',
      purchaseDate: dateInputValue(asset.purchaseDate),
      quantity: String(asset.quantity || 1),
      ownershipType: asset.ownershipType || 'Owned',
      rentDurationMonths: asset.rentDurationMonths ? String(asset.rentDurationMonths) : '',
      department: asset.department || defaultDepartment,
      status: asset.status || 'Active',
      assignedToType: asset.assignedToUserId ? 'employee' : 'department',
      assignedTo: asset.assignedTo || asset.department || '',
      assignedToUserId: asset.assignedToUserId || '',
      location: asset.location || '',
      floor,
      wing,
      value: asset.value === '-' ? '' : asset.value || '',
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
    setFloorMode('select');
    setWingMode('select');
  }

  async function handleSaveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSaving(true);
    try {
      const selectedEmployee = assetForm.assignedToType === 'employee'
        ? assetDepartmentEmployees.find((m) => m.value === assetForm.assignedToUserId)
        : null;
      const numericValue = assetForm.value ? Number(String(assetForm.value).replace(/[^0-9.-]/g, '')) : 0;
      const payload = {
        name: assetForm.name,
        serialNumber: assetForm.serialNumber,
        brandModel: assetForm.brandModel,
        category: assetForm.category,
        department: assetForm.department,
        status: assetForm.status,
        assignedTo: assetForm.assignedToType === 'department' ? assetForm.department : selectedEmployee?.label || 'Unassigned',
        assignedToUserId: assetForm.assignedToType === 'employee' ? selectedEmployee?.value || null : null,
        purchaseDate: assetForm.purchaseDate,
        quantity: Math.max(1, parseInt(String(assetForm.quantity || '').trim(), 10) || 1),
        ownershipType: assetForm.ownershipType,
        rentDurationMonths: assetForm.ownershipType === 'Rented' ? assetForm.rentDurationMonths : null,
        location: getLocationLabel(assetForm.floor, assetForm.wing) || assetForm.location,
        value: Number.isFinite(numericValue) ? numericValue : 0,
        expiryDate: expiryPreview || null,
        warrantyExpiry: expiryPreview || null,
        notes: assetForm.notes,
      };
      const response = editingAsset?.recordId
        ? await updateAsset(editingAsset.recordId, payload)
        : await createAsset(payload);
      const savedAsset = response?.data?.asset || response?.asset;
      if (savedAsset) {
        const normalized = normalizeAsset(savedAsset);
        setAssets((prev) => editingAsset
          ? prev.map((asset) => asset.recordId === editingAsset.recordId ? normalized : asset)
          : [normalized, ...prev]);
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

  function canManageAssignedAsset(asset: Asset): boolean {
    if (isFounderScope) return true;
    return managedDepartmentKeys.has(normalizeDepartmentName(asset.department || '')) ||
      asset.allocations.some((allocation) => managedDepartmentKeys.has(normalizeDepartmentName(allocation.department || '')));
  }

  function canTransferAsset(asset: Asset): boolean {
    if (isFounderScope) return asset.availableQuantity > 0;
    return assignedDepartments.some((department) => departmentAvailableQuantity(asset, department) > 0);
  }

  function transferDepartmentsFor(asset: Asset): string[] {
    if (isFounderScope) return departmentOptions;
    return assignedDepartments.filter((department) => departmentAvailableQuantity(asset, department) > 0);
  }

  function canReleaseAllocation(allocation: AssetAllocation): boolean {
    return isFounderScope || managedDepartmentKeys.has(normalizeDepartmentName(allocation.department || ''));
  }

  function openTransferAsset(asset: Asset) {
    const availableDepartment = isFounderScope ? '' : transferDepartmentsFor(asset)[0] || '';
    setActiveAssetForTransfer(asset);
    setTransferForm({
      department: availableDepartment,
      assignedToType: isFounderScope ? 'department' : 'employee',
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
    <div className="p-2 lg:p-2.5 min-h-full text-[#0F172A] font-pmedium text-[12px]">
      <PageFrame>
        {isInitialLoading && <AssetsSkeleton />}
        {!isInitialLoading && (
          <div className="flex flex-col gap-4">

            {/* 1. HEADER */}
            <div className="mb-3 flex flex-col md:flex-row justify-between items-start md:items-end gap-1.5">
              <div>
                <h2 className="text-title font-pmedium text-primary uppercase flex items-center gap-1.5">
                   Assets
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
                              <button
                                type="button"
                                // onClick={handleExportPDF}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-red-50 hover:border-red-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileDown size={16} className="text-red-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white px-1.5 py-0.5 rounded">PDF</span>
                              </button>
                              <button
                                type="button"
                                // onClick={handleExportExcel}
                                className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 text-slate-500 transition-all active:scale-95 shadow-sm">
                                <FileSpreadsheet size={16} className="text-emerald-500"/>
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-1.5 py-0.5 rounded">EXCEL</span>
                              </button>

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
                { key: 'total', label: 'Total Units', value: statsBase.reduce((sum, asset) => sum + asset.quantity, 0), cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md', icon: Box, iconClass: 'bg-slate-50 text-slate-600' },
                { key: 'active', label: 'Allocated Units', value: statsBase.reduce((sum, asset) => sum + asset.allocatedQuantity, 0), cardClass: 'bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md border-l-4 border-l-emerald-500', icon: ShieldCheck, iconClass: 'bg-emerald-50 text-emerald-600' },
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
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
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
                      <th className="px-5 py-4 text-center">Quantity</th>
                      <th className="px-5 py-4">Location</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60">
                    {displayedAssets.map((asset) => (
                      <tr key={asset.id || asset.recordId} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-5 py-4 align-top max-w-[250px] xl:max-w-[350px]">
                          <span className="text-[10px] font-pmedium text-slate-600 mb-1.5 inline-block">{asset.id || asset.recordId}</span>
                          <div className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]" title={asset.name}>{asset.name}</div>
                          <div className="text-[11px] sm:text-[12px] text-slate-500 mt-1 flex items-center gap-1.5">
                            {getCategoryIcon(asset.category)} {asset.category}
                          </div>
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
                                title={isFounderScope ? 'Transfer' : 'Assign Employee'}
                              >
                                <ArrowRightLeft size={15} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards */}
                <div data-tour="assets-table" className="flex flex-col gap-3 lg:hidden p-3 sm:p-4 bg-slate-50/30">
                  {displayedAssets.map((asset) => (
                    <div key={asset.id || asset.recordId} className={`bg-white border p-4 sm:p-5 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all ${asset.status === 'Maintenance' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200/60'}`}>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <span className="text-[10px] font-pmedium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{asset.id || asset.recordId}</span>
                          <h3 className="font-pmedium text-[#0F172A] text-[13px] sm:text-[14px]">{asset.name}</h3>
                          <p className="text-[12px] text-slate-500 font-pmedium flex items-center gap-1.5">{getCategoryIcon(asset.category)} {asset.category}</p>
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
                      <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-white p-2 text-center">
                        <div><span className="block text-[9px] uppercase text-slate-400">Total</span><span className="text-[12px] font-pmedium">{asset.quantity}</span></div>
                        <div><span className="block text-[9px] uppercase text-slate-400">Allocated</span><span className="text-[12px] font-pmedium text-blue-600">{asset.allocatedQuantity}</span></div>
                        <div><span className="block text-[9px] uppercase text-slate-400">Available</span><span className="text-[12px] font-pmedium text-emerald-600">{asset.availableQuantity}</span></div>
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
                            <ArrowRightLeft size={13} strokeWidth={2} /> {isFounderScope ? 'Transfer' : 'Assign'}
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
            </div>
          </div>
        )}
      </PageFrame>

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
                    <input required value={assetForm.name} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400" placeholder="e.g. MacBook Pro M3 Max" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category <span className="text-red-400">*</span></label>
                    <select value={assetForm.category} onChange={(e: ChangeEvent<HTMLSelectElement>) => setAssetForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] cursor-pointer">
                      <option value="Hardware">Hardware</option>
                      <option value="Infrastructure">Infrastructure</option>
                      <option value="Software">Software</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Serial Number</label>
                    <input type="text" value={assetForm.serialNumber} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, serialNumber: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400" placeholder="IT asset tag or serial number" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Brand / Model</label>
                    <input type="text" value={assetForm.brandModel} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, brandModel: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400" placeholder="e.g. Dell Latitude 5440" />
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
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Asset Value ({workspacePreferences.currency})</label>
                    <input type="number" min={0} step="0.01" value={assetForm.value} onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetForm((prev) => ({ ...prev, value: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400" placeholder="e.g. 3499" />
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
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
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
                          className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
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
                    <textarea rows={2} value={assetForm.notes} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setAssetForm((prev) => ({ ...prev, notes: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600 outline-none resize-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400" placeholder="Additional notes for this asset" />
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
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Expiry Date</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{displayDate(viewingAsset.expiryDate || viewingAsset.warrantyExpiry)}</span>
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
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Asset Value</span>
                    <span className="text-[12px] font-pmedium text-slate-700 block">{viewingAsset.value && viewingAsset.value !== '-' ? formatCurrency(viewingAsset.value) : '--'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">Notes</span>
                    <span className="text-[12px] font-pmedium text-slate-600 block bg-slate-50 p-2 border border-slate-100 rounded-lg">{viewingAsset.notes || 'No notes added yet.'}</span>
                  </div>
                </div>
              </div>

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
                <button onClick={() => openTransferAsset(viewingAsset)} className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-2xl font-pmedium text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-indigo-100 transition-all"><ArrowRightLeft size={13} /> {isFounderScope ? 'Transfer' : 'Assign Employee'}</button>
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
                  <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">{isFounderScope ? 'Transfer Details' : 'Assignment Details'}</span>
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Department <span className="text-red-400">*</span></label>
                    <select required disabled={!isFounderScope} value={transferForm.department} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransferForm((prev) => ({ ...prev, department: e.target.value, assignedToType: !canManageAssignedAsset(activeAssetForTransfer) && e.target.value === activeAssetForTransfer.department ? 'department' : prev.assignedToType, assignedToUserId: '', assignedTo: e.target.value }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all cursor-pointer">
                      <option value="">Select department</option>
                      {transferDepartmentsFor(activeAssetForTransfer).map((dept) => <option key={dept} value={dept}>{dept === activeAssetForTransfer.department ? `${dept} (Owning Department)` : dept}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Assign To</label>
                    <div className="relative">
                      <select disabled={!isFounderScope} value={transferForm.assignedToType} onChange={(e: ChangeEvent<HTMLSelectElement>) => setTransferForm((prev) => ({ ...prev, assignedToType: e.target.value, assignedToUserId: '', assignedTo: e.target.value === 'department' ? prev.department : '', quantity: e.target.value === 'employee' ? '1' : prev.quantity }))} className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all appearance-none cursor-pointer">
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
                    <input type="number" min={1} max={transferForm.assignedToType === 'employee' ? 1 : (isFounderScope ? activeAssetForTransfer.availableQuantity : departmentAvailableQuantity(activeAssetForTransfer, transferForm.department))} disabled={transferForm.assignedToType === 'employee'} value={transferForm.assignedToType === 'employee' ? '1' : transferForm.quantity} onChange={(e: ChangeEvent<HTMLInputElement>) => setTransferForm((prev) => ({ ...prev, quantity: e.target.value }))} className="w-full px-3 py-2 bg-white disabled:bg-slate-50 border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]" />
                    <p className="text-[10px] text-slate-400">Available: {isFounderScope ? activeAssetForTransfer.availableQuantity : departmentAvailableQuantity(activeAssetForTransfer, transferForm.department)} unit(s)</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">{isFounderScope ? 'Reason for Transfer' : 'Assignment Note'}</label>
                    <textarea rows={2} value={transferForm.transferReason} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTransferForm((prev) => ({ ...prev, transferReason: e.target.value }))} placeholder="Optional reason..." className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-slate-600 outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-none transition-all placeholder:text-slate-400" />
                  </div>
                </div>
              </div>


            </div>

            <div className="pt-4 sm:pt-6 p-4 sm:p-6 border-t border-slate-200/60 bg-white shrink-0 flex gap-3 flex-col-reverse sm:flex-row sm:justify-center">
              <button onClick={() => setShowTransferDialog(false)} className="w-full sm:w-auto px-6 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase">CANCEL</button>
              <button onClick={handleTransferAsset} disabled={isSaving || !transferForm.department || !transferForm.quantity || Number(transferForm.quantity) < 1 || Number(transferForm.quantity) > (isFounderScope ? activeAssetForTransfer.availableQuantity : departmentAvailableQuantity(activeAssetForTransfer, transferForm.department)) || (transferForm.assignedToType === 'employee' && !transferForm.assignedToUserId)} className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-indigo-700 active:scale-95 transition-all uppercase disabled:cursor-not-allowed disabled:opacity-70">{isSaving ? 'SAVING...' : isFounderScope ? 'TRANSFER' : 'ASSIGN'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
