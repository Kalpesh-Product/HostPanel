import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronRight, FileText } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useDashboardAccess from "../hooks/useDashboardAccess";
import { isModuleAllowedForMember } from "../routes/ModuleAccessGuard";
import { ROUTE_BY_ID } from "./Sidebar";

interface SearchDestination {
  title: string;
  route: string;
  moduleId: string;
  section: string;
  searchText: string;
}

const RECENT_HISTORY_LIMIT = 3;
const RECENT_HISTORY_KEY_PREFIX = "hostpanel:header-search:recent:";

const readRecentHistory = (storageKey: string | null): string[] => {
  if (!storageKey) return [];
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    return Array.isArray(stored)
      ? [...new Set(stored.filter((route) => typeof route === "string"))].slice(0, RECENT_HISTORY_LIMIT)
      : [];
  } catch {
    return [];
  }
};

const writeRecentHistory = (storageKey: string | null, routes: string[]) => {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(routes));
  } catch {
    // Search navigation still works if browser storage is unavailable.
  }
};

const getMatchRank = (destination: SearchDestination, query: string): number => {
  const title = destination.title.toLowerCase();
  if (title === query) return 0;
  if (title.startsWith(query)) return 1;
  if (title.split(/\s+/).some((word) => word.startsWith(query))) return 2;
  if (title.includes(query)) return 3;
  if (destination.section.toLowerCase().includes(query)) return 4;
  return 5;
};

// Derives every searchable page directly from the same module catalog that
// feeds the sidebar (useDashboardAccess's moduleMap), instead of a
// hand-maintained duplicate list that could drift out of sync. Each
// candidate is filtered through isModuleAllowedForMember — the exact same
// check ModuleAccessGuard uses to protect direct-URL access — so a page the
// user can't reach can never appear as a result.
const buildAuthorizedDestinations = ({
  moduleMap,
  roleBand,
  grantedModuleIds,
  workspaceEnabledModuleIds,
  plan,
}: {
  moduleMap: { sections: Array<{ sectionLabel?: string; items?: any[] }> };
  roleBand: string;
  grantedModuleIds: Set<string>;
  workspaceEnabledModuleIds: string[];
  plan: string;
}): SearchDestination[] => {
  const destinationsByRoute = new Map<string, SearchDestination>();

  (moduleMap?.sections || []).forEach((section) => {
    const sectionLabel = String(section?.sectionLabel || "").trim();
    (section?.items || []).forEach((item: any) => {
      const candidates = Array.isArray(item?.tabs) && item.tabs.length > 0 ? item.tabs : [item];
      candidates.forEach((candidate: any) => {
        const moduleId = String(candidate?.id || "").trim();
        if (!moduleId) return;

        const route = String(candidate?.route || ROUTE_BY_ID[moduleId] || "").trim();
        if (!route || route.includes(":") || destinationsByRoute.has(route)) return;

        if (
          !isModuleAllowedForMember(
            { moduleId, roleBand: roleBand as any, grantedModuleIds, workspaceEnabledModuleIds },
            plan as any,
          )
        ) {
          return;
        }

        const title = String(candidate?.label || moduleId).trim();
        destinationsByRoute.set(route, {
          title,
          route,
          moduleId,
          section: sectionLabel,
          searchText: `${title} ${sectionLabel}`.toLowerCase(),
        });
      });
    });
  });

  return Array.from(destinationsByRoute.values()).sort((a, b) => a.title.localeCompare(b.title));
};

