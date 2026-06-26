import { useEffect, useMemo, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { getAssets } from '../../services/assets';
import { ShieldCheck, Wrench, Box, Package, Building2, MapPin, Search } from 'lucide-react';

interface Asset {
  recordId?: string;
  id?: string;
  name: string;
  category?: string;
  status?: string;
  department?: string;
  assignedTo?: string;
  assignedToUserId?: string | null;
  location?: string;
  serialNumber?: string;
  brandModel?: string;
}

function normalizeAsset(asset: any): Asset {
  return {
    ...asset,
    id: asset.id || asset.assetCode || asset.recordId,
    assignedTo: asset.assignedTo || 'Unassigned',
    assignedToUserId: asset.assignedToUserId || null,
  };
}

function StatusBadge({ status }: { status?: string }) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-green-50 text-green-600 border border-green-200 rounded-lg text-[10px] font-black uppercase tracking-wider"><ShieldCheck size={12} /> Active</span>;
    case 'maintenance':
      return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-wider"><Wrench size={12} /> In Maintenance</span>;
    case 'decommissioned':
      return <span className="flex items-center gap-1 w-max px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider"><Box size={12} /> Decommissioned</span>;
    default:
      return null;
  }
}

export function AssignedAssetsTab() {
  const { auth } = useAuth();
  const userId = auth?.user?._id || '';
  const userFullName = auth?.user?.firstName ? `${auth.user.firstName} ${auth.user.lastName}`.trim() : '';

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    async function load() {
      try {
        const response = await getAssets();
        const allAssets: Asset[] = (response?.data?.assets || response?.assets || []).map(normalizeAsset);
        if (!mounted) return;
        setAssets(allAssets);
      } catch {
        if (mounted) setAssets([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const myAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesUser = a.assignedToUserId === userId || a.assignedTo === userFullName;
      const matchesSearch = !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.toLowerCase()) || (a.id || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesUser && matchesSearch;
    });
  }, [assets, userId, userFullName, searchQuery]);

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <span className="text-title font-pmedium text-primary uppercase">Assigned Assets</span>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search your assets..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-[#0F172A] placeholder:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#2563EB] outline-none transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : myAssets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 mb-4 border border-slate-100">
            <Package className="text-slate-400" size={24} />
          </div>
          <p className="text-slate-500 font-semibold mb-1">No assets assigned to you</p>
          <p className="text-slate-400 text-[13px]">Assets assigned to you will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {myAssets.map((asset) => (
            <div key={asset.id || asset.recordId} className="bg-white border border-slate-200/60 p-4 sm:p-5 rounded-[20px] shadow-sm flex flex-col gap-3 transition-all hover:shadow-md">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded w-max border border-blue-100">{asset.id}</span>
                  <h3 className="font-semibold text-[#0F172A] text-[13px] sm:text-[14px]">{asset.name}</h3>
                  <p className="text-[12px] text-slate-500 font-medium">{asset.category || '--'}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={asset.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Department</span>
                  <span className="text-[11px] font-semibold text-[#0F172A] truncate flex items-center gap-1" title={asset.department}>
                    <Building2 size={10} className="text-slate-400 shrink-0" /> {asset.department || '--'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Location</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate flex items-center gap-1" title={asset.location}>
                    <MapPin size={10} className="text-slate-400 shrink-0" /> {asset.location || '--'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
