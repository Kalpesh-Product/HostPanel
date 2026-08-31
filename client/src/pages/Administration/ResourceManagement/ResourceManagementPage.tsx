import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import PageFrame from '@/components/Pages/PageFrame';
import { ResourceManagementSkeleton } from '@/components/ui/Skeleton';
import { createResource, deleteResource, getResources, updateResource } from '@/services/resources';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  Edit2,
  Eye,
  ChevronDown,
  LayoutGrid,
  Loader2,
  Mic,
  Monitor,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  Users,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import useWorkspacePreferences from '@/hooks/useWorkspacePreferences';
import { formatWorkspaceCurrency } from '@/lib/workspaceLocalization';

// ── Types ──────────────────────────────────────────────────────────────────

interface Resource {
  recordId?: string;
  id?: string;
  resourceCode?: string;
  _id?: string;
  name?: string;
  type?: string;
  resourceCategory?: string;
  inventoryMode?: string;
  location?: string;
  floor?: string;
  wing?: string;
  locationLabel?: string;
  capacity?: number;
  pricing?: string;
  pricePerHour?: number;
  pricePerDay?: number;
  credits?: number;
  description?: string;
  status?: string;
  currentlyBooked?: boolean;
  history?: Array<Record<string, unknown>>;
  assignedTenantCompanyId?: string | null;
  assignedTenantCompanyName?: string;
  createdAt?: string | number | Date;
}

interface FormState {
  name: string;
  type: string;
  resourceCategory: string;
  inventoryMode: string;
  location: string;
  floor: string;
  wing: string;
  capacity: string;
  description: string;
  status: string;
}

interface BulkUploadSummary {
  fileName: string;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  failedCount: number;
  failedRows: string[];
}

interface Stats {
  total: number;
  active: number;
  maintenance: number;
  disabled: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const resourceCategoryOptions = [
  { value: 'open_desk', label: 'Open Desk' },
  { value: 'cabin_desk', label: 'Cabin Desk' },
  { value: 'meeting_room', label: 'Meeting Room' },
  { value: 'conference_room', label: 'Conference Room' },
  { value: 'virtual_office', label: 'Virtual Office' },
];

const inventoryModeOptions = [
  { value: 'area', label: 'Area Block' },
  { value: 'single', label: 'Single Desk' },
];

const statusOptions = ['Active', 'Under Maintenance', 'Disabled'];
const floorFallbacks = ['', '', ''];
const wingOptions = ['', ''];

const areaCapacityOptions: Record<string, number[]> = {
  open_desk: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  cabin_desk: [4, 6, 8, 10],
  virtual_office: [1, 2, 3, 4, 5],
};

const BULK_TEMPLATE_HEADERS = [
  'name',
  'resourceCategory',
  'inventoryMode',
  'location',
  'floor',
  'wing',
  'capacity',
  'description',
  'status',
];

const BULK_COLUMN_ALIASES: Record<string, string[]> = {
  name: ['name', 'resource name', 'resource', 'label'],
  resourceCategory: ['resourcecategory', 'resource category', 'category', 'resource type'],
  type: ['type'],
  inventoryMode: ['inventorymode', 'inventory mode', 'inventory', 'mode'],
  location: ['location', 'site', 'area'],
  floor: ['floor', 'level'],
  wing: ['wing', 'block', 'section'],
  capacity: ['capacity', 'seats', 'seat count', 'pax'],
  description: ['description', 'amenities', 'notes'],
  status: ['status', 'state'],
};

const initialFormState: FormState = {
  name: '',
  type: '',
  resourceCategory: '',
  inventoryMode: '',
  location: '',
  floor: '',
  wing: '',
  capacity: '6',
  description: '',
  status: 'Active',
};

const ADD_NEW_OPTION = '__add_new__';

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeResource(resource: Partial<Resource> = {}): Resource {
  const floor = String(resource.floor || '').trim() || '';
  const wing = String(resource.wing || '').trim().toUpperCase();
  const locationArea = [floor, wing].filter(Boolean).join(' ').trim();
  const location = String(resource.location || locationArea).trim();
  const inventoryMode = normalizeInventoryModeForCategory(
    resource.resourceCategory || '',
    resource.inventoryMode || '',
    resource.capacity || 1,
  );
  return {
    ...resource,
    recordId: resource.recordId || resource._id || resource.id || resource.resourceCode,
    id: resource.id || resource.resourceCode || '',
    resourceCode: resource.resourceCode || resource.id || '',
    name: resource.name || '',
    type: resource.type || 'Desk',
    resourceCategory: resource.resourceCategory || '',
    inventoryMode,
    assignedTenantCompanyId: resource.assignedTenantCompanyId || null,
    assignedTenantCompanyName: resource.assignedTenantCompanyName || '',
    location,
    floor,
    wing,
    locationLabel: [location, locationArea].filter(Boolean).join(' • ').trim(),
    capacity: Number(resource.capacity || 1),
    pricing: resource.pricing || '',
    pricePerHour: Number(resource.pricePerHour || 0),
    pricePerDay: Number(resource.pricePerDay || 0),
    credits: Number(resource.credits || 1),
    description: resource.description || '',
    status: resource.status || 'Active',
    currentlyBooked: Boolean(resource.currentlyBooked),
    history: Array.isArray(resource.history) ? resource.history : [],
  };
}

function statusBadge(status?: string): React.ReactNode {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md text-[10px] font-pmedium uppercase tracking-wider">
        <CheckCircle2 size={12} /> Active
      </span>
    );
  }
  if (status === 'Under Maintenance') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[10px] font-pmedium uppercase tracking-wider">
        <AlertTriangle size={12} /> Maintenance
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-md text-[10px] font-pmedium uppercase tracking-wider">
      <XCircle size={12} /> Disabled
    </span>
  );
}

function FormSectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Icon size={16} /></span>
      <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">{label}</span>
    </h4>
  );
}

function typeIcon(type?: string): React.ReactNode {
  if (type === 'Open Desk') return <Monitor size={16} />;
  if (type === 'Meeting Room') return <Users size={16} />;
  if (type === 'Conference Room') return <Mic size={16} />;
  if (type === 'Cabin Desk') return <Building2 size={16} />;
  if (type === 'Virtual Office') return <Building2 size={16} />;
  return <LayoutGrid size={16} />;
}

function getResourceCategoryLabel(value = ''): string {
  return resourceCategoryOptions.find((option) => option.value === value)?.label || 'Unassigned';
}

function deriveResourceTypeFromCategory(category = ''): string {
  if (!category) return '';
  if (category === 'open_desk') return 'Open Desk';
  if (category === 'cabin_desk') return 'Cabin Desk';
  if (category === 'conference_room') return 'Conference Room';
  if (category === 'virtual_office') return 'Virtual Office';
  return 'Meeting Room';
}

function getLocationLabel(resource: Resource = {}): string {
  const location = String(resource.location || '').trim();
  const floor = String(resource.floor || '').trim();
  const wing = String(resource.wing || '').trim();
  const locationArea = [floor, wing].filter(Boolean).join(' ').trim();
  return [location, locationArea].filter(Boolean).join(' • ').trim();
}

