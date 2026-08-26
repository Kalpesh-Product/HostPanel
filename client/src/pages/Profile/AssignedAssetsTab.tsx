import { useEffect, useMemo, useState, type FormEvent } from 'react';
import useAuth from '../../hooks/useAuth';
import { getAssets } from '../../services/assets';
import { createTicket } from '../../services/tickets';
import { ShieldCheck, Wrench, Box, Package, Building2, MapPin, Search, Eye, AlertTriangle, X, Loader2 } from 'lucide-react';
import PageFrame from '../../components/Pages/PageFrame';

interface Asset {
  recordId?: string;
  id?: string;
  name: string;
  category?: string;
  status?: string;
  department?: string;
  departmentId?: string | null;
  assignedTo?: string;
  assignedToUserId?: string | null;
  assignedToDepartment?: string;
  location?: string;
  serialNumber?: string;
  brandModel?: string;
  purchaseDate?: string;
  allocations?: Array<{ userId?: string | null; quantity?: number; department?: string }>;
  assignedQuantity?: number;
}

function normalizeAsset(asset: any): Asset {
  return {
    ...asset,
    recordId: asset.recordId || asset._id || asset.id,
    id: asset.id || asset.assetCode || asset.recordId || asset._id,
    assignedTo: asset.assignedTo || 'Unassigned',
    assignedToUserId: asset.assignedToUserId?._id || asset.assignedToUserId || null,
    departmentId: asset.departmentId?._id || asset.departmentId || null,
    allocations: Array.isArray(asset.allocations) ? asset.allocations : [],
  };
}

function displayDate(value?: string): string {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '--';
}

function StatusBadge({ status }: { status?: string }) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-green-50 text-green-600 border border-green-200 rounded-lg text-[10px] font-pmedium uppercase tracking-wider"><ShieldCheck size={12} /> Active</span>;
    case 'maintenance':
    case 'repair':
      return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-pmedium uppercase tracking-wider"><Wrench size={12} /> In Maintenance</span>;
    case 'decommissioned':
    case 'disposed':
      return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-pmedium uppercase tracking-wider"><Box size={12} /> Decommissioned</span>;
    default:
      return null;
  }
}

