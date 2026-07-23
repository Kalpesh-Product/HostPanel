export type WorkspacePaymentMethod = {
  code: string;
  label: string;
  requiresReference: boolean;
  requiresProof: boolean;
};

export type WorkspaceBillingConfig = {
  tax: { enabled: boolean; label: string; ratePercent: number; priceIncludesTax: boolean };
  paymentMethods: WorkspacePaymentMethod[];
};

const METHODS: Record<string, WorkspacePaymentMethod> = {
  cash: { code: "cash", label: "Cash", requiresReference: false, requiresProof: false },
  card: { code: "card", label: "Card", requiresReference: false, requiresProof: false },
  bank_transfer: { code: "bank_transfer", label: "Bank Transfer", requiresReference: true, requiresProof: true },
  upi: { code: "upi", label: "UPI", requiresReference: true, requiresProof: true },
  ach: { code: "ach", label: "ACH", requiresReference: true, requiresProof: false },
  interac: { code: "interac", label: "Interac", requiresReference: true, requiresProof: false },
  pix: { code: "pix", label: "PIX", requiresReference: true, requiresProof: true },
  paynow: { code: "paynow", label: "PayNow", requiresReference: true, requiresProof: true },
  sepa: { code: "sepa", label: "SEPA Transfer", requiresReference: true, requiresProof: false },
  faster_payments: { code: "faster_payments", label: "Faster Payments", requiresReference: true, requiresProof: false },
  payid: { code: "payid", label: "PayID", requiresReference: true, requiresProof: true },
};

const TAX: Record<string, { enabled: boolean; label: string; ratePercent: number }> = {
  IN: { enabled: true, label: "GST", ratePercent: 18 }, GB: { enabled: true, label: "VAT", ratePercent: 20 },
  AE: { enabled: true, label: "VAT", ratePercent: 5 }, SG: { enabled: true, label: "GST", ratePercent: 9 },
  AU: { enabled: true, label: "GST", ratePercent: 10 }, JP: { enabled: true, label: "Consumption Tax", ratePercent: 10 },
  DE: { enabled: true, label: "VAT", ratePercent: 19 }, FR: { enabled: true, label: "VAT", ratePercent: 20 },
  ES: { enabled: true, label: "VAT", ratePercent: 21 }, IT: { enabled: true, label: "VAT", ratePercent: 22 },
  NL: { enabled: true, label: "VAT", ratePercent: 21 }, US: { enabled: false, label: "Sales Tax", ratePercent: 0 },
  CA: { enabled: false, label: "GST/HST", ratePercent: 0 }, BR: { enabled: false, label: "Indirect Tax", ratePercent: 0 },
};
const LOCAL: Record<string, string[]> = {
  IN: ["upi"], US: ["ach"], CA: ["interac"], BR: ["pix"], SG: ["paynow"], AU: ["payid"],
  GB: ["faster_payments"], DE: ["sepa"], FR: ["sepa"], ES: ["sepa"], IT: ["sepa"], NL: ["sepa"],
};

export function getCountryBillingDefaults(countryCode: unknown, stateName: unknown = ""): WorkspaceBillingConfig {
  const code = String(countryCode || "").trim().toUpperCase();
  const state = String(stateName || "").trim().toLowerCase();
  const tax = { ...(TAX[code] || { enabled: false, label: "Tax", ratePercent: 0 }) };
  if (code === "CA" && state === "ontario") Object.assign(tax, { enabled: true, label: "HST", ratePercent: 13 });
  return {
    tax: { ...tax, priceIncludesTax: false },
    paymentMethods: ["cash", "card", "bank_transfer", ...(LOCAL[code] || [])].map((code) => METHODS[code]),
  };
}

export function normalizeBillingConfig(value: any, countryCode?: unknown, stateName?: unknown): WorkspaceBillingConfig {
  const defaults = getCountryBillingDefaults(countryCode, stateName);
  const inputTax = value?.tax || {};
  const methodInput = Array.isArray(value?.paymentMethods) && value.paymentMethods.length ? value.paymentMethods : defaults.paymentMethods;
  const paymentMethods = methodInput.map((entry: any) => {
    const code = String(entry?.code || entry || "").trim().toLowerCase();
    return METHODS[code] || {
      code,
      label: String(entry?.label || code).trim().slice(0, 80),
      requiresReference: Boolean(entry?.requiresReference),
      requiresProof: Boolean(entry?.requiresProof),
    };
  }).filter((method: WorkspacePaymentMethod) => method.code && method.label);
  if (!paymentMethods.some((method: WorkspacePaymentMethod) => method.code === "cash")) paymentMethods.unshift(METHODS.cash);
  return {
    tax: {
      enabled: inputTax.enabled !== undefined ? Boolean(inputTax.enabled) : defaults.tax.enabled,
      label: String(inputTax.label || defaults.tax.label || "Tax").trim().slice(0, 40),
      ratePercent: Math.min(100, Math.max(0, Number(inputTax.ratePercent ?? defaults.tax.ratePercent) || 0)),
      priceIncludesTax: Boolean(inputTax.priceIncludesTax),
    },
    paymentMethods,
  };
}

export function resolvePaymentMethod(config: WorkspaceBillingConfig, value: unknown): WorkspacePaymentMethod | null {
  const normalized = String(value || "").trim().toLowerCase();
  return config.paymentMethods.find((method) => method.code === normalized || method.label.toLowerCase() === normalized) || null;
}
