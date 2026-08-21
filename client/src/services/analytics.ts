import { axiosPrivate } from "../utils/axios";

// Backend wraps payloads as { message, data: <payload> } — unwrap to the
// payload directly, matching the convention used across this services layer.
const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;

export interface AnalyticsKpi {
  label: string;
  value: number | string;
  suffix?: string;
}

export interface AnalyticsBreakdownSegment {
  label: string;
  value: number;
}

export interface AnalyticsMonthlyPoint {
  key: string;
  label: string;
  count: number;
}

export interface AnalyticsUsageInsights {
  byDay: AnalyticsBreakdownSegment[];
  byHour: AnalyticsBreakdownSegment[];
  peakDayLabel: string;
  peakHourLabel: string;
}

export interface AnalyticsModuleStats {
  totalRecords: number;
  activeLast30Days: number;
  openItems: number;
  completionRate: number | null;
  kpis?: AnalyticsKpi[];
  breakdown?: AnalyticsBreakdownSegment[];
  secondaryBreakdown?: AnalyticsBreakdownSegment[];
  monthly?: AnalyticsMonthlyPoint[];
  insights?: AnalyticsUsageInsights;
  deptBreakdown?: AnalyticsBreakdownSegment[];
  extras?: Record<string, any>;
}

export interface AnalyticsModuleEntry {
  id: string;
  label: string;
  sectionLabel: string;
  route: string;
  trackable: boolean;
  planAvailability?: string;
  activityScore: number;
  stats: AnalyticsModuleStats | null;
}

export interface AnalyticsOverview {
  workspaceId: string;
  workspaceName: string;
  plan: string;
  generatedAt: string;
  units: { id: string; name: string }[];
  modules: AnalyticsModuleEntry[];
  alsoEnabled: { id: string; label: string; route: string }[];
  totals: {
    trackedModules: number;
    totalRecords: number;
    activeLast30Days: number;
    openItems: number;
    avgActivityScore: number;
  };
  trend: { key: string; label: string; count: number }[];
}

export const getAnalyticsOverview = async (workspaceId?: string): Promise<AnalyticsOverview> => {
  const response = await axiosPrivate.get("/api/analytics/overview", {
    params: workspaceId ? { workspaceId } : undefined,
  });
  return unwrap(response);
};