export function AssignedAssetsTab() {
  const { auth } = useAuth();
  const userId = String(auth?.user?._id || auth?.user?.id || auth?.user?.userId || '');
  const userFullName = String(
    auth?.user?.fullName ||
    auth?.user?.name ||
    [auth?.user?.firstName, auth?.user?.lastName].filter(Boolean).join(' ') ||
    'User',
  ).trim();
  const userDepartment = String(
    auth?.user?.workspaceMembership?.departments?.[0] ||
    auth?.user?.workspaceMembership?.department ||
    auth?.user?.department ||
    '',
  );

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);
  const [issueAsset, setIssueAsset] = useState<Asset | null>(null);
  const [issueForm, setIssueForm] = useState({ title: '', description: '', priority: 'Medium' });
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueSuccess, setIssueSuccess] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    async function load() {
      try {
        const response = await getAssets();
        const allAssets: Asset[] = (response?.data?.assets || response?.assets || []).map(normalizeAsset);
        if (mounted) setAssets(allAssets);
      } catch {
        if (mounted) setAssets([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const myAssets = useMemo(() => assets.map((asset) => {
    const allocationQuantity = (asset.allocations || [])
      .filter((allocation) => String(allocation.userId || '') === userId)
      .reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0);
    const legacyMatch = String(asset.assignedToUserId || '') === userId || asset.assignedTo === userFullName;
    return { ...asset, assignedQuantity: allocationQuantity || (legacyMatch ? 1 : 0) };
  }).filter((asset) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || asset.name.toLowerCase().includes(query) || (asset.id || '').toLowerCase().includes(query);
    return Number(asset.assignedQuantity || 0) > 0 && matchesSearch;
  }), [assets, userId, userFullName, searchQuery]);

  function openIssue(asset: Asset) {
    setIssueAsset(asset);
    setIssueError('');
    setIssueSuccess('');
    setIssueForm({
      title: `Issue with ${asset.name} (${asset.id || 'asset'})`,
      description: '',
      priority: 'Medium',
    });
  }

  async function handleRaiseIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issueAsset?.recordId) return;
    setIssueError('');
    setIssueSuccess('');
    setIsSubmittingIssue(true);
    try {
      const targetDepartment = issueAsset.department || 'Administration';
      const created = await createTicket({
        title: issueForm.title.trim(),
        description: issueForm.description.trim(),
        priority: issueForm.priority,
        department: targetDepartment,
        assignedTo: `${targetDepartment} Queue`,
        submittedBy: userFullName,
        submittedByDept: userDepartment,
        assetId: issueAsset.recordId,
        assetCode: issueAsset.id || '',
        assetName: issueAsset.name,
        assetDepartmentId: issueAsset.departmentId || null,
        assetAssignedTo: userFullName,
      });
      setIssueSuccess(`Issue ${created?.ticketCode || ''} raised successfully.`.trim());
      setIssueForm((current) => ({ ...current, description: '' }));
    } catch (error: any) {
      setIssueError(error?.response?.data?.message || error?.message || 'Unable to raise this issue right now.');
    } finally {
      setIsSubmittingIssue(false);
    }
  }

  return (
    <PageFrame>
    <div>
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">My Assigned Assets</span>
      </div>

      <div className="relative mb-4" data-tour="assigned-assets-search">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input type="text" placeholder="Search by asset name or number..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-[#0F172A] placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all shadow-sm" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 bg-white rounded-xl border border-slate-100 animate-pulse" />)}</div>
      ) : myAssets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100"><Package className="text-slate-400" size={24} /></div>
          <p className="text-slate-500 font-semibold mb-1">No assets assigned to you</p>
          <p className="text-slate-400 text-[13px]">Assets assigned directly to you will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3" data-tour="assigned-assets-cards">
          {myAssets.map((asset) => (
            <div key={asset.recordId || asset.id} className="bg-white border border-slate-200/60 p-4 rounded-[18px] shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-[10px] font-pmedium text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{asset.id || '--'}</span>
                  <h3 className="font-semibold text-[#0F172A] text-[14px] mt-2 truncate">{asset.name}</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{asset.category || '--'}</p>
                </div>
                <StatusBadge status={asset.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 font-pmedium uppercase tracking-wider block mb-0.5">Owning Department</span>
                  <span className="text-[11px] font-semibold text-[#0F172A] truncate flex items-center gap-1" title={asset.department}><Building2 size={10} className="text-slate-400 shrink-0" /> {asset.department || '--'}</span>
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 font-pmedium uppercase tracking-wider block mb-0.5">Assigned Quantity</span>
                  <span className="text-[11px] font-semibold text-blue-700">{asset.assignedQuantity || 1} unit(s)</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setViewingAsset(asset)} className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-[10px] font-pmedium uppercase flex items-center justify-center gap-1.5 hover:border-blue-200 hover:text-blue-700 transition-colors"><Eye size={13} /> View</button>
                <button type="button" disabled title="Issue reporting will be enabled later" className="flex-1 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-pmedium uppercase flex items-center justify-center gap-1.5 opacity-70 cursor-not-allowed"><AlertTriangle size={13} /> Raise Issue</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingAsset && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div><span className="text-[10px] font-pmedium text-blue-600">{viewingAsset.id}</span><h3 className="text-[16px] font-pmedium text-slate-900 mt-1">{viewingAsset.name}</h3></div>
              <button type="button" onClick={() => setViewingAsset(null)} className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center hover:text-red-500"><X size={16} /></button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px] ">
              {[
                ['Asset Number', viewingAsset.id || '--'],
                ['Category', viewingAsset.category || '--'],
                ['Assigned Quantity', String(viewingAsset.assignedQuantity || 1) + ' unit(s)'],
                ['Serial Number', viewingAsset.serialNumber || '--'],
                ['Brand / Model', viewingAsset.brandModel || '--'],
                ['Owning Department', viewingAsset.department || '--'],
                ['Assigned To', viewingAsset.assignedTo || '--'],
                ['Location', viewingAsset.location || '--'],
                ['Purchase Date', displayDate(viewingAsset.purchaseDate)],
              ].map(([label, value]) => <div key={label}><span className="text-[9px] font-pmedium text-slate-400 uppercase tracking-wider block mb-0.5">{label}</span><span className="font-pmedium text-slate-700 break-words">{value}</span></div>)}
            </div>
          </div>
        </div>
      )}

      {issueAsset && (
        <div className="fixed inset-0 z-[170] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm">
          <form onSubmit={handleRaiseIssue} className="w-full sm:max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-pmedium text-amber-600 uppercase tracking-wider">Raise Asset Issue</p><h3 className="text-[15px] font-pmedium text-slate-900 mt-1">{issueAsset.name} · {issueAsset.id}</h3></div>
              <button type="button" disabled={isSubmittingIssue} onClick={() => setIssueAsset(null)} className="w-9 h-9 rounded-full border border-slate-200 text-slate-500 flex items-center justify-center hover:text-red-500 disabled:opacity-50"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3">
              {issueError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-600">{issueError}</div>}
              {issueSuccess && <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[11px] text-green-700">{issueSuccess}</div>}
              <div><label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-wider block mb-1">Issue Title *</label><input required maxLength={180} value={issueForm.title} onChange={(event) => setIssueForm((current) => ({ ...current, title: event.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" /></div>
              <div><label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-wider block mb-1">Priority</label><select value={issueForm.priority} onChange={(event) => setIssueForm((current) => ({ ...current, priority: event.target.value }))} className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"><option>Low</option><option>Medium</option><option>High</option></select></div>
              <div><label className="text-[9px] font-pmedium text-slate-500 uppercase tracking-wider block mb-1">Describe the Issue *</label><textarea required minLength={5} maxLength={3000} rows={4} value={issueForm.description} onChange={(event) => setIssueForm((current) => ({ ...current, description: event.target.value }))} placeholder="Explain what is wrong with this asset..." className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-[12px] outline-none resize-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500" /></div>
              <p className="text-[10px] text-slate-400">This issue will be linked to the asset and sent to the {issueAsset.department || 'Administration'} queue.</p>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2 justify-end"><button type="button" disabled={isSubmittingIssue} onClick={() => setIssueAsset(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[10px] font-pmedium text-slate-600 uppercase disabled:opacity-50">Cancel</button><button type="submit" disabled={isSubmittingIssue || Boolean(issueSuccess)} className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-[10px] font-pmedium uppercase flex items-center gap-1.5 disabled:opacity-60">{isSubmittingIssue && <Loader2 size={13} className="animate-spin" />}{isSubmittingIssue ? 'Submitting...' : issueSuccess ? 'Issue Raised' : 'Raise Issue'}</button></div>
          </form>
        </div>
      )}
    </div>
    </PageFrame>
  );
}
