import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { getEmployeeBanks, verifyEmployeeBankAccount } from "@/services/hr";
import { getCountryIsoCode } from "@/utils/locationApi";

export const CUSTOM_BANK_OPTION = "__custom__";

interface BankOption {
  code: string;
  name: string;
  countryCode: string;
  swiftCode?: string;
  city?: string;
  state?: string;
}

export interface BankVerificationState {
  status: "idle" | "checking" | "verified" | "warning" | "error";
  level?: "branch" | "format" | "account" | "pending" | "unsupported" | "failed";
  message?: string;
  registeredName?: string;
}

interface BankFormValue {
  country: string;
  state: string;
  city: string;
  bankNameSelection: string;
  bankNameCustom: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

interface Props {
  form: BankFormValue;
  onChange: (field: keyof BankFormValue, value: string) => void;
  verification: BankVerificationState;
  onVerificationChange: (value: BankVerificationState) => void;
  ifscError?: string;
}

const fieldClass = "w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-slate-50 disabled:text-slate-400";

export default function EmployeeBankAccountFields({ form, onChange, verification, onVerificationChange, ifscError }: Props) {
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [bankSourceMessage, setBankSourceMessage] = useState("");
  const countryCode = getCountryIsoCode(form.country);

  useEffect(() => {
    onVerificationChange({ status: "idle" });
  }, [countryCode, form.state, form.city, onVerificationChange]);

  useEffect(() => {
    let active = true;
    if (!countryCode) {
      setBanks([]);
      setBankSourceMessage("");
      return () => { active = false; };
    }
    setIsLoadingBanks(true);
    getEmployeeBanks({ countryCode, state: form.state, city: form.city })
      .then((response) => {
        if (!active) return;
        const data = response?.data?.data || {};
        const nextBanks = Array.isArray(data.banks) ? data.banks : [];
        setBanks(nextBanks);
        setBankSourceMessage(
          data.isFallback
            ? (countryCode === "IN" ? "Showing the built-in Indian bank list." : "Select Other Bank and enter the bank name manually.")
            : `Banks loaded for ${form.country}; branch location is checked during verification.`,
        );
      })
      .catch(() => {
        if (!active) return;
        setBanks([]);
        setBankSourceMessage("Bank directory is unavailable; use Other Bank.");
      })
      .finally(() => { if (active) setIsLoadingBanks(false); });
    return () => { active = false; };
  }, [countryCode, form.state, form.city, form.country]);

  const selectedBankName = form.bankNameSelection === CUSTOM_BANK_OPTION
    ? form.bankNameCustom.trim()
    : form.bankNameSelection.trim();
  const selectedBank = useMemo(
    () => banks.find((bank) => bank.name === form.bankNameSelection),
    [banks, form.bankNameSelection],
  );
  const requiresIfsc = countryCode === "IN";
  const canVerify = Boolean(requiresIfsc && selectedBankName && form.ifscCode.trim());

  const updateField = (field: keyof BankFormValue, value: string) => {
    onChange(field, value);
    onVerificationChange({ status: "idle" });
  };

  const handleVerify = async () => {
    if (!canVerify || verification.status === "checking") return;
    onVerificationChange({ status: "checking", message: "Checking bank details..." });
    try {
      const response = await verifyEmployeeBankAccount({
        countryCode,
        country: form.country,
        state: form.state,
        city: form.city,
        bankCode: selectedBank?.code || "",
        bankName: selectedBankName,
        ifscCode: form.ifscCode,
      });
      const result = response?.data?.data || {};
      const level = result.verificationLevel as BankVerificationState["level"];
      onVerificationChange({
        status: result.verified && ["branch", "account"].includes(String(level)) ? "verified" : (["format", "unsupported", "pending"].includes(String(level)) ? "warning" : "error"),
        level,
        message: String(result.message || "Bank verification completed."),
        registeredName: String(result.registeredName || ""),
      });
    } catch (error: any) {
      onVerificationChange({
        status: "error",
        level: "failed",
        message: String(error?.response?.data?.message || error?.message || "Bank details could not be verified."),
      });
    }
  };

  const messageTone = verification.status === "verified"
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : verification.status === "error"
      ? "text-red-700 bg-red-50 border-red-200"
      : "text-amber-700 bg-amber-50 border-amber-200";

  return (
    <>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Bank Name</label>
        <select value={form.bankNameSelection} onChange={(event) => updateField("bankNameSelection", event.target.value)} disabled={!countryCode || isLoadingBanks} className={fieldClass}>
          <option value="">{isLoadingBanks ? "Loading banks..." : countryCode ? "Select Bank" : "Select country first"}</option>
          {form.bankNameSelection && form.bankNameSelection !== CUSTOM_BANK_OPTION && !banks.some((bank) => bank.name === form.bankNameSelection) && (
            <option value={form.bankNameSelection}>{form.bankNameSelection} (saved)</option>
          )}
          {banks.map((bank) => <option key={`${bank.code}-${bank.name}`} value={bank.name}>{bank.name}</option>)}
          <option value={CUSTOM_BANK_OPTION}>Other Bank (enter manually)</option>
        </select>
        {bankSourceMessage && <span className="text-[9px] font-pmedium text-slate-400">{bankSourceMessage}</span>}
      </div>
      {form.bankNameSelection === CUSTOM_BANK_OPTION && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Custom Bank Name</label>
          <input value={form.bankNameCustom} onChange={(event) => updateField("bankNameCustom", event.target.value)} className={fieldClass} placeholder="Enter bank name" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Account Holder Name</label>
        <input value={form.accountHolderName} onChange={(event) => updateField("accountHolderName", event.target.value)} className={fieldClass} placeholder="As registered with the bank" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Account Number</label>
        <input value={form.accountNumber} onChange={(event) => updateField("accountNumber", event.target.value.replace(/\s/g, ""))} className={fieldClass} inputMode="numeric" autoComplete="off" placeholder="Enter account number" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">{requiresIfsc ? "IFSC Code" : "Routing / SWIFT / Bank Code"}</label>
        <input value={form.ifscCode} onChange={(event) => updateField("ifscCode", event.target.value.toUpperCase())} className={`${fieldClass} ${ifscError ? "border-red-300 bg-red-50" : ""}`} placeholder={requiresIfsc ? "HDFC0XXXXXX" : "Country-specific bank code"} />
        {ifscError && <span className="text-[10px] font-pmedium text-red-500">{ifscError}</span>}
      </div>
      {requiresIfsc && (
        <div className="flex flex-col gap-2 justify-end">
          <button type="button" onClick={handleVerify} disabled={!canVerify || verification.status === "checking"} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-pmedium text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
            {verification.status === "checking" ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            {verification.status === "checking" ? "Validating..." : "Validate IFSC & Branch"}
          </button>
        </div>
      )}
      {requiresIfsc && verification.status !== "idle" && verification.status !== "checking" && verification.message && (
        <div className={`md:col-span-2 lg:col-span-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-[10px] font-pmedium ${messageTone}`} role="status">
          {verification.status === "verified" ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
          <span>{verification.message}{verification.registeredName ? ` Registered name: ${verification.registeredName}.` : ""}</span>
        </div>
      )}
    </>
  );
}