function getInventoryModeLabel(value = ''): string {
  return inventoryModeOptions.find((option) => option.value === value)?.label || 'Area Block';
}

function normalizeInventoryModeForCategory(category = '', inventoryMode = 'area', capacity = 1): string {
  if (category === 'virtual_office') return 'single';
  if (category === 'cabin_desk') return 'area';
  const normalizedMode = String(inventoryMode || '').trim().toLowerCase();
  if (normalizedMode === 'area' || normalizedMode === 'single') return normalizedMode;
  if (category === 'open_desk') return Number(capacity || 0) > 1 ? 'area' : 'single';
  return 'area';
}

function getCreditSummary(resource: Resource = {}): string {
  const capacity = Math.max(1, Number(resource.capacity || 1));
  const credits = Math.max(1, Number(resource.credits || 1));
  const resourceCategory = resource.resourceCategory || '';
  const inventoryMode = resource.inventoryMode || 'area';

  if (isDeskCategory(resourceCategory)) {
    if (inventoryMode === 'single') {
      return `${credits} credit${credits === 1 ? '' : 's'} for 1 fixed desk`;
    }
    const totalCredits = capacity * credits;
    return `${capacity} seats x ${credits} credit${credits === 1 ? '' : 's'} = ${totalCredits} credits`;
  }

  return `${credits} credit${credits === 1 ? '' : 's'} / hr`;
}

function getCreditValue(resource: Resource = {}): number {
  const capacity = Math.max(1, Number(resource.capacity || 1));
  const credits = Math.max(1, Number(resource.credits || 1));
  if (isDeskCategory(resource.resourceCategory) && resource.inventoryMode === 'area') {
    return capacity * credits;
  }
  return credits;
}

function isDeskCategory(category = ''): boolean {
  return category === 'open_desk' || category === 'cabin_desk' || category === 'virtual_office';
}

function isPerPersonPricingCategory(category = ''): boolean {
  return category === 'open_desk' || category === 'cabin_desk';
}

function getCapacityOptions(category = '', inventoryMode = 'area'): number[] {
  if (!isDeskCategory(category)) return [];
  if (category === 'virtual_office') return areaCapacityOptions[category] || [1, 2, 3, 4, 5];
  if (category === 'cabin_desk') return areaCapacityOptions[category] || [];
  if (inventoryMode === 'single') return [1];
  return areaCapacityOptions[category] || [];
}

function normalizeCapacityForSelection(category = '', inventoryMode = 'area', capacity = '1'): string {
  const options = getCapacityOptions(category, inventoryMode);
  const parsedCapacity = Number(capacity || 1);
  if (options.length === 0) return String(Math.max(1, Math.trunc(parsedCapacity) || 1));
  if (options.includes(parsedCapacity)) return String(parsedCapacity);
  return String(options[0]);
}

function normalizeBulkHeader(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function resolveBulkCellValue(row: Record<string, unknown>, aliases: string[] = []): string {
  const entries = Object.entries(row || {});
  const normalizedEntries = entries.map(([key, value]) => [normalizeBulkHeader(key), value] as [string, unknown]);

  for (const alias of aliases) {
    const normalizedAlias = normalizeBulkHeader(alias);
    const match = normalizedEntries.find(([key]) => key === normalizedAlias);
    if (match && String(match[1] ?? '').trim()) return String(match[1]);
  }

  return '';
}

function normalizeBulkCategory(value = '', fallback = ''): string {
  const normalized = String(value || fallback || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('open') || normalized === 'desk') return 'open_desk';
  if (normalized.includes('cabin')) return 'cabin_desk';
  if (normalized.includes('conference') || normalized.includes('board')) return 'conference_room';
  if (normalized.includes('meeting')) return 'meeting_room';
  if (normalized.includes('virtual')) return 'virtual_office';
  const allowed = resourceCategoryOptions.map((option) => option.value);
  return allowed.includes(normalized) ? normalized : '';
}

function normalizeBulkInventoryMode(value = '', category = '', capacity = 1): string {
  const normalized = String(value || '').trim().toLowerCase();
  const normalizedCategory = normalizeBulkCategory(category);
  if (normalizedCategory === 'virtual_office') return 'single';
  if (normalizedCategory === 'cabin_desk') return 'area';
  if (normalized === 'area' || normalized === 'single') return normalized;
  const seatCount = Number(capacity || 0);
  if (normalizedCategory === 'open_desk') return seatCount > 1 ? 'area' : 'single';
  return 'area';
}

function normalizeBulkWing(value = ''): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.toUpperCase().replace(/^WING\s+/i, '');
}

function normalizeBulkStatus(value = ''): string {
  const normalized = String(value || '').trim().toLowerCase();
  const status = statusOptions.find((option) => option.toLowerCase() === normalized);
  return status || 'Active';
}

function normalizeBulkCapacity(value: unknown): number {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
}

function isBulkRowEmpty(row: Record<string, unknown> = {}): boolean {
  return !Object.values(row).some((value) => String(value ?? '').trim());
}

function buildBulkResourcePayload(row: Record<string, unknown>): { payload: Partial<Resource> | null; error?: string } {
  const name = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.name)).trim();
  if (!name) return { payload: null, error: 'Missing resource name.' };

  const rawCategory = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.resourceCategory);
  const rawType = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.type);
  const resourceCategory = normalizeBulkCategory(rawCategory, rawType);
  if (!resourceCategory) return { payload: null, error: 'Missing or invalid resource category.' };

  const capacityValue = normalizeBulkCapacity(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.capacity));
  if (!capacityValue) return { payload: null, error: 'Missing or invalid capacity.' };

  const inventoryMode = normalizeBulkInventoryMode(
    resolveBulkCellValue(row, BULK_COLUMN_ALIASES.inventoryMode),
    resourceCategory,
    capacityValue,
  );

  const rawInventoryMode = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.inventoryMode)).trim().toLowerCase();
  if (resourceCategory === 'cabin_desk' && rawInventoryMode.includes('single')) {
    return { payload: null, error: 'Cabin desks can only be imported as area blocks.' };
  }

  const allowedCapacities = getCapacityOptions(resourceCategory, inventoryMode);
  if (allowedCapacities.length > 0 && !allowedCapacities.includes(capacityValue)) {
    return {
      payload: null,
      error: `Capacity must be ${allowedCapacities.join(', ')} for this category and inventory mode.`,
    };
  }

  const rawWing = resolveBulkCellValue(row, BULK_COLUMN_ALIASES.wing);
  const wing = normalizeBulkWing(rawWing);
  const location = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.location)).trim();
  const floorValue = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.floor)).trim();
  const description = String(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.description)).trim();

  if (!location) return { payload: null, error: 'Missing location.' };

  return {
    payload: {
      name,
      type: deriveResourceTypeFromCategory(resourceCategory),
      resourceCategory,
      inventoryMode: resourceCategory === 'virtual_office' ? 'single' : inventoryMode,
      location,
      floor: floorValue || floorFallbacks[0],
      wing,
      capacity: capacityValue,
      description,
      status: normalizeBulkStatus(resolveBulkCellValue(row, BULK_COLUMN_ALIASES.status)),
    },
  };
}

