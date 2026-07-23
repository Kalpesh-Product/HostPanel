import { useEffect, useState } from "react";
import useAxiosPrivate from "./useAxiosPrivate";
import {
  DEFAULT_WORKSPACE_CURRENCY,
  DEFAULT_WORKSPACE_TIMEZONE,
  normalizeWorkspaceCurrency,
  normalizeWorkspaceTimeZone,
} from "../lib/workspaceLocalization";

import {
  getCountryBillingDefaults,
  normalizeBillingConfig,
  type WorkspaceBillingConfig,
} from "../lib/workspaceBilling";

export type WorkspacePreferences = {
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  weekStartsOn: "monday" | "sunday";
  businessHours: { start: string; end: string };
  billing: WorkspaceBillingConfig;
};

const DEFAULT_PREFERENCES: WorkspacePreferences = {
  timezone: DEFAULT_WORKSPACE_TIMEZONE,
  currency: DEFAULT_WORKSPACE_CURRENCY,
  dateFormat: "DD MMM YYYY",
  timeFormat: "12h",
  weekStartsOn: "monday",
  businessHours: { start: "09:00", end: "22:00" },
  billing: getCountryBillingDefaults("IN"),
};

export default function useWorkspacePreferences(): WorkspacePreferences {
  const axiosPrivate = useAxiosPrivate();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const response = await axiosPrivate.get("/api/workspaces/settings");
        const incoming = response?.data?.data?.settings?.preferences;
        if (!mounted || !incoming) return;
        setPreferences({
          timezone: normalizeWorkspaceTimeZone(incoming.timezone),
          currency: normalizeWorkspaceCurrency(incoming.currency),
          dateFormat: String(incoming.dateFormat || DEFAULT_PREFERENCES.dateFormat),
          timeFormat: incoming.timeFormat === "24h" ? "24h" : "12h",
          weekStartsOn: incoming.weekStartsOn === "sunday" ? "sunday" : "monday",
          businessHours: {
            start: String(incoming.businessHours?.start || DEFAULT_PREFERENCES.businessHours.start),
            end: String(incoming.businessHours?.end || DEFAULT_PREFERENCES.businessHours.end),
          },
          billing: normalizeBillingConfig(incoming.billing),
        });
      } catch {
        // Existing workspaces remain on backward-compatible India defaults.
      }
    })();
    return () => { mounted = false; };
  }, [axiosPrivate]);

  return preferences;
}