const HeaderSearchPalette = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const { plan, roleBand, grantedModuleIds, workspaceEnabledModuleIds, moduleMap, isLoading } =
    useDashboardAccess();

  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [historyRoutes, setHistoryRoutes] = useState<string[]>([]);

  const userId = (auth?.user as any)?.id || (auth?.user as any)?._id || "";
  const historyStorageKey = userId ? `${RECENT_HISTORY_KEY_PREFIX}${userId}` : null;

  const authorizedDestinations = useMemo(
    () => buildAuthorizedDestinations({ moduleMap, roleBand, grantedModuleIds, workspaceEnabledModuleIds, plan }),
    [moduleMap, roleBand, grantedModuleIds, workspaceEnabledModuleIds, plan],
  );

  useEffect(() => {
    if (!historyStorageKey) {
      setHistoryRoutes([]);
      return;
    }
    const authorizedRoutes = new Set(authorizedDestinations.map((d) => d.route));
    const stored = readRecentHistory(historyStorageKey);
    const filtered = stored.filter((route) => authorizedRoutes.has(route));
    if (filtered.length !== stored.length) writeRecentHistory(historyStorageKey, filtered);
    setHistoryRoutes(filtered);
  }, [authorizedDestinations, historyStorageKey]);

  const recentDestinations = useMemo(() => {
    const destinationByRoute = new Map(authorizedDestinations.map((d) => [d.route, d]));
    return historyRoutes.map((route) => destinationByRoute.get(route)).filter(Boolean) as SearchDestination[];
  }, [authorizedDestinations, historyRoutes]);

  const filteredDestinations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recentDestinations;
    const terms = query.split(/\s+/).filter(Boolean);
    return authorizedDestinations
      .filter((destination) => terms.every((term) => destination.searchText.includes(term)))
      .sort((a, b) => getMatchRank(a, query) - getMatchRank(b, query) || a.title.localeCompare(b.title));
  }, [authorizedDestinations, recentDestinations, search]);

  const closePalette = () => {
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
  };

  const openDestination = (destination?: SearchDestination) => {
    if (!destination || !authorizedDestinations.some((d) => d.route === destination.route)) return;
    if (historyStorageKey) {
      const routes = [destination.route, ...readRecentHistory(historyStorageKey).filter((r) => r !== destination.route)].slice(
        0,
        RECENT_HISTORY_LIMIT,
      );
      writeRecentHistory(historyStorageKey, routes);
      setHistoryRoutes(routes);
    }
    closePalette();
    navigate(destination.route);
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!paletteRef.current?.contains(event.target as Node)) closePalette();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "Escape") {
      closePalette();
      return;
    }
    if (!filteredDestinations.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current === filteredDestinations.length - 1 ? 0 : current + 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current === 0 ? filteredDestinations.length - 1 : current - 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      openDestination(filteredDestinations[activeIndex]);
    }
  };

  return (
    <div ref={paletteRef} className="relative flex w-full max-w-md items-center" onKeyDown={handleKeyDown}>
      <div className="relative flex h-10 min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-3.5 z-10 text-slate-400" size={16} />
        <input
          ref={inputRef}
          value={search}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          disabled={isLoading}
          placeholder="Search pages..."
          aria-label="Search authorized pages"
          aria-expanded={open}
          className="h-10 w-full rounded-lg border border-slate-200/60 bg-slate-50 pl-10 pr-16 text-[12px] font-pmedium text-[#0F172A] outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20"
        />
        {open ? (
          <button
            type="button"
            onClick={closePalette}
            className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close search"
            title="Close"
          >
            <X size={16} />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-3 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-pmedium text-slate-400">
            Ctrl K
          </kbd>
        )}
      </div>

      {open && (
        <section
          role="dialog"
          aria-label="Search authorized pages"
          className="absolute left-0 right-0 top-full z-[1500] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="max-h-[55vh] overflow-y-auto p-2">
            {!search.trim() && (
              <div className="px-3 pb-1 pt-2 text-[10px] font-pmedium uppercase tracking-widest text-slate-400">
                Recent
              </div>
            )}
            {filteredDestinations.length ? (
              filteredDestinations.map((destination, index) => (
                <button
                  type="button"
                  key={destination.route}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openDestination(destination)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    activeIndex === index ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  <FileText className="shrink-0 text-[#2563EB]" size={16} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-pmedium text-[#0F172A]">{destination.title}</span>
                    {destination.section ? (
                      <span className="block text-[10px] text-slate-400">{destination.section}</span>
                    ) : null}
                  </span>
                  <ChevronRight className="text-slate-300" size={14} />
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[11px] font-pmedium text-slate-400">
                {search.trim() ? `No authorized pages match "${search.trim()}".` : "No recent pages yet."}
              </div>
            )}
          </div>

          <div className="flex items-center border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[10px] font-pmedium text-slate-400">
            <div className="flex items-center divide-x divide-slate-200">
              <span className="pr-3">↑↓ Navigate</span>
              <span className="px-3">Enter Open</span>
              <span className="pl-3">Esc Close</span>
            </div>
            <span className="ml-auto">
              {filteredDestinations.length} page{filteredDestinations.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>
      )}
    </div>
  );
};

export default HeaderSearchPalette;
