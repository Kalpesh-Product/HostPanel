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
  Edit,
  Eye,
  ChevronDown,
  LayoutGrid,
  Mic,
  Monitor,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  UploadCloud,
  Users,
  Wrench,
  X,
} from 'lucide-react';

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
const floorFallbacks = ['501', '601', '701'];
const wingOptions = ['A', 'B'];

const areaCapacityOptions: Record<string, number[]> = {
  open_desk: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  cabin_desk: [4, 6, 8, 10],
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
  floor: '501',
  wing: '',
  capacity: '6',
  description: '',
  status: 'Active',
};

const ADD_NEW_OPTION = '__add_new__';

// ── Helpers ────────────────────────────────────────────────────────────────

function normalizeResource(resource: Partial<Resource> = {}): Resource {
  const floor = String(resource.floor || '501').trim() || '501';
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

function statusClass(status?: string): string {
  if (status === 'Active') return 'bg-green-50 text-green-600 border-green-200';
  if (status === 'Under Maintenance') return 'bg-amber-50 text-amber-600 border-amber-200';
  if (status === 'Disabled') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-slate-50 text-slate-600 border-slate-200';
}

function typeIcon(type?: string): React.ReactNode {
  if (type === 'Desk') return <Monitor size={16} />;
  if (type === 'Meeting Room') return <Users size={16} />;
  if (type === 'Conference Room') return <Mic size={16} />;
  if (type === 'Cabin') return <Building2 size={16} />;
  if (type === 'Virtual Office') return <Building2 size={16} />;
  return <LayoutGrid size={16} />;
}

function getResourceCategoryLabel(value = ''): string {
  return resourceCategoryOptions.find((option) => option.value === value)?.label || 'Unassigned';
}

function deriveResourceTypeFromCategory(category = ''): string {
  if (!category) return '';
  if (category === 'open_desk') return 'Desk';
  if (category === 'cabin_desk') return 'Cabin';
  if (category === 'conference_room') return 'Conference Room';
  if (category === 'virtual_office') return 'Virtual Office';
  return 'Meeting Room';
}

function getLocationLabel(resource: Resource = {}): string {
  const location = String(resource.location || '').trim();
  const floor = String(resource.floor || '501').trim();
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

function getCapacityOptions(category = '', inventoryMode = 'area'): number[] {
  if (!isDeskCategory(category)) return [];
  if (category === 'virtual_office') return [1];
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
      capacity: resourceCategory === 'virtual_office' ? 1 : capacityValue,
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
                    Error message
                  </p>
                  <p className="mt-2 text-sm font-semibold text-red-900">
                    {this.state.error?.message || 'Unknown error'}
                  </p>
                </div>

                {this.state.error?.stack ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Stack trace
                    </p>
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-700">
                      {this.state.error.stack}
                    </pre>
                  </div>
                ) : null}

                {this.state.errorInfo?.componentStack ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
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
      floor: resource.floor || '501',
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
        { Field: 'floor', Requirement: 'Optional', Notes: 'Floor label, for example 501.' },
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
        { Field: 'floor', Format: 'Text', Example: '501', Notes: 'Keep as text.' },
        { Field: 'wing', Format: 'Text', Example: 'A', Notes: 'Any short wing label, or blank.' },
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
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-title font-pmedium text-primary uppercase">Resource Management</h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Manage floor-by-floor inventory for open desks, cabin desks, meeting rooms, conference rooms, and virtual offices.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleBulkUploadClick}
                className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all hover:border-blue-200 hover:text-blue-600"
              >
                <UploadCloud size={16} />
                Bulk Upload
              </button>
              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Resource
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    Resource page error
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6">{errorMessage}</p>
                </div>
              </div>
            </div>
          ) : null}

          {bulkUploadSummary ? (
            <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900 shadow-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={20} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    Bulk upload summary
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6">
                    Imported {bulkUploadSummary.createdCount} of {bulkUploadSummary.processedRows} resources from {bulkUploadSummary.fileName}.
                    {bulkUploadSummary.failedCount > 0 ? ` ${bulkUploadSummary.failedCount} row(s) failed.` : ''}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isInitialLoading ? <ResourceManagementSkeleton /> : null}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Total Resources</p>
              <p className="mt-1 text-title font-pmedium text-primary uppercase">{stats.total}</p>
            </div>
            <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Active</p>
              <p className="mt-1 text-title font-pmedium text-emerald-600 uppercase">{stats.active}</p>
            </div>
            <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Under Maintenance</p>
              <p className="mt-1 text-title font-pmedium text-amber-600 uppercase">{stats.maintenance}</p>
            </div>
            <div className="bg-white p-2.5 rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-xs font-medium text-slate-500">Disabled</p>
              <p className="mt-1 text-title font-pmedium text-slate-600 uppercase">{stats.disabled}</p>
            </div>
          </div>

          <div className="mb-6 grid gap-4 rounded-3xl border border-white bg-white p-5 shadow-sm xl:grid-cols-6">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Search</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search size={18} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID, category, or location"
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 border-none outline-none focus:ring-0 placeholder:text-slate-400"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
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
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Floor</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                value={floorFilter}
                onChange={(event) => setFloorFilter(event.target.value)}
              >
                <option>All Floors</option>
                {availableFloors.map((floor) => (
                  <option key={floor}>{floor}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Wing</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                value={wingFilter}
                onChange={(event) => setWingFilter(event.target.value)}
              >
                <option>All Wings</option>
                {availableWings.map((wing) => (
                  <option key={wing}>{wing}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All Status</option>
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-[36px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource Registry</p>
                <h2 className="mt-1 text-lg font-pmedium text-primary tracking-tight">Company Resources</h2>
              </div>
              <p className="text-sm font-semibold text-slate-500">
                Showing {filteredResources.length} of {resources.length}
              </p>
            </div>

            {filteredResources.length > 0 ? (
              <>
                <div className="grid gap-3 xl:hidden">
                  {filteredResources.map((resource) => (
                    <div key={resource.recordId} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="shrink-0 rounded-xl bg-slate-100 p-2.5 text-blue-600">
                            {typeIcon(resource.type)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-[13px] font-black tracking-tight text-slate-900">{resource.name}</h3>
                            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-slate-400">{resource.id || resource.recordId}</p>
                            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-widest text-blue-600">{getLocationLabel(resource) || 'Unassigned location'}</p>
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] ${statusClass(resource.status)}`}>
                          {resource.status}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2.5 text-[12px]">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Category</p>
                          <p className="mt-1 font-bold text-slate-900">{getResourceCategoryLabel(resource.resourceCategory)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Inventory</p>
                          <p className="mt-1 font-bold text-slate-900">{isDeskCategory(resource.resourceCategory) ? getInventoryModeLabel(resource.inventoryMode) : 'Not applicable'}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Capacity</p>
                          <p className="mt-1 font-bold text-slate-900">{resource.capacity} Pax</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2.5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credits</p>
                          <p className="mt-1 font-black text-slate-900">{getCreditValue(resource)}</p>
                        </div>
                      </div>

                      <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pricing</p>
                        <p className="mt-1 text-[12px] font-semibold text-slate-700">
                          {resource.pricePerHour && resource.pricePerHour > 0
                            ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(resource.pricePerHour)} / hr`
                            : resource.pricing || 'Pricing pending'}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {resource.pricePerDay && resource.pricePerDay > 0
                            ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(resource.pricePerDay)} / day`
                            : 'Daily rate not set'}
                        </p>
                      </div>

                      {resource.currentlyBooked ? (
                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-600">Currently booked</p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button title="View" onClick={() => setViewingResource(resource)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all hover:border-blue-200 hover:text-blue-600">
                          <Eye size={16} />
                        </button>
                        <button title="Edit" onClick={() => openEditModal(resource)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all hover:border-blue-200 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button title="Delete" onClick={() => setDeletingResource(resource)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all hover:border-red-200 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm xl:block">
                  <table className="w-full table-fixed divide-y divide-slate-200">
                    <thead className="bg-white text-[10px] font-bold text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                      <tr>
                        <th className="w-8 px-3.5 py-2 text-center whitespace-nowrap">#</th>
                        <th className="w-1/6 px-3.5 py-2 text-center whitespace-nowrap">Resource</th>
                        <th className="px-3.5 py-2 text-center whitespace-nowrap">Location</th>
                        <th className="px-3.5 py-2 text-center whitespace-nowrap">Category</th>
                        <th className="px-3.5 py-2 text-center whitespace-nowrap">Inventory</th>
                        <th className="w-20 px-3.5 py-2 text-center whitespace-nowrap">Floor</th>
                        <th className="w-14 px-3.5 py-2 text-center whitespace-nowrap">Wing</th>
                        <th className="px-3.5 py-2 text-center whitespace-nowrap">Seating</th>
                        <th className="w-28 px-3.5 py-2 text-center whitespace-nowrap">Status</th>
                        <th className="px-3.5 py-2 text-center whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResources.map((resource, index) => (
                        <tr key={resource.recordId} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-3.5 py-2 text-center text-sm font-bold text-slate-400">{index + 1}</td>
                          <td className="px-3.5 py-2 text-left text-sm font-bold text-slate-900 whitespace-nowrap">{resource.name}</td>
                          <td className="px-3.5 py-2 text-center text-sm font-bold text-slate-900 truncate">
                            {[resource.location, resource.wing].filter(Boolean).join(' - ') || '-'}
                          </td>
                          <td className="px-3.5 py-2 text-center text-sm font-bold text-slate-900 whitespace-nowrap">{getResourceCategoryLabel(resource.resourceCategory)}</td>
                          <td className="px-3.5 py-2 text-center">
                            {isDeskCategory(resource.resourceCategory) ? (
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] ${
                                resource.inventoryMode === 'single'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                              }`}>
                                {getInventoryModeLabel(resource.inventoryMode)}
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">Not applicable</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2 text-center text-sm font-bold text-slate-900 whitespace-nowrap">{resource.floor}</td>
                          <td className="px-3.5 py-2 text-center text-[10px] font-bold text-slate-500 whitespace-nowrap">{resource.wing || '-'}</td>
                          <td className="px-3.5 py-2 text-center text-sm font-bold text-slate-900 whitespace-nowrap">{resource.capacity} Seat</td>
                          <td className="px-3.5 py-2 text-center whitespace-nowrap">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.22em] ${statusClass(resource.status)}`}>
                              {resource.status}
                            </span>
                            {resource.currentlyBooked ? (
                              <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600">Currently booked</p>
                            ) : null}
                          </td>
                          <td className="px-3.5 py-2 text-center">
                            <div className="inline-flex gap-1.5">
                              <button title="View" onClick={() => setViewingResource(resource)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all hover:border-blue-200 hover:text-blue-600">
                                <Eye size={16} />
                              </button>
                              <button title="Edit" onClick={() => openEditModal(resource)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all hover:border-blue-200 hover:text-blue-600">
                                <Edit size={16} />
                              </button>
                              <button title="Delete" onClick={() => setDeletingResource(resource)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm transition-all hover:border-red-200 hover:text-red-600 hover:bg-red-50">
                                <Trash2 size={16} />
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
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">No resources found</p>
                <p className="mt-2 text-sm font-medium text-slate-500">
                  Try clearing the filters or add a new desk, meeting room, conference room, cabin, or virtual office.
                </p>
              </div>
            )}
          </div>
        </PageFrame>

        {/* ── Add / Edit Resource Modal ─────────────────────────────────── */}
        {isEditorOpen ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className="flex h-full max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-6 py-5 lg:px-8 lg:py-6">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-pmedium text-primary tracking-tight">
                    <LayoutGrid size={20} />
                    {editingResource ? 'Edit Resource' : 'Add New Resource'}
                  </h2>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {editingResource ? 'Update the workspace record' : 'Create inventory for bookings and workspace planning'}
                  </p>
                </div>
                <button onClick={closeEditor} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 lg:px-8 lg:py-7">
                  <div className="lg:col-span-2 rounded-3xl border border-slate-100 bg-slate-50/80 px-4 py-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resource snapshot</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">A quick summary of the unit before you save it.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700">
                          {getResourceCategoryLabel(form.resourceCategory)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          {form.location || 'Location pending'}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          Floor {form.floor}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                          Wing {form.wing || 'N/A'}
                        </span>
                        {isDeskCategory(form.resourceCategory) ? (
                          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                            {getInventoryModeLabel(form.inventoryMode)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Resource Name *</label>
                      <input
                        required
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location *</label>
                        {locationMode === 'custom' ? (
                          <div className="space-y-2">
                            <input
                              required
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              value={form.location}
                              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                              placeholder="Enter new location"
                            />
                            <button type="button" onClick={() => { setLocationMode('select'); setForm((current) => ({ ...current, location: '' })); }} className="text-xs font-black uppercase tracking-widest text-blue-600">
                              Back to dropdown
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              required
                              className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category *</label>
                        <select
                          required
                          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Inventory *</label>
                          <div className="relative">
                            <select
                              required
                              className="w-full appearance-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Floor *</label>
                        {floorMode === 'custom' ? (
                          <div className="space-y-2">
                            <input
                              required
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              value={form.floor}
                              onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))}
                              placeholder="Enter new floor"
                            />
                            <button type="button" onClick={() => { setFloorMode('select'); setForm((current) => ({ ...current, floor: '' })); }} className="text-xs font-black uppercase tracking-widest text-blue-600">
                              Back to dropdown
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              required
                              className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                              <option value="">Select floor</option>
                              {availableFloors.map((floor) => (
                                <option key={floor} value={floor}>{floor}</option>
                              ))}
                              <option value={ADD_NEW_OPTION}>Add new floor</option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wing</label>
                        {wingMode === 'custom' ? (
                          <div className="space-y-2">
                            <input
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              value={form.wing}
                              onChange={(event) => setForm((current) => ({ ...current, wing: event.target.value }))}
                              placeholder="Enter new wing or leave blank"
                            />
                            <button type="button" onClick={() => { setWingMode('select'); setForm((current) => ({ ...current, wing: '' })); }} className="text-xs font-black uppercase tracking-widest text-blue-600">
                              Back to dropdown
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              className="w-full appearance-none cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {isDeskCategory(form.resourceCategory) ? 'Seats *' : 'Capacity *'}
                      </label>
                      {isDeskCategory(form.resourceCategory) && capacityOptions.length > 0 ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <select
                              required
                              disabled={isSingleDeskInventory}
                              className="w-full appearance-none cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-10 text-sm font-bold text-slate-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                              value={selectedDeskCapacity}
                              onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                            >
                              {capacityOptions.map((option) => (
                                <option key={option} value={String(option)}>
                                  {option} {isSingleDeskInventory && option === 1 ? 'desk fixed' : option === 1 ? 'desk' : 'seats'}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          </div>
                          {isSingleDeskInventory ? (
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                              Single desks are fixed to 1 desk, so this value cannot be changed.
                            </div>
                          ) : null}
                          {!isSingleDeskInventory && !capacityOptions.includes(Number(form.capacity)) ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
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
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-2 focus:ring-blue-500"
                          value={form.capacity}
                          onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
                        />
                      )}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {form.resourceCategory === 'open_desk'
                          ? form.inventoryMode === 'single'
                            ? 'Single open desks are reserved for individual bookings.'
                            : 'Open desk areas are saved as 1 through 10 seat blocks.'
                          : form.resourceCategory === 'cabin_desk'
                            ? 'Cabin desk areas are saved as 4, 6, 8, or 10 seat blocks.'
                            : 'Keep the capacity aligned with the resource layout used on the floor.'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description / Amenities</label>
                      <textarea
                        rows={4}
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={form.description}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 flex gap-4 border-t border-slate-100 pt-6">
                    <button type="button" onClick={closeEditor} className="flex-1 rounded-2xl bg-slate-100 py-4 font-black text-slate-700 transition-all hover:bg-slate-200">
                      Cancel
                    </button>
                    <button type="submit" className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white shadow-sm transition-all hover:bg-blue-700">
                      <Plus size={18} />
                      {editingResource ? 'Update Resource' : 'Save Resource'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* ── View Resource Modal ───────────────────────────────────────── */}
        {viewingResource ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
            <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl border border-white/70">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-slate-900">{viewingResource.name}</h2>
                    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass(viewingResource.status)}`}>
                      {viewingResource.status}
                    </span>
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {viewingResource.id} - {getResourceCategoryLabel(viewingResource.resourceCategory)}
                  </p>
                </div>
                <button onClick={() => setViewingResource(null)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 p-8 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</p>
                  <p className="flex items-center gap-1.5 font-bold text-slate-900">
                    {typeIcon(viewingResource.type)}
                    {getResourceCategoryLabel(viewingResource.resourceCategory)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Inventory</p>
                  {isDeskCategory(viewingResource.resourceCategory) ? (
                    <>
                      <p className="font-bold text-slate-900">{getInventoryModeLabel(viewingResource.inventoryMode)}</p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {viewingResource.inventoryMode === 'single' ? 'Standalone desk inventory' : 'Tenant area inventory'}
                      </p>
                    </>
                  ) : (
                    <p className="font-bold text-align-center text-slate-900">Not applicable</p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Location</p>
                  <p className="font-bold text-slate-900">{getLocationLabel(viewingResource)}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Floor {viewingResource.floor} / Wing {viewingResource.wing || '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Credits</p>
                  <p className="font-black text-blue-600">{getCreditValue(viewingResource)} Credits</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{getCreditSummary(viewingResource)}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Tenant Assignment</p>
                  <p className="font-bold text-slate-900">{viewingResource.assignedTenantCompanyName || 'Unassigned'}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Sales Pricing</p>
                  <p className="font-black text-green-600">
                    {viewingResource.pricePerHour && viewingResource.pricePerHour > 0
                      ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(viewingResource.pricePerHour)} / hr`
                      : viewingResource.pricing || 'Pricing pending'}
                  </p>
                  <p className="mt-1 font-black text-green-600">
                    {viewingResource.pricePerDay && viewingResource.pricePerDay > 0
                      ? `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(viewingResource.pricePerDay)} / day`
                      : 'Daily rate not set'}
                  </p>
                </div>
                <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Description</p>
                  <p className="text-sm font-medium text-slate-700">{viewingResource.description || 'No description added yet.'}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/30 p-6">
                <button onClick={() => setViewingResource(null)} className="w-full rounded-2xl border border-slate-200 bg-white py-4 font-black text-slate-600 transition-all hover:bg-slate-100">
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
                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-red-500">{deletingResource.id}</p>
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
                  <button onClick={handleDelete} className="flex-1 rounded-2xl bg-red-600 py-4 font-black text-white shadow-sm transition-all hover:bg-red-700">
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
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500">Import resources from Excel or CSV</p>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Template required</p>
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
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fields (from Add Resource form)</p>
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-600">Required</span>
                          <span className="font-semibold text-slate-700">name, location, resourceCategory, floor, capacity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-600">Conditional</span>
                          <span className="font-semibold text-slate-700">inventoryMode (for open desks)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">Optional</span>
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
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Allowed values</p>
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
                    className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none inline-flex items-center justify-center gap-2"
                  >
                    <UploadCloud size={16} /> {isBulkImporting ? 'Importing...' : 'Choose File'}
                  </button>
                </div>

                {bulkUploadFileName ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Selected file</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">{bulkUploadFileName}</p>
                  </div>
                ) : null}

                {bulkUploadSummary ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Import summary</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Rows</p>
                        <p className="mt-1 font-bold text-slate-900">{bulkUploadSummary.totalRows}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Processed</p>
                        <p className="mt-1 font-bold text-slate-900">{bulkUploadSummary.processedRows}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Created</p>
                        <p className="mt-1 font-bold text-emerald-700">{bulkUploadSummary.createdCount}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Failed</p>
                        <p className="mt-1 font-bold text-rose-700">{bulkUploadSummary.failedCount}</p>
                      </div>
                    </div>
                    {bulkUploadSummary.failedRows?.length ? (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">First errors</p>
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
                <button type="button" onClick={() => setIsBulkUploadOpen(false)} className="p-2 bg-white border border-slate-200 text-slate-600 rounded-lg shadow-sm flex-1 py-3 text-sm font-black transition-all hover:bg-slate-50">
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
