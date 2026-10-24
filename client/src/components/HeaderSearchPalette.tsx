import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronRight, FileText, ContactRound, Magnet, UserRound, Building2 } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useDashboardAccess from "../hooks/useDashboardAccess";
import { getNomadsApiBase } from "../hooks/useNomadListingCapacity";
import { hasEquivalentModuleId, isModuleAllowedForMember } from "../routes/ModuleAccessGuard";
import { getProfileTabItemsForPlan } from "../pages/Profile/profileAccess";
import { canSearchOrganizationUsers, getSearchDestinationKey, isAuthorizedChildPage } from "./HeaderSearchPalette.helpers";
import { ROUTE_BY_ID } from "./Sidebar";

interface SearchDestination {
  title: string;
  route: string;
  moduleId: string;
  section: string;
  searchText: string;
  resultType?: "page" | "visitor" | "lead" | "user" | "listing";
  description?: string;
  record?: any;
}

const RECENT_HISTORY_LIMIT = 3;
const RECENT_HISTORY_KEY_PREFIX = "hostpanel:header-search:recent:";
const AUTHORIZED_CHILD_PAGES: Array<{
  parentModuleId: string;
  title: string;
  route: string;
  section: string;
  requiredAccessAny?: string[];
}> = [
  {
    parentModuleId: "website-builder",
    title: "Edit Website",
    route: "/key-apps/website-builder/edit-website",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Website Leads",
    route: "/key-apps/website-builder/leads",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Website Review",
    route: "/key-apps/website-builder/dynamic/reviews",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Careers",
    route: "/key-apps/website-builder/dynamic/careers",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Select Website Theme",
    route: "/key-apps/website-builder/select-theme",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Preview Website Theme",
    route: "/key-apps/website-builder/view-theme",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Website Live Demo",
    route: "/key-apps/website-builder/live-demo",
    section: "Website Builder",
  },
  {
    parentModuleId: "website-builder",
    title: "Create Website",
    route: "/key-apps/website-builder/dynamic/create-website",
    section: "Website Builder",
  },
  {
    parentModuleId: "visitor-management",
    title: "Visitor Frontdesk Action",
    route: "/visitors/visitor-management/frontdesk-action",
    section: "Visitor Management",
    requiredAccessAny: [
      "visitors_mode_standard",
      "visitors_mode_workspace_tour",
      "visitors_mode_walkin_booking",
      "visitors_mode_verify_booking",
    ],
  },
  {
    parentModuleId: "visitor-management",
    title: "Internal Visitors",
    route: "/visitors/manage-visitors/internal-visitors",
    section: "Visitor Management",
    requiredAccessAny: ["visitors_manage_internal_visitors"],
  },
  {
    parentModuleId: "visitor-management",
    title: "External Clients",
    route: "/visitors/manage-visitors/external-clients",
    section: "Visitor Management",
    requiredAccessAny: ["visitors_manage_external_clients"],
  },
  {
    parentModuleId: "visitor-management",
    title: "Visitor Team Members",
    route: "/visitors/team-members",
    section: "Visitor Management",
    requiredAccessAny: ["visitor_team_members"],
  },
  {
    parentModuleId: "visitor-management",
    title: "Visitor Reports",
    route: "/visitors/reports",
    section: "Visitor Management",
    requiredAccessAny: ["visitor_reports"],
  },
  {
    parentModuleId: "team-management",
    title: "Team Roster",
    route: "/extra-common-modules/team-management/roster",
    section: "Team Management",
  },
  {
    parentModuleId: "team-management",
    title: "Department SOPs",
    route: "/extra-common-modules/team-management/sops",
    section: "Team Management",
  },
  {
    parentModuleId: "team-management",
    title: "Department Policies",
    route: "/extra-common-modules/team-management/policies",
    section: "Team Management",
  },
];

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
  departmentNames = [],
  userPermissions = [],
}: {
  moduleMap: { sections: Array<{ sectionId?: string; sectionLabel?: string; items?: any[] }> };
  roleBand: string;
  grantedModuleIds: Set<string>;
  workspaceEnabledModuleIds: string[];
  plan: string;
  departmentNames?: string[];
  userPermissions?: string[];
}): SearchDestination[] => {
  const destinationsByRoute = new Map<string, SearchDestination>();

  (moduleMap?.sections || []).forEach((section) => {
    // Add-ons remain discoverable from their dedicated sidebar catalogue,
    // but should not be mixed into the header's page-navigation results.
    if (String(section?.sectionId || "").trim().toLowerCase() === "add-ons") return;

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

  // Nested pages are not separate entries in the workspace module catalog.
  // Add only safe, parameter-free routes and inherit authorization from the
  // parent module so child pages never bypass the normal access rules.
  const authorizedModuleIds = new Set(
    Array.from(destinationsByRoute.values()).map((destination) => destination.moduleId),
  );
  AUTHORIZED_CHILD_PAGES.forEach((child) => {
    if (!hasEquivalentModuleId(authorizedModuleIds, child.parentModuleId) || destinationsByRoute.has(child.route)) return;
    if (!isAuthorizedChildPage(child, roleBand, grantedModuleIds, userPermissions)) return;
    Array.from(destinationsByRoute.entries()).forEach(([route, destination]) => {
      if (destination.title.trim().toLowerCase() === child.title.toLowerCase()) {
        destinationsByRoute.delete(route);
      }
    });
    destinationsByRoute.set(child.route, {
      title: child.title,
      route: child.route,
      moduleId: child.parentModuleId,
      section: child.section,
      searchText: `${child.title} ${child.section}`.toLowerCase(),
      resultType: "page",
    });
  });

  // Profile is available to every authenticated user from the account menu, but
  // which tabs are reachable follows profileAccess.ts (Company Profile and
  // Plan & Billing are role/department gated) and the workspace plan.
  getProfileTabItemsForPlan(plan, { roleBand, departmentNames }).forEach((profilePage) => {
    destinationsByRoute.set(profilePage.route, {
      title: profilePage.label,
      route: profilePage.route,
      moduleId: "profile",
      section: "Account",
      searchText: `${profilePage.label} profile account`.toLowerCase(),
      resultType: "page",
    });
  });

  return Array.from(destinationsByRoute.values()).sort((a, b) => a.title.localeCompare(b.title));
};

const HeaderSearchPalette = ({ compact = false }: { compact?: boolean }) => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  const navigate = useNavigate();
  const { plan, roleBand, departmentNames, grantedModuleIds, workspaceEnabledModuleIds, moduleMap, isLoading } =
    useDashboardAccess();
  const userPermissions = useMemo<string[]>(
    () => Array.isArray((auth?.user as any)?.permissions?.permissions)
      ? (auth?.user as any).permissions.permissions
      : [],
    [auth?.user],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [historyRoutes, setHistoryRoutes] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const userId = (auth?.user as any)?.id || (auth?.user as any)?._id || "";
  const historyStorageKey = userId ? `${RECENT_HISTORY_KEY_PREFIX}${userId}` : null;

  const authorizedDestinations = useMemo(
    () => buildAuthorizedDestinations({ moduleMap, roleBand, grantedModuleIds, workspaceEnabledModuleIds, plan, departmentNames, userPermissions }),
    [moduleMap, roleBand, grantedModuleIds, workspaceEnabledModuleIds, plan, departmentNames, userPermissions],
  );

  const authorizedModuleById = useMemo(
    () => new Map(authorizedDestinations.map((destination) => [destination.moduleId, destination])),
    [authorizedDestinations],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const recordSearchEnabled = debouncedSearch.length >= 2;
  const companyId = String(
    (auth?.user as any)?.effectiveNomadsCompanyId || (auth?.user as any)?.companyId || "",
  ).trim();
  const workspaceId = String(
    (auth?.user as any)?.workspaceMembership?.workspace ||
      (auth?.user as any)?.primaryWorkspace ||
      (auth?.user as any)?.workspaceId ||
      "",
  ).trim();
  const canSearchUsers = canSearchOrganizationUsers(roleBand, grantedModuleIds);

  const { data: recordSearchData, isFetching: isSearchingRecords } = useQuery<{ results: SearchDestination[]; hadFailure: boolean }>({
    queryKey: ["header-record-search", debouncedSearch, workspaceId, companyId, roleBand, canSearchUsers, Array.from(authorizedModuleById.keys()).sort()],
    enabled: recordSearchEnabled && !isLoading,
    staleTime: 30_000,
    queryFn: async () => {
      const normalizedQuery = debouncedSearch.toLowerCase();
      const requests: Array<Promise<{ type: string; data: any }>> = [];

      if (authorizedModuleById.has("visitor-management")) {
        requests.push(
          axiosPrivate
            .get("/api/v1/visitors", { params: { search: debouncedSearch, limit: 8 } })
            .then((response) => ({ type: "visitor", data: response?.data?.data?.visitors || [] })),
        );
      }
      if (authorizedModuleById.has("website-leads") && (workspaceId || companyId)) {
        requests.push(
          Promise.all([
            axiosPrivate.get("/api/leads/get-leads", { params: { workspaceId, companyId, leadScope: "website", search: debouncedSearch, limit: 8 } }),
            axiosPrivate.get("/api/leads/get-leads", { params: { workspaceId, companyId, leadScope: "nomads", search: debouncedSearch, limit: 8 } }),
          ]).then(([website, nomads]) => ({
            type: "lead",
            data: [...(Array.isArray(website?.data) ? website.data : []), ...(Array.isArray(nomads?.data) ? nomads.data : [])],
          })),
        );
      }
      if (authorizedModuleById.has("organization-management") && canSearchUsers) {
        requests.push(
          axiosPrivate.get("/api/organization/overview").then((response) => ({
            type: "user",
            data: response?.data?.data?.teamMembers || response?.data?.teamMembers || [],
          })),
        );
      }
      if (authorizedModuleById.has("wono-nomad") && companyId) {
        requests.push(
          axiosPrivate
            .get(`${getNomadsApiBase()}/api/company/get-listings/${encodeURIComponent(companyId)}`)
            .then((response) => ({ type: "listing", data: Array.isArray(response?.data) ? response.data : [] })),
        );
      }

      const settled = await Promise.allSettled(requests);
      const results: SearchDestination[] = [];
      // Record results use word-prefix matching to avoid noisy two-character
      // matches in the middle of unrelated words (for example, "te" inside
      // "Enterprises"). Page names keep their more forgiving contains match.
      const matches = (values: unknown[]) =>
        values.some((value) =>
          String(value || "")
            .toLowerCase()
            .split(/[^a-z0-9@.+-]+/)
            .filter(Boolean)
            .some((word) => word.startsWith(normalizedQuery)),
        );

      settled.forEach((outcome) => {
        if (outcome.status !== "fulfilled") return;
        const rows = Array.isArray(outcome.value.data) ? outcome.value.data : [];

        if (outcome.value.type === "visitor") {
          rows.slice(0, 8).forEach((visitor: any) => {
            const id = String(visitor.recordId || visitor.id || visitor._id || "");
            if (!id) return;
            results.push({
              title: visitor.name || visitor.fullName || "Visitor",
              description: [visitor.visitorCode, visitor.company, visitor.phone].filter(Boolean).join(" · "),
              route: `/visitors/visitor-management?globalSearch=${encodeURIComponent(debouncedSearch)}&recordId=${encodeURIComponent(id)}`,
              moduleId: "visitor-management",
              section: "Visitors",
              searchText: "",
              resultType: "visitor",
              record: visitor,
            });
          });
        }

        if (outcome.value.type === "lead") {
          rows
            .filter((lead: any) => matches([lead.fullName, lead.email, lead.mobileNumber, lead.companyName, lead.productType, lead.source]))
            .slice(0, 8)
            .forEach((lead: any) => {
              const id = String(lead._id || lead.id || "");
              if (!id) return;
              results.push({
                title: lead.fullName || "Lead",
                description: [lead.companyName, lead.email || lead.mobileNumber, lead.source].filter(Boolean).join(" · "),
                route: `/key-apps/all-leads?globalSearch=${encodeURIComponent(debouncedSearch)}&recordId=${encodeURIComponent(id)}`,
                moduleId: "website-leads",
                section: "Leads",
                searchText: "",
                resultType: "lead",
                record: lead,
              });
            });
        }

        if (outcome.value.type === "user") {
          rows
            .filter((member: any) => matches([member.fullName, member.name, member.email, member.employeeId, member.role, ...(member.departmentNames || [])]))
            .slice(0, 8)
            .forEach((member: any) => {
              const id = String(member.userId || member.id || member._id || "");
              if (!id) return;
              results.push({
                title: member.fullName || member.name || member.email || "User",
                description: [member.role, member.email].filter(Boolean).join(" · "),
                route: `/core-modules/organization-management?globalSearch=${encodeURIComponent(debouncedSearch)}&recordId=${encodeURIComponent(id)}`,
                moduleId: "organization-management",
                section: "Users",
                searchText: "",
                resultType: "user",
                record: member,
              });
            });
        }

        if (outcome.value.type === "listing") {
          rows
            .filter((listing: any) => !listing.isDeleted && matches([listing.companyName, listing.companyTitle, listing.companyType, listing.city, listing.state, listing.country]))
            .slice(0, 8)
            .forEach((listing: any) => {
              const id = String(listing.businessId || listing._id || listing.id || "");
              if (!id) return;
              results.push({
                title: listing.companyTitle || listing.companyName || "Listing",
                description: [listing.companyType, listing.city, listing.country].filter(Boolean).join(" · "),
                route: "/key-apps/nomad-listings/edit",
                moduleId: "wono-nomad",
                section: "Listings",
                searchText: "",
                resultType: "listing",
                record: listing,
              });
            });
        }
      });

      return { results, hadFailure: settled.some((outcome) => outcome.status === "rejected") };
    },
  });
  const recordDestinations = useMemo(() => recordSearchData?.results || [], [recordSearchData?.results]);
  const recordSearchHadError = Boolean(recordSearchData?.hadFailure);

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
    const pages = authorizedDestinations
      .filter((destination) => terms.every((term) => destination.searchText.includes(term)))
      .sort((a, b) => getMatchRank(a, query) - getMatchRank(b, query) || a.title.localeCompare(b.title));
    return [...pages, ...recordDestinations];
  }, [authorizedDestinations, recentDestinations, recordDestinations, search]);

  const closePalette = () => {
    setOpen(false);
    setSearch("");
    setActiveIndex(0);
  };

  const openDestination = (destination?: SearchDestination) => {
    if (!destination) return;
    const authorizedModule = authorizedModuleById.has(destination.moduleId);
    const authorizedPage = authorizedDestinations.some((d) => d.route === destination.route);
    if (!authorizedModule && !authorizedPage) return;
    if (destination.resultType === "listing" && destination.record) {
      const listingCompanyId = String(
        destination.record.companyId || companyId || "",
      );
      const businessId = String(destination.record.businessId || "");
      if (listingCompanyId) sessionStorage.setItem("companyId", listingCompanyId);
      if (destination.record.companyName) {
        sessionStorage.setItem("companyName", String(destination.record.companyName));
      }
      if (businessId) sessionStorage.setItem("businessId", businessId);
      closePalette();
      navigate("/key-apps/nomad-listings/edit", {
        state: { website: destination.record, companyId: listingCompanyId },
      });
      return;
    }
    if (historyStorageKey && destination.resultType !== "visitor" && destination.resultType !== "lead" && destination.resultType !== "user" && destination.resultType !== "listing") {
      const routes = [destination.route, ...readRecentHistory(historyStorageKey).filter((r) => r !== destination.route)].slice(
        0,
        RECENT_HISTORY_LIMIT,
      );
      writeRecentHistory(historyStorageKey, routes);
      setHistoryRoutes(routes);
    }
    closePalette();
    navigate(destination.route, {
      state: destination.resultType && destination.resultType !== "page"
        ? {
            globalSearchRecord: {
              type: destination.resultType,
              record: destination.record,
            },
            globalSearchQuery: search.trim(),
          }
        : undefined,
    });
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
    <div ref={paletteRef} className={`${compact && !open ? "relative w-10" : compact ? "fixed inset-x-4 top-16 z-[1600]" : "relative w-full max-w-md"} flex items-center`} onKeyDown={handleKeyDown}>
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
          placeholder={compact && !open ? "" : "Search pages..."}
          aria-label="Search authorized pages"
          aria-expanded={open}
          className={`h-10 w-full rounded-lg border border-slate-200/60 bg-slate-50 pl-10 text-[12px] font-pmedium text-[#0F172A] outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/20 ${compact && !open ? "cursor-pointer pr-0 text-transparent" : "pr-16"}`}
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
        ) : !compact ? (
          <kbd className="pointer-events-none absolute right-3 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-pmedium text-slate-400">
            Ctrl K
          </kbd>
        ) : null}
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
                  key={getSearchDestinationKey(destination)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openDestination(destination)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    activeIndex === index ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}
                >
                  {destination.resultType === "visitor" ? <ContactRound className="shrink-0 text-[#2563EB]" size={16} />
                    : destination.resultType === "lead" ? <Magnet className="shrink-0 text-[#2563EB]" size={16} />
                    : destination.resultType === "user" ? <UserRound className="shrink-0 text-[#2563EB]" size={16} />
                    : destination.resultType === "listing" ? <Building2 className="shrink-0 text-[#2563EB]" size={16} />
                    : <FileText className="shrink-0 text-[#2563EB]" size={16} />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-pmedium text-[#0F172A]">{destination.title}</span>
                    {destination.section ? (
                      <span className="block truncate text-[10px] text-slate-400">
                        {destination.section}{destination.description ? ` · ${destination.description}` : ""}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="text-slate-300" size={14} />
                </button>
              ))
            ) : (
              <div className="px-4 py-10 text-center text-[11px] font-pmedium text-slate-400">
                {search.trim()
                  ? isSearchingRecords
                    ? "Searching pages and records..."
                    : recordSearchHadError
                      ? "Some records could not be searched. Try again."
                      : `No authorized pages or records match "${search.trim()}".`
                  : "No recent pages yet."}
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
              {filteredDestinations.length} result{filteredDestinations.length === 1 ? "" : "s"}
            </span>
          </div>
        </section>
      )}
    </div>
  );
};

export default HeaderSearchPalette;