async function readSpreadsheetRows(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const name = String(file?.name || '').toLowerCase();
  const isCsv = name.endsWith('.csv');
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// ── Error Boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ResourceManagementErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ResourceManagementPage] render error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <AppShell>
          <div className="overflow-x-hidden p-2 lg:p-2.5">
            <PageFrame>
              <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-red-50 p-3 text-red-600">
                    <ShieldAlert size={28} />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-black tracking-tight text-red-900">
                      Resource Management crashed while rendering
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-600">
                      The page hit a render-time error. The details below should help us identify the
                      cause immediately.
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-red-600">
                    Error message
                  </p>
                  <p className="mt-2 text-sm font-semibold text-red-900">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>

                {this.state.error?.stack ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                      Stack trace
                    </p>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700">
                      {this.state.error.stack}
                    </pre>
                  </div>
                ) : null}

                {this.state.errorInfo?.componentStack ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                      Component stack
                    </p>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                ) : null}
              </div>
            </PageFrame>
          </div>
        </AppShell>
      );
    }

    return this.props.children;
  }
}

// ── Inner Page Component ───────────────────────────────────────────────────

function ResourceManagementPageInner() {
  const workspacePreferences = useWorkspacePreferences();
  const wsMoney = (value: number) => formatWorkspaceCurrency(Number(value || 0), workspacePreferences.currency, { maximumFractionDigits: 0 });
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  const [floorFilter, setFloorFilter] = useState('All Floors');
  const [wingFilter, setWingFilter] = useState('All Wings');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkUploadFileName, setBulkUploadFileName] = useState('');
  const [bulkUploadSummary, setBulkUploadSummary] = useState<BulkUploadSummary | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [isTemplateInfoOpen, setIsTemplateInfoOpen] = useState(false);
  const [isAllowedValuesOpen, setIsAllowedValuesOpen] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [locationMode, setLocationMode] = useState<'select' | 'custom'>('select');
  const [floorMode, setFloorMode] = useState<'select' | 'custom'>('select');
  const [wingMode, setWingMode] = useState<'select' | 'custom'>('select');

  useEffect(() => {
    let active = true;

    async function loadResources() {
      try {
        const response = await getResources();
        if (!active) return;
        const list = response?.data?.data?.resources || response?.data?.resources || [];
        setResources(list.map(normalizeResource));
      } catch (error: any) {
        if (active) setErrorMessage(error?.message || 'Failed to load resources.');
      } finally {
        if (active) setIsInitialLoading(false);
      }
    }

    loadResources();
    return () => { active = false; };
  }, []);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(resources.map((resource) => String(resource.location || '').trim()).filter(Boolean)));
  }, [resources]);

  const availableFloors = useMemo(() => {
    const floors = Array.from(new Set(resources.map((resource) => resource.floor).filter(Boolean)));
    return floors.length > 0 ? floors : floorFallbacks;
  }, [resources]);

  const availableWings = useMemo(() => {
    const wings = Array.from(new Set(resources.map((resource) => resource.wing).filter(Boolean)));
    return wings.length > 0 ? wings : wingOptions;
  }, [resources]);

  const filteredResources = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return resources
      .filter((resource) => {
        const locationLabel = resource.locationLabel || [resource.floor, resource.wing].filter(Boolean).join(' ').trim();
        const matchesSearch =
          !query ||
          [resource.id, resource.name, resource.type, resource.resourceCategory, resource.floor, resource.wing, locationLabel]
            .filter(Boolean)
            .some((value) => value?.toString().toLowerCase().includes(query));
        return (
          matchesSearch &&
          (categoryFilter === 'All Categories' || resource.resourceCategory === categoryFilter) &&
          (floorFilter === 'All Floors' || resource.floor === floorFilter) &&
          (wingFilter === 'All Wings' || resource.wing === wingFilter) &&
          (statusFilter === 'All Status' || resource.status === statusFilter)
        );
      })
      .sort((a, b) => {
        const aActive = a.status === 'Active' ? 1 : 0;
        const bActive = b.status === 'Active' ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      });
  }, [resources, searchQuery, categoryFilter, floorFilter, wingFilter, statusFilter]);

  const stats: Stats = useMemo(
    () => ({
      total: resources.length,
      active: resources.filter((resource) => resource.status === 'Active').length,
      maintenance: resources.filter((resource) => resource.status === 'Under Maintenance').length,
      disabled: resources.filter((resource) => resource.status === 'Disabled').length,
    }),
    [resources],
  );

  function clearFilters(): void {
    setCategoryFilter('All Categories');
    setFloorFilter('All Floors');
    setWingFilter('All Wings');
    setStatusFilter('All Status');
  }

  function openAddModal(): void {
    setEditingResource(null);
    setForm(initialFormState);
    setLocationMode('select');
    setFloorMode('select');
    setWingMode('select');
    setIsEditorOpen(true);
  }

  function openEditModal(resource: Resource): void {
    const inventoryMode = normalizeInventoryModeForCategory(
      resource.resourceCategory || '',
      resource.inventoryMode || '',
      resource.capacity || 1,
    );
    setEditingResource(resource);
    setForm({
      name: resource.name || '',
      type: resource.type || '',
      resourceCategory: resource.resourceCategory || 'open_desk',
      inventoryMode,
      location: resource.location || '',
      floor: resource.floor || '',
      wing: resource.wing || '',
      capacity: normalizeCapacityForSelection(resource.resourceCategory || 'open_desk', inventoryMode, String(resource.capacity)),
      description: resource.description || '',
      status: resource.status || 'Active',
    });
    setLocationMode(availableLocations.includes(resource.location || '') ? 'select' : 'custom');
    setFloorMode(availableFloors.includes(resource.floor || '') ? 'select' : 'custom');
    setWingMode(!resource.wing || availableWings.includes(resource.wing || '') ? 'select' : 'custom');
    setIsEditorOpen(true);
  }

  function closeEditor(): void {
    setIsEditorOpen(false);
    setEditingResource(null);
    setForm(initialFormState);
    setLocationMode('select');
    setFloorMode('select');
    setWingMode('select');
  }

  const capacityOptions = useMemo(
    () => getCapacityOptions(form.resourceCategory, form.inventoryMode),
    [form.inventoryMode, form.resourceCategory],
  );

  const selectedDeskCapacity = useMemo(
    () => normalizeCapacityForSelection(form.resourceCategory, form.inventoryMode, form.capacity),
    [form.capacity, form.inventoryMode, form.resourceCategory],
  );

  const isSingleDeskInventory = form.resourceCategory === 'open_desk' && form.inventoryMode === 'single';

  async function downloadBulkTemplate(): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const templateRow = Object.fromEntries(BULK_TEMPLATE_HEADERS.map((header) => [header, '']));
    const worksheet = XLSX.utils.json_to_sheet([templateRow]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resources');

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        resourceCategoryOptions.map((option) => ({
          Category: option.value,
          Label: option.label,
        })),
      ),
      'Allowed Categories',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        inventoryModeOptions.map((option) => ({
          InventoryMode: option.value,
          Label: option.label,
        })),
      ),
      'Allowed Inventory Modes',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(floorFallbacks.map((floor) => ({ 'Allowed Floor': floor }))),
      'Allowed Floors',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(wingOptions.map((wing) => ({ 'Allowed Wing': wing }))),
      'Allowed Wings',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(statusOptions.map((status) => ({ 'Allowed Status': status }))),
      'Allowed Status',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Field: 'name', Requirement: 'Required', Notes: 'Enter the resource name.' },
        { Field: 'resourceCategory', Requirement: 'Required', Notes: 'Use one of the allowed categories.' },
        { Field: 'location', Requirement: 'Required', Notes: 'Location label shown in dropdowns and cards.' },
        { Field: 'capacity', Requirement: 'Required', Notes: 'Seats or capacity, based on the category.' },
        { Field: 'inventoryMode', Requirement: 'Optional', Notes: 'Use area or single for open desk only. Cabin desk must be area.' },
        { Field: 'floor', Requirement: 'Optional', Notes: 'Floor label as configured for this company.' },
        { Field: 'wing', Requirement: 'Optional', Notes: 'Any short wing label, or leave blank.' },
        { Field: 'description', Requirement: 'Optional', Notes: 'Amenities or notes.' },
        { Field: 'status', Requirement: 'Optional', Notes: 'Use one of the allowed statuses.' },
      ]),
      'Required Fields',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Category: 'open_desk', InventoryMode: 'area', Capacity: '1-10', Notes: 'Seat blocks from 1 to 10.' },
        { Category: 'open_desk', InventoryMode: 'single', Capacity: '1', Notes: 'Single desk inventory.' },
        { Category: 'cabin_desk', InventoryMode: 'area', Capacity: '4, 6, 8, 10', Notes: 'Cabin desk blocks only. Single cabin desks are not allowed.' },
        { Category: 'meeting_room', InventoryMode: 'area', Capacity: 'Any number', Notes: 'Use room capacity.' },
        { Category: 'conference_room', InventoryMode: 'area', Capacity: 'Any number', Notes: 'Use room capacity.' },
        { Category: 'virtual_office', InventoryMode: 'single', Capacity: '1', Notes: 'Always 1 seat.' },
      ]),
      'Capacity Guide',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        { Field: 'name', Format: 'Text', Example: 'Open Desk Bay 2', Notes: 'Use the display name.' },
        { Field: 'resourceCategory', Format: 'Text', Example: 'open_desk', Notes: 'Match an allowed category value.' },
        { Field: 'inventoryMode', Format: 'Text', Example: 'area', Notes: 'Optional for desk categories.' },
        { Field: 'location', Format: 'Text', Example: 'North Tower', Notes: 'Required display location.' },
        { Field: 'floor', Format: 'Text', Example: 'Floor label', Notes: 'Keep as text.' },
        { Field: 'wing', Format: 'Text', Example: 'Short wing label', Notes: 'Any short wing label, or blank.' },
        { Field: 'capacity', Format: 'Number', Example: 6, Notes: 'Seat count or capacity.' },
        { Field: 'description', Format: 'Text', Example: 'Near window, dual monitor setup.', Notes: 'Optional.' },
        { Field: 'status', Format: 'Text', Example: 'Active', Notes: 'Use one of the allowed statuses.' },
      ]),
      'Format Guide',
    );

    XLSX.writeFile(workbook, 'resource-management-template.xlsx');
    alert('Template downloaded as resource-management-template.xlsx');
  }

  function handleBulkUploadClick(): void {
    setBulkUploadSummary(null);
    setBulkUploadFileName('');
    setIsBulkUploadOpen(true);
  }

  async function handleBulkFileSelected(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setErrorMessage('');
    setIsBulkImporting(true);
    setBulkUploadSummary(null);
    setBulkUploadFileName(file.name);

    try {
      const rows = await readSpreadsheetRows(file);
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('The file does not contain any resource rows.');
      }

      const importRows = rows
        .map((row, index) => ({ row, index: index + 2 }))
        .filter(({ row }) => !isBulkRowEmpty(row));

      if (importRows.length === 0) {
        throw new Error('No valid resource rows were found. Make sure each row has a name, category, and capacity.');
      }

      let createdCount = 0;
      const failedRows: string[] = [];

      for (const { row, index } of importRows) {
        const { payload, error } = buildBulkResourcePayload(row);
        if (!payload) {
          failedRows.push(`Row ${index}: ${error || 'invalid row.'}`);
          continue;
        }

        try {
          const response = await createResource(payload as unknown as Record<string, unknown>);
          const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
          if (saved?.recordId) {
            setResources((current) => [saved, ...current]);
            createdCount += 1;
          } else {
            failedRows.push(`Row ${index}: resource was not returned by the server.`);
          }
        } catch {
          failedRows.push(`Row ${index}: failed to import.`);
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to import resources right now.');
    } finally {
      setIsBulkImporting(false);
    }
  }

  async function handleSave(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        type: form.type || deriveResourceTypeFromCategory(form.resourceCategory),
        resourceCategory: form.resourceCategory,
        inventoryMode: form.resourceCategory === 'virtual_office' ? 'single' : form.inventoryMode,
        location: form.location.trim(),
        floor: form.floor.trim(),
        wing: form.wing.trim(),
        capacity: Number(form.capacity),
        description: form.description.trim(),
        status: form.status,
      };

      if (editingResource) {
        const response = await updateResource(editingResource.recordId!, payload);
        const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
        setResources((current) => current.map((r) => (r.recordId === saved.recordId ? saved : r)));
      } else {
        const response = await createResource(payload);
        const saved = normalizeResource(response?.data?.data?.resource || response?.data?.resource);
        setResources((current) => [saved, ...current]);
      }

      closeEditor();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to save resource.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deletingResource || deletingResource.currentlyBooked) return;

    setIsSaving(true);
    setErrorMessage('');
    try {
      await deleteResource(deletingResource.recordId!);
      setResources((current) => current.filter((r) => r.recordId !== deletingResource.recordId));
      setDeletingResource(null);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Unable to delete resource.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="overflow-x-hidden p-2 lg:p-2.5">
        <input
          ref={bulkUploadInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleBulkFileSelected}
        />

        <PageFrame>
          <div className="flex flex-col gap-4">

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase">Resource Management</h1>
              <p className="text-xs font-pmedium text-slate-500 mt-1">
                Manage floor-by-floor inventory for open desks, cabin desks, meeting rooms, conference rooms, and virtual offices.
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 flex items-center gap-2">
              <AlertTriangle size={14} /> {errorMessage}
            </div>
          ) : null}

          {bulkUploadSummary ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={14} /> Imported {bulkUploadSummary.createdCount} of {bulkUploadSummary.processedRows} resources from {bulkUploadSummary.fileName}.
              {bulkUploadSummary.failedCount > 0 ? ` ${bulkUploadSummary.failedCount} row(s) failed.` : ''}
            </div>
          ) : null}

          {isInitialLoading ? <ResourceManagementSkeleton /> : null}

          {/* ── Stat Cards (DESIGN.md: border-l-4 accent per card) ── */}
          <div data-tour="admin-resource-summary" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 shrink-0">
            {[
              { key: 'total', label: 'Total Resources', value: String(stats.total), icon: LayoutGrid },
              { key: 'active', label: 'Active', value: String(stats.active), icon: CheckCircle2 },
              { key: 'maintenance', label: 'Under Maintenance', value: String(stats.maintenance), icon: Wrench },
              { key: 'disabled', label: 'Disabled', value: String(stats.disabled), icon: ShieldAlert },
            ].map((card, idx) => {
              const Icon = card.icon;
              const borderColors = ['', 'border-l-4 border-l-blue-500', 'border-l-4 border-l-emerald-500', 'border-l-4 border-l-amber-500', 'border-l-4 border-l-slate-500'];
              const iconClasses = ['bg-slate-50 text-slate-600', 'bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-600', 'bg-slate-100 text-slate-500'];
              return (
                <div key={card.key} className={`bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center transition-all hover:shadow-md ${borderColors[idx] || ''}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] font-pmedium text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
                    <p className="text-[15px] font-pmedium text-slate-900">{card.value}</p>
                  </div>
                  <div className={`p-2 rounded-2xl ${iconClasses[idx] || 'bg-slate-50 text-slate-600'} shrink-0`}>
                    <Icon size={16} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Data Panel ── */}
          <div className="flex flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm min-h-[500px]">
            {/* ── Panel Header ── */}
            <div className="p-3 sm:p-4 lg:p-5 border-b border-slate-100/60 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3 sm:gap-4 bg-slate-50/50">
              {/* LEFT: status sub-tab pills */}
              <div data-tour="admin-resource-tabs" className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                {['All Status', ...statusOptions].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-pmedium whitespace-nowrap transition-all ${
                      statusFilter === status
                        ? 'bg-[#2563EB] text-white shadow-sm shadow-blue-200'
                        : 'bg-slate-100/70 text-slate-500 hover:bg-slate-200/70 hover:text-slate-700'
                    }`}
                  >
                    {status === 'All Status' ? 'All' : status}
                  </button>
                ))}
              </div>

              {/* RIGHT: search + primary actions */}
              <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    data-tour="admin-resource-search"
                    type="text"
                    placeholder="Search by name, ID, category, or location"
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBulkUploadClick}
                  className="group relative p-2.5 rounded-xl bg-white border border-slate-200/60 hover:bg-slate-100 hover:border-slate-500 text-slate-500 transition-all active:scale-95 shadow-sm"
                >
                  <UploadCloud size={13} />
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full text-[8px] font-pmedium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-500 text-white px-1.5 py-0.5 rounded">BULK UPLOAD</span>
                </button>
                <button
                  onClick={openAddModal}
                  data-tour="admin-resource-add-btn"
                  className="bg-[#2563EB] text-white px-4 py-2.5 rounded-2xl font-pmedium text-[10px] flex items-center gap-1.5 shadow-sm hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap"
                >
                  <Plus size={13} strokeWidth={3} /> ADD RESOURCE
                </button>
              </div>
            </div>

            {/* ── Filters Row ── */}
            <div data-tour="admin-resource-filters" className="border-b border-slate-100 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 items-end">
                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Category</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option>All Categories</option>
                    {resourceCategoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Floor</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    value={floorFilter}
                    onChange={(event) => setFloorFilter(event.target.value)}
                  >
                    <option>All Floors</option>
                    {availableFloors.map((floor) => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Wing</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[12px] font-pmedium text-slate-700 focus:bg-white focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all cursor-pointer"
                    value={wingFilter}
                    onChange={(event) => setWingFilter(event.target.value)}
                  >
                    <option>All Wings</option>
                    {availableWings.map((wing) => (
                      <option key={wing} value={wing}>{wing}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  <X size={14} /> Reset Filters
                </button>
              </div>
            </div>

            {filteredResources.length > 0 ? (
              <>
                <div className="grid gap-3 p-3 xl:hidden">
                  {filteredResources.map((resource) => (
                    <div key={resource.recordId} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="shrink-0 rounded-xl bg-slate-100 p-2.5 text-blue-600">
                            {typeIcon(resource.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-[13px] font-black tracking-tight text-slate-900">{resource.name}</h3>
                            <p className="mt-1 truncate text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{resource.id || resource.recordId}</p>
                            <p className="mt-1 truncate text-[10px] font-pmedium uppercase tracking-widest text-blue-600">{getLocationLabel(resource) || 'Unassigned location'}</p>
                          </div>
                        </div>
                        {statusBadge(resource.status)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5 text-[12px]">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Category</p>
                          <p className="mt-1 font-bold text-slate-900">{getResourceCategoryLabel(resource.resourceCategory)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Inventory</p>
                          <p className="mt-1 font-bold text-slate-900">{isDeskCategory(resource.resourceCategory) ? getInventoryModeLabel(resource.inventoryMode) : 'Not applicable'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Capacity</p>
                          <p className="mt-1 font-bold text-slate-900">{resource.capacity} Pax</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Credits</p>
                          <p className="mt-1 font-black text-slate-900">{getCreditValue(resource)}</p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">
                          {isPerPersonPricingCategory(resource.resourceCategory) ? 'Pricing Per Person' : 'Pricing'}
                        </p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-700">
                          {resource.pricePerHour && resource.pricePerHour > 0
                            ? `${wsMoney(resource.pricePerHour)} / hr${isPerPersonPricingCategory(resource.resourceCategory) ? ' / person' : ''}`
                            : resource.pricing || 'Pricing pending'}
                        </p>
                        <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                          {resource.pricePerDay && resource.pricePerDay > 0
                            ? `${wsMoney(resource.pricePerDay)} / day${isPerPersonPricingCategory(resource.resourceCategory) ? ' / person' : ''}`
                            : 'Daily rate not set'}
                        </p>
                      </div>

                      {resource.currentlyBooked ? (
                        <p className="mt-3 text-[10px] font-pmedium uppercase tracking-widest text-amber-600">Currently booked</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button title="View Details" onClick={() => setViewingResource(resource)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">
                          <Eye size={16} />
                        </button>
                        <button title="Edit Resource" onClick={() => openEditModal(resource)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                          <Edit2 size={16} />
                        </button>
                        <button title="Delete Resource" onClick={() => setDeletingResource(resource)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden xl:block flex-1 overflow-x-auto">
                  <table data-tour="admin-resource-table" className="w-full text-left">
                    <thead className="text-[10px] font-pmedium text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100 bg-white">
                      <tr>
                        <th className="px-3.5 py-2 w-8 text-center">#</th>
                        <th className="px-3.5 py-2">Resource</th>
                        <th className="px-3.5 py-2">Category</th>
                        <th className="px-3.5 py-2">Inventory</th>
                        <th className="px-3.5 py-2">Floor</th>
                        <th className="px-3.5 py-2">Wing</th>
                        <th className="px-3.5 py-2">Capacity</th>
                        <th className="px-3.5 py-2">Hourly</th>
                        <th className="px-3.5 py-2">Daily</th>
                        <th className="px-3.5 py-2">Credits</th>
                        <th className="px-3.5 py-2 text-center">Status</th>
                        <th className="px-3.5 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredResources.map((resource, index) => (
                        <tr key={resource.recordId} className="transition-all hover:bg-blue-50/30">
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-500 text-center">{index + 1}</td>
                          <td className="px-3.5 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="shrink-0 rounded-xl bg-slate-100 p-2 text-blue-600 leading-none">
                                {typeIcon(resource.type)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-pmedium text-slate-900 truncate max-w-[150px]">{resource.name}</p>
                                <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">{resource.id || resource.recordId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">{getResourceCategoryLabel(resource.resourceCategory)}</td>
                          <td className="px-3.5 py-2">
                            {isDeskCategory(resource.resourceCategory) ? (
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest ${resource.inventoryMode === 'area'
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}>
                                {getInventoryModeLabel(resource.inventoryMode)}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">
                                Not applicable
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{resource.floor || '--'}</td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700">{resource.wing || '--'}</td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">{resource.capacity} Pax</td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">
                            {resource.pricePerHour && resource.pricePerHour > 0
                              ? `${wsMoney(resource.pricePerHour)}${isPerPersonPricingCategory(resource.resourceCategory) ? ' / person' : ''}`
                              : resource.pricing || '--'}
                          </td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-700 whitespace-nowrap">
                            {resource.pricePerDay && resource.pricePerDay > 0
                              ? `${wsMoney(resource.pricePerDay)}${isPerPersonPricingCategory(resource.resourceCategory) ? ' / person' : ''}`
                              : '--'}
                          </td>
                          <td className="px-3.5 py-2 text-[12px] font-pmedium text-slate-900 text-center">{getCreditValue(resource)}</td>
                          <td className="px-3.5 py-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {statusBadge(resource.status)}
                              {resource.currentlyBooked ? (
                                <div className="w-2 h-2 rounded-full bg-amber-500" title="Currently booked" />
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3.5 py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <button title="View Details" onClick={() => setViewingResource(resource)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">
                                <Eye size={14} />
                              </button>
                              <button title="Edit Resource" onClick={() => openEditModal(resource)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">
                                <Edit2 size={14} />
                              </button>
                              <button title="Delete Resource" onClick={() => setDeletingResource(resource)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="m-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-sm font-pmedium uppercase tracking-widest text-slate-500">No resources found</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Try clearing the filters or add a new desk, meeting room, conference room, cabin, or virtual office.
                </p>
              </div>
            )}
          </div>
          </div>
        </PageFrame>

        {/* ── Add / Edit Resource Modal ─────────────────────────────────── */}
        {isEditorOpen ? (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              onClick={(event) => event.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl w-full h-[92vh] sm:h-auto sm:max-h-[95vh] sm:max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-pmedium text-primary tracking-tight truncate">
                    {editingResource ? 'Edit Resource' : 'Add New Resource'}
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-2 truncate">
                    {editingResource ? 'Update the workspace record' : 'Create inventory for bookings and workspace planning'}
                  </p>
                </div>
                <button type="button" onClick={closeEditor} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm shrink-0">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
                <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <FormSectionHeader icon={Monitor} label="Resource Details" />

                    <div className="space-y-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Resource Name *</label>
                      <input
                        required
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Location *</label>
                        {locationMode === 'custom' ? (
                          <div className="space-y-2">
                            <input
                              required
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                              value={form.location}
                              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                              placeholder="Enter new location"
                            />
                            <button type="button" onClick={() => { setLocationMode('select'); setForm((current) => ({ ...current, location: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">
                              Back to dropdown
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              required
                              className="w-full appearance-none cursor-pointer pl-3 pr-8 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                              value={form.location || ''}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                if (nextValue === ADD_NEW_OPTION) {
                                  setLocationMode('custom');
                                  setForm((current) => ({ ...current, location: '' }));
                                  return;
                                }
                                setForm((current) => ({ ...current, location: nextValue }));
                              }}
                            >
                              <option value="">Select location</option>
                              {availableLocations.map((location) => (
                                <option key={location} value={location}>{location}</option>
                              ))}
                              <option value={ADD_NEW_OPTION}>Add new location</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Category *</label>
                        <select
                          required
                          className="w-full cursor-pointer px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                          value={form.resourceCategory}
                          onChange={(event) =>
                            setForm((current) => {
                              const nextCategory = event.target.value;
                              const nextInventoryMode = nextCategory === 'virtual_office'
                                ? 'single'
                                : nextCategory === 'cabin_desk'
                                  ? 'area'
                                  : isDeskCategory(nextCategory)
                                    ? ''
                                    : 'area';
                              return {
                                ...current,
                                resourceCategory: nextCategory,
                                type: deriveResourceTypeFromCategory(nextCategory),
                                inventoryMode: nextInventoryMode,
                                capacity: normalizeCapacityForSelection(nextCategory, nextInventoryMode, nextCategory === 'virtual_office' ? '1' : current.capacity),
                              };
                            })
                          }
                        >
                          <option value="">Select category</option>
                          {resourceCategoryOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      {form.resourceCategory === 'open_desk' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Inventory *</label>
                          <div className="relative">
                            <select
                              required
                              className="w-full appearance-none cursor-pointer pl-3 pr-8 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                              value={form.inventoryMode}
                              onChange={(event) =>
                                setForm((current) => {
                                  const nextInventoryMode = event.target.value;
                                  return {
                                    ...current,
                                    inventoryMode: nextInventoryMode,
                                    capacity: normalizeCapacityForSelection(current.resourceCategory, nextInventoryMode, nextInventoryMode === 'single' ? '1' : current.capacity),
                                  };
                                })
                              }
                            >
                              <option value="">Select inventory</option>
                              {inventoryModeOptions.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Floor *</label>
                        {floorMode === 'custom' ? (
                          <div className="space-y-2">
                            <input
                              required
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                              value={form.floor}
                              onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))}
                              placeholder="Enter new floor"
                            />
                            <button type="button" onClick={() => { setFloorMode('select'); setForm((current) => ({ ...current, floor: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">
                              Back to dropdown
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              required
                              className="w-full appearance-none cursor-pointer pl-3 pr-8 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                              value={form.floor || ''}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                if (nextValue === ADD_NEW_OPTION) {
                                  setFloorMode('custom');
                                  setForm((current) => ({ ...current, floor: '' }));
                                  return;
                                }
                                setForm((current) => ({ ...current, floor: nextValue }));
                              }}
                            >
                              <option value="">Select floor</option>
                              {availableFloors.map((floor) => (
                                <option key={floor} value={floor}>{floor}</option>
                              ))}
                              <option value={ADD_NEW_OPTION}>Add new floor</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Wing</label>
                        {wingMode === 'custom' ? (
                          <div className="space-y-2">
                            <input
                              className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                              value={form.wing}
                              onChange={(event) => setForm((current) => ({ ...current, wing: event.target.value }))}
                              placeholder="Enter new wing or leave blank"
                            />
                            <button type="button" onClick={() => { setWingMode('select'); setForm((current) => ({ ...current, wing: '' })); }} className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">
                              Back to dropdown
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              className="w-full appearance-none cursor-pointer pl-3 pr-8 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                              value={form.wing || ''}
                              onChange={(event) => {
                                const nextValue = event.target.value;
                                if (nextValue === ADD_NEW_OPTION) {
                                  setWingMode('custom');
                                  setForm((current) => ({ ...current, wing: '' }));
                                  return;
                                }
                                setForm((current) => ({ ...current, wing: nextValue }));
                              }}
                            >
                              <option value="">Select wing</option>
                              {availableWings.map((wing) => (
                                <option key={wing} value={wing}>{wing}</option>
                              ))}
                              <option value={ADD_NEW_OPTION}>Add new wing</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
                          {isDeskCategory(form.resourceCategory) ? 'Seats *' : 'Capacity *'}
                        </label>
                        {isDeskCategory(form.resourceCategory) && capacityOptions.length > 0 ? (
                          <div className="space-y-1.5">
                            <div className="relative">
                              <select
                                required
                                disabled={isSingleDeskInventory}
                                className="w-full appearance-none cursor-pointer pl-3 pr-8 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                value={selectedDeskCapacity}
                                onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                              >
                                {capacityOptions.map((option) => (
                                  <option key={option} value={String(option)}>
                                    {option} {isSingleDeskInventory && option === 1 ? 'desk fixed' : option === 1 ? 'desk' : 'seats'}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            </div>
                            {isSingleDeskInventory ? (
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[12px] font-pmedium text-emerald-800">
                                Single desks are fixed to 1 desk, so this value cannot be changed.
                              </div>
                            ) : null}
                            {!isSingleDeskInventory && !capacityOptions.includes(Number(form.capacity)) ? (
                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-pmedium text-amber-800">
                                Legacy value: {form.capacity} seats
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <input
                            required
                            type="number"
                            placeholder="Enter capacity for this resource"
                            min="1"
                            className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                            value={form.capacity}
                            onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                          />
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                      {form.resourceCategory === 'open_desk'
                        ? form.inventoryMode === 'single'
                          ? 'Single open desks are reserved for individual bookings.'
                          : 'Open desk areas are saved as 1 through 10 seat blocks.'
                        : form.resourceCategory === 'cabin_desk'
                          ? 'Cabin desk areas are saved as 4, 6, 8, or 10 seat blocks.'
                          : 'Keep the capacity aligned with the resource layout used on the floor.'}
                    </p>

                    <div className="space-y-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Description / Amenities</label>
                      <textarea
                        rows={3}
                        className="w-full resize-none px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400"
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                    <FormSectionHeader icon={CheckCircle2} label="Status & Availability" />
                    <div className="space-y-1">
                      <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Status</label>
                      <select
                        required
                        className="w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                        value={form.status}
                        onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                  <button type="button" onClick={closeEditor} className="flex-1 px-6 py-2.5 rounded-xl font-pmedium text-[10px] uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving} className="flex-1 px-6 py-2.5 bg-[#2563EB] text-white rounded-xl font-pmedium text-[10px] uppercase tracking-wider shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5">
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {isSaving ? 'Saving...' : editingResource ? 'Update Resource' : 'Create Resource'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* ── View Resource Modal ───────────────────────────────────────── */}
        {viewingResource ? (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              onClick={(event) => event.stopPropagation()}
              className="bg-white/95 backdrop-blur-xl w-full h-[92vh] sm:h-auto sm:max-h-[95vh] sm:max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0"></div>

              <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-pmedium text-primary tracking-tight truncate">View Resource Details</h2>
                  <p className="text-[9px] sm:text-[10px] font-pmedium text-slate-500 uppercase tracking-widest mt-2 truncate">
                    Viewing resource details in read-only mode.
                  </p>
                </div>
                <button onClick={() => setViewingResource(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-all shadow-sm shrink-0">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50/30">
                <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Resource</p>
                      <h3 className="mt-1 text-lg font-pmedium text-slate-900">{viewingResource.name}</h3>
                      <p className="mt-0.5 text-[12px] font-pmedium text-slate-600">{viewingResource.id || viewingResource.recordId} &bull; {getResourceCategoryLabel(viewingResource.resourceCategory)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {statusBadge(viewingResource.status)}
                      {viewingResource.currentlyBooked ? (
                        <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-pmedium uppercase tracking-widest text-amber-700">
                          Currently booked
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <FormSectionHeader icon={Monitor} label="Resource Details" />
                  <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Category</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 text-[12px] font-pmedium text-slate-900">
                        {typeIcon(viewingResource.type)}
                        {getResourceCategoryLabel(viewingResource.resourceCategory)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Inventory</dt>
                      <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">
                        {isDeskCategory(viewingResource.resourceCategory) ? getInventoryModeLabel(viewingResource.inventoryMode) : 'Not applicable'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Location</dt>
                      <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{getLocationLabel(viewingResource) || '--'}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Floor / Wing</dt>
                      <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">Floor {viewingResource.floor || '--'} / Wing {viewingResource.wing || '--'}</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Capacity</dt>
                      <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewingResource.capacity} Pax</dd>
                    </div>
                    <div>
                      <dt className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Tenant Assignment</dt>
                      <dd className="mt-0.5 text-[12px] font-pmedium text-slate-900">{viewingResource.assignedTenantCompanyName || 'Unassigned'}</dd>
                    </div>
                  </dl>
                  <div className="space-y-1">
                    <p className="text-[9px] font-pmedium uppercase tracking-widest text-slate-400">Description</p>
                    <p className="text-[12px] font-pmedium text-slate-700">{viewingResource.description || 'No description added yet.'}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <FormSectionHeader icon={LayoutGrid} label="Pricing & Credits (set by Sales)" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">
                        {isPerPersonPricingCategory(viewingResource.resourceCategory) ? 'Hourly / Person' : 'Hourly'}
                      </p>
                      <p className="mt-1 text-[13px] font-pmedium text-emerald-700">
                        {viewingResource.pricePerHour && viewingResource.pricePerHour > 0 ? wsMoney(viewingResource.pricePerHour) : viewingResource.pricing || 'Not set'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-emerald-600">
                        {isPerPersonPricingCategory(viewingResource.resourceCategory) ? 'Daily / Person' : 'Daily'}
                      </p>
                      <p className="mt-1 text-[13px] font-pmedium text-emerald-700">
                        {viewingResource.pricePerDay && viewingResource.pricePerDay > 0 ? wsMoney(viewingResource.pricePerDay) : 'Not set'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                      <p className="text-[9px] font-pmedium uppercase tracking-widest text-indigo-600">Credits</p>
                      <p className="mt-1 text-[13px] font-pmedium text-indigo-700">{getCreditValue(viewingResource)}</p>
                    </div>
                  </div>
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">{getCreditSummary(viewingResource)}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                  <FormSectionHeader icon={CheckCircle2} label="Status & Availability" />
                  <div>{statusBadge(viewingResource.status)}</div>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-white border-t border-slate-100 shrink-0 flex gap-3">
                <button type="button" onClick={() => setViewingResource(null)} className="flex-1 px-6 py-2.5 rounded-xl font-pmedium text-[10px] uppercase tracking-wider bg-[#2563EB] text-white shadow-sm hover:bg-blue-700 transition-all">
                  Close Details
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Delete Resource Modal ─────────────────────────────────────── */}
        {deletingResource ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-red-50/70 p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-100 p-3 text-red-600">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-red-900">Delete Resource</h2>
                    <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-red-500">{deletingResource.id}</p>
                  </div>
                </div>
                <button onClick={() => setDeletingResource(null)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-8">
                {deletingResource.currentlyBooked ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
                    <ShieldAlert className="mx-auto mb-3 text-red-500" size={32} />
                    <h4 className="mb-1 text-sm font-black text-red-900">Deletion Blocked by System</h4>
                    <p className="text-xs font-medium leading-relaxed text-red-700">
                      This resource is currently booked and cannot be deleted until the active booking is cleared.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 shrink-0 text-slate-500" size={20} />
                      <p className="text-xs font-medium leading-relaxed text-slate-600">
                        Are you sure you want to permanently delete{' '}
                        <span className="font-bold text-slate-900">{deletingResource.name}</span>?
                        This will remove it from the workspace resource registry.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 border-t border-slate-100 bg-slate-50/30 p-6">
                <button onClick={() => setDeletingResource(null)} className="flex-1 rounded-2xl bg-white py-4 font-black text-slate-500 transition-all hover:text-slate-900">
                  {deletingResource.currentlyBooked ? 'Close' : 'Cancel'}
                </button>
                {!deletingResource.currentlyBooked ? (
                  <button onClick={handleDelete} className="flex-1 rounded-2xl bg-red-600 py-4 font-pmedium text-white shadow-sm transition-all hover:bg-red-700">
                    Confirm Delete
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Bulk Upload Modal ─────────────────────────────────────────── */}
        {isBulkUploadOpen ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-2xl max-h-[85vh] flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-blue-50/70 p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-pmedium text-primary tracking-tight">
                    <UploadCloud size={20} /> Bulk Upload Resources
                  </h2>
                  <p className="mt-1 text-[10px] font-pmedium uppercase tracking-widest text-slate-500">Import resources from Excel or CSV</p>
                </div>
                <button onClick={() => setIsBulkUploadOpen(false)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto bg-slate-50/60 p-5">
                <button
                  type="button"
                  onClick={() => setIsTemplateInfoOpen(!isTemplateInfoOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition-all hover:bg-blue-100"
                >
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Template required</p>
                  <ChevronDown
                    size={16}
                    className={`text-blue-500 transition-transform duration-200 ${isTemplateInfoOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {isTemplateInfoOpen ? (
                  <div className="space-y-4 pl-2">
                    <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                      <p className="text-sm font-semibold text-blue-800">
                        Download the template first to avoid validation errors. Cabin desks are area blocks only, so single cabin rows will be rejected.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400 mb-2">Fields (from Add Resource form)</p>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-pmedium text-red-600">Required</span>
                          <span className="font-semibold text-slate-700">name, location, resourceCategory, floor, capacity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-pmedium text-amber-600">Conditional</span>
                          <span className="font-semibold text-slate-700">inventoryMode (for open desks)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-pmedium text-slate-500">Optional</span>
                          <span className="font-semibold text-slate-700">wing, description, status</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setIsAllowedValuesOpen(!isAllowedValuesOpen)}
                  className="flex w-full items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition-all hover:bg-blue-100"
                >
                  <p className="text-[10px] font-pmedium uppercase tracking-widest text-blue-600">Allowed values</p>
                  <ChevronDown
                    size={16}
                    className={`text-blue-500 transition-transform duration-200 ${isAllowedValuesOpen ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                {isAllowedValuesOpen ? (
                  <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-blue-800 leading-6">
                      Categories: {resourceCategoryOptions.map((option) => `${option.label} (${option.value})`).join(', ')}
                      <br />
                      Inventory: {inventoryModeOptions.map((option) => option.value).join(', ')}
                      <br />
                      Wings: suggested values {wingOptions.join(', ')} or your own custom label
                      <br />
                      Status: {statusOptions.join(', ')}
                    </p>
                    <p className="mt-2 text-xs font-medium text-blue-700">
                      Capacity rules: open desk area = 1-10, cabin desk area = 4/6/8/10, single desk = 1, virtual office = 1.
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={downloadBulkTemplate} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm flex-1 py-3 text-sm font-black inline-flex items-center justify-center gap-2 transition-all hover:border-blue-200 hover:text-blue-600">
                    <Download size={16} /> Download Template
                  </button>
                  <button
                    type="button"
                    onClick={() => bulkUploadInputRef.current?.click()}
                    disabled={isBulkImporting}
                    className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-pmedium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none inline-flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={16} /> {isBulkImporting ? 'Importing...' : 'Choose File'}
                  </button>
                </div>

                {bulkUploadFileName ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">Selected file</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{bulkUploadFileName}</p>
                  </div>
                ) : null}

                {bulkUploadSummary ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-[10px] font-pmedium uppercase tracking-widest text-emerald-600">Import summary</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-pmedium uppercase text-slate-400">Rows</p>
                        <p className="mt-1 font-bold text-slate-900">{bulkUploadSummary.totalRows}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-pmedium uppercase text-slate-400">Processed</p>
                        <p className="mt-1 font-bold text-slate-900">{bulkUploadSummary.processedRows}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-pmedium uppercase text-slate-400">Created</p>
                        <p className="mt-1 font-bold text-emerald-700">{bulkUploadSummary.createdCount}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-pmedium uppercase text-slate-400">Failed</p>
                        <p className="mt-1 font-bold text-rose-700">{bulkUploadSummary.failedCount}</p>
                      </div>
                    </div>
                    {bulkUploadSummary.failedRows?.length ? (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-pmedium uppercase tracking-widest text-slate-400">First errors</p>
                        <ul className="mt-2 space-y-1 text-xs font-medium text-slate-600">
                          {bulkUploadSummary.failedRows.map((rowError) => (
                            <li key={rowError}>{rowError}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 bg-white p-5 sm:flex-row">
                <button type="button" onClick={() => setIsBulkUploadOpen(false)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm flex-1 py-3 text-sm font-pmedium transition-all hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

// ── Exported Page Component ────────────────────────────────────────────────

export default function ResourceManagementPage() {
  return (
    <ResourceManagementErrorBoundary>
      <ResourceManagementPageInner />
    </ResourceManagementErrorBoundary>
  );
}
