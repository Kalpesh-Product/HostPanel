import type { AxiosInstance } from "axios";

export const getWorkspaceSettings = (axiosPrivate: AxiosInstance) =>
  axiosPrivate.get("/api/workspaces/settings");

export const updateWorkspaceSettings = (
  axiosPrivate: AxiosInstance,
  payload: {
    profile?: {
      workspaceName?: string;
      businessName?: string;
      location?: string;
      industry?: string;
      businessType?: string;
    };
    preferences?: {
      timezone?: string;
      currency?: string;
      dateFormat?: string;
      timeFormat?: "12h" | "24h";
      weekStartsOn?: "monday" | "sunday";
      businessHours?: { start?: string; end?: string; is24Hours?: boolean };
      billing?: WorkspaceBillingConfig;
    };
    branding?: { primaryColor: string };
  },
) => axiosPrivate.patch("/api/workspaces/settings", payload);

type WorkspaceBillingConfig = {
  tax: {
    enabled: boolean;
    priceIncludesTax: boolean;
    label: string;
    ratePercent: number;
  };
  paymentMethods: { code: string; label: string }[];
};
