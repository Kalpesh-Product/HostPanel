import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import useAxiosPrivate from "../../../hooks/useAxiosPrivate";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Country, State, City } from "country-state-city";
import {
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { Eye, FileText, Loader2, Upload, X } from "lucide-react";

import { TIER_OPTIONS } from "./verifyBusinessTiers";

type DocumentType = { key: string; label: string; required: boolean };

interface VerifyBusinessFormProps {
  companyName: string;
  prefill: Record<string, any>;
  documentTypes: DocumentType[];
  // Present when resubmitting after a rejection — pre-fills the form and
  // lets documents already on file be kept instead of re-uploaded.
  previous?: any;
  onClose: () => void;
  onSubmitted: () => void;
}

const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const ROLE_OPTIONS = [
  "Owner",
  "Founder / Co-Founder",
  "CEO",
  "Director",
  "Managing Partner",
  "General Manager",
  "Operations Manager",
  "Authorized Signatory",
  "Other",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WEBSITE_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;

const inputClass =
  "mt-1 w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:ring-2";
const okBorder =
  "border-slate-200/60 focus:border-[#2563EB] focus:ring-[#2563EB]/20";
const errBorder = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";
const labelClass =
  "text-[10px] font-pmedium text-slate-500 uppercase tracking-widest";

const allCountries = Country.getAllCountries();

const findCountry = (value?: string) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return undefined;
  return allCountries.find(
    (c) => c.name.toLowerCase() === v || c.isoCode.toLowerCase() === v,
  );
};

const findState = (countryIso: string, value?: string) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v || !countryIso) return undefined;
  return State.getStatesOfCountry(countryIso).find(
    (s) => s.name.toLowerCase() === v || s.isoCode.toLowerCase() === v,
  );
};

const callingCode = (iso?: string) => {
  try {
    return iso ? getCountryCallingCode(iso as CountryCode) : "";
  } catch {
    return "";
  }
};

const Field = ({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div data-invalid={error ? "true" : undefined}>
    <label className={labelClass}>{label}</label>
    {children}
    {error ? (
      <p className="mt-1 text-[11px] font-pmedium text-rose-600">{error}</p>
    ) : hint ? (
      <p className="mt-1 text-[11px] font-pmedium text-slate-400">{hint}</p>
    ) : null}
  </div>
);

const VerifyBusinessForm = ({
  companyName,
  prefill,
  documentTypes,
  previous,
  onClose,
  onSubmitted,
}: VerifyBusinessFormProps) => {
  const axiosPrivate = useAxiosPrivate();
  const source = previous || prefill || {};
  const formRef = useRef<HTMLDivElement | null>(null);

  const initialCountry = findCountry(source.companyCountry);
  const initialState = initialCountry
    ? findState(initialCountry.isoCode, source.companyState)
    : undefined;
  const parsedMobile = source.mobile
    ? parsePhoneNumberFromString(String(source.mobile))
    : undefined;

  const [fields, setFields] = useState({
    fullName: source.fullName || "",
    email: source.email || "",
    role: source.role || "",
    registeredCompanyName: source.registeredCompanyName || "",
    websiteUrl: source.websiteUrl || "",
    companyCountry: initialCountry?.name || "",
    companyState: initialState?.name || source.companyState || "",
    companyCity: source.companyCity || "",
  });
  const [phoneIso, setPhoneIso] = useState<string>(
    parsedMobile?.country || initialCountry?.isoCode || "",
  );
  const [phoneNumber, setPhoneNumber] = useState<string>(
    parsedMobile?.nationalNumber
      ? String(parsedMobile.nationalNumber)
      : String(source.mobile || "").replace(/\D/g, ""),
  );
  const [tier, setTier] = useState(previous?.requestedTier || "1m");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [removedExisting, setRemovedExisting] = useState<Record<string, boolean>>(
    {},
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const existingDocs: Record<string, any> = {};
  (previous?.proofDocuments || []).forEach((doc: any) => {
    const match = documentTypes.find((d) => d.label === doc.label);
    if (match) existingDocs[match.key] = doc;
  });

  const industry: string[] = prefill?.industry || previous?.industry || [];

  const countryIso = findCountry(fields.companyCountry)?.isoCode || "";
  const states = useMemo(
    () => (countryIso ? State.getStatesOfCountry(countryIso) : []),
    [countryIso],
  );
  const stateIso = findState(countryIso, fields.companyState)?.isoCode || "";
  const cities = useMemo(
    () =>
      countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso) : [],
    [countryIso, stateIso],
  );

  const roleOptions =
    fields.role && !ROLE_OPTIONS.includes(fields.role)
      ? [fields.role, ...ROLE_OPTIONS]
      : ROLE_OPTIONS;
  const cityOptions =
    fields.companyCity && cities.length &&
    !cities.some((c) => c.name === fields.companyCity)
      ? [{ name: fields.companyCity }, ...cities]
      : cities;

  const dialCode = callingCode(phoneIso);
  const e164Mobile = phoneNumber ? `+${dialCode}${phoneNumber}` : "";

  const setField = (key: string, value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));
  const touch = (key: string) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const errors: Record<string, string> = {};
  if (fields.fullName.trim().length < 2) errors.fullName = "Full name is required";
  if (!fields.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_PATTERN.test(fields.email.trim()))
    errors.email = "Enter a valid email address";
  if (!phoneNumber) errors.mobile = "Mobile number is required";
  else if (!dialCode || !isValidPhoneNumber(e164Mobile))
    errors.mobile = "Enter a valid mobile number for the selected country code";
  if (!fields.role) errors.role = "Select your role";
  if (!fields.registeredCompanyName.trim())
    errors.registeredCompanyName = "Registered company name is required";
  if (fields.websiteUrl.trim() && !WEBSITE_PATTERN.test(fields.websiteUrl.trim()))
    errors.websiteUrl = "Enter a valid website, e.g. https://example.com";
  if (!fields.companyCountry) errors.companyCountry = "Select a country";
  if (!fields.companyState.trim()) errors.companyState = "Select a state";
  if (!fields.companyCity.trim()) errors.companyCity = "Select a city";
  documentTypes.forEach((d) => {
    if (
      d.required &&
      !files[d.key] &&
      !(existingDocs[d.key] && !removedExisting[d.key])
    ) {
      errors[`doc_${d.key}`] = `${d.label} is required`;
    }
  });

  const showError = (key: string) =>
    submitted || touched[key] ? errors[key] : undefined;
  const controlClass = (key: string) =>
    `${inputClass} ${showError(key) ? errBorder : okBorder}`;

  const handleCountryChange = (name: string) => {
    const country = findCountry(name);
    setFields((prev) => ({
      ...prev,
      companyCountry: name,
      companyState: "",
      companyCity: "",
    }));
    // The mobile code follows the business country by default; it can still
    // be switched manually in its own dropdown afterwards.
    if (country) setPhoneIso(country.isoCode);
  };

  const handleStateChange = (name: string) =>
    setFields((prev) => ({ ...prev, companyState: name, companyCity: "" }));

  const handleFile = (key: string, file: File | undefined) => {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Only ${ALLOWED_EXTENSIONS.join(", ")} files are allowed.`);
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`"${file.name}" is over 5MB. Please upload a smaller file.`);
      return;
    }
    setFiles((prev) => ({ ...prev, [key]: file }));
    setRemovedExisting((prev) => ({ ...prev, [key]: true }));
  };

  const clearFile = (key: string) => {
    setFiles((prev) => ({ ...prev, [key]: null }));
    if (inputRefs.current[key]) inputRefs.current[key]!.value = "";
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(fields).forEach(([k, v]) => formData.append(k, v));
      formData.append("mobile", e164Mobile);
      formData.append("requestedTier", tier);
      documentTypes.forEach((d) => {
        const file = files[d.key];
        if (file) {
          formData.append(d.key, file);
        } else if (existingDocs[d.key] && !removedExisting[d.key]) {
          formData.append(`existing_${d.key}`, existingDocs[d.key].url);
          formData.append(`existing_${d.key}_id`, existingDocs[d.key].id || "");
        }
      });
      const response = await axiosPrivate.post(
        "/api/verify-business/request",
        formData,
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Submitted for review. We'll update the status shortly.");
      onSubmitted();
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to submit verification",
      );
    },
  });

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) {
      requestAnimationFrame(() => {
        formRef.current
          ?.querySelector('[data-invalid="true"]')
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-2xl border border-slate-100 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[14px] font-pmedium text-slate-950">
              Verify {companyName || "your business"}
            </p>
            <p className="mt-0.5 text-[12px] font-pmedium text-slate-500">
              Our team reviews your details and documents before the verified
              badge can be purchased.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={formRef} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full Name *" error={showError("fullName")}>
              <input
                type="text"
                value={fields.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                onBlur={() => touch("fullName")}
                className={controlClass("fullName")}
              />
            </Field>

            <Field
              label="Email *"
              error={showError("email")}
              hint="We'll send the payment link to this email address."
            >
              <input
                type="email"
                value={fields.email}
                onChange={(e) => setField("email", e.target.value)}
                onBlur={() => touch("email")}
                className={controlClass("email")}
              />
            </Field>

            <Field label="Country *" error={showError("companyCountry")}>
              <select
                value={fields.companyCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                onBlur={() => touch("companyCountry")}
                className={controlClass("companyCountry")}
              >
                <option value="">Select country</option>
                {allCountries.map((c) => (
                  <option key={c.isoCode} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mobile *" error={showError("mobile")}>
              <div className="mt-1 flex gap-2">
                <select
                  value={phoneIso}
                  onChange={(e) => setPhoneIso(e.target.value)}
                  className={`w-[110px] shrink-0 rounded-xl border bg-white px-2 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:ring-2 ${
                    showError("mobile") ? errBorder : okBorder
                  }`}
                >
                  <option value="">Code</option>
                  {allCountries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>
                      {c.isoCode} +{callingCode(c.isoCode)}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) =>
                    setPhoneNumber(e.target.value.replace(/\D/g, ""))
                  }
                  onBlur={() => touch("mobile")}
                  placeholder="Phone number"
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-[13px] font-pmedium text-[#0F172A] outline-none focus:ring-2 ${
                    showError("mobile") ? errBorder : okBorder
                  }`}
                />
              </div>
            </Field>

            <Field label="State *" error={showError("companyState")}>
              {states.length ? (
                <select
                  value={fields.companyState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  onBlur={() => touch("companyState")}
                  className={controlClass("companyState")}
                >
                  <option value="">Select state</option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={fields.companyState}
                  disabled={!countryIso}
                  placeholder={countryIso ? "State / Region" : "Select a country first"}
                  onChange={(e) => handleStateChange(e.target.value)}
                  onBlur={() => touch("companyState")}
                  className={controlClass("companyState")}
                />
              )}
            </Field>

            <Field label="City *" error={showError("companyCity")}>
              {cityOptions.length ? (
                <select
                  value={fields.companyCity}
                  onChange={(e) => setField("companyCity", e.target.value)}
                  onBlur={() => touch("companyCity")}
                  className={controlClass("companyCity")}
                >
                  <option value="">Select city</option>
                  {cityOptions.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={fields.companyCity}
                  disabled={!fields.companyState}
                  placeholder={fields.companyState ? "City" : "Select a state first"}
                  onChange={(e) => setField("companyCity", e.target.value)}
                  onBlur={() => touch("companyCity")}
                  className={controlClass("companyCity")}
                />
              )}
            </Field>

            <Field label="Your Role *" error={showError("role")}>
              <select
                value={fields.role}
                onChange={(e) => setField("role", e.target.value)}
                onBlur={() => touch("role")}
                className={controlClass("role")}
              >
                <option value="">Select role</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Registered Company Name *"
              error={showError("registeredCompanyName")}
            >
              <input
                type="text"
                value={fields.registeredCompanyName}
                onChange={(e) => setField("registeredCompanyName", e.target.value)}
                onBlur={() => touch("registeredCompanyName")}
                className={controlClass("registeredCompanyName")}
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Website (optional)" error={showError("websiteUrl")}>
                <input
                  type="text"
                  value={fields.websiteUrl}
                  onChange={(e) => setField("websiteUrl", e.target.value)}
                  onBlur={() => touch("websiteUrl")}
                  placeholder="https://example.com"
                  className={controlClass("websiteUrl")}
                />
              </Field>
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>
              Industry / Type of Vertical (from your listings)
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {industry.length ? (
                industry.map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-pmedium text-slate-600"
                  >
                    {i}
                  </span>
                ))
              ) : (
                <span className="text-[12px] font-pmedium text-slate-400">
                  None detected
                </span>
              )}
            </div>
          </div>

          <div className="mt-5">
            <label className={labelClass}>Proof Documents</label>
            <p className="mt-1 text-[11px] font-pmedium text-slate-400">
              PDF, JPG, PNG or WEBP, up to 5MB each. Fields marked * are required.
            </p>
            <div className="mt-2 flex flex-col gap-2.5">
              {documentTypes.map((d) => {
                const file = files[d.key];
                const existing =
                  existingDocs[d.key] && !removedExisting[d.key]
                    ? existingDocs[d.key]
                    : null;
                const docError = submitted ? errors[`doc_${d.key}`] : undefined;
                return (
                  <div
                    key={d.key}
                    data-invalid={docError ? "true" : undefined}
                    className={`flex flex-col gap-2 rounded-xl border px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      docError ? "border-rose-400" : "border-slate-200/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-pmedium text-slate-900">
                        {d.label}
                        {d.required ? <span className="text-rose-500"> *</span> : null}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] font-pmedium text-slate-500">
                        <FileText size={12} className="shrink-0" />
                        {file
                          ? file.name
                          : existing
                            ? "On file from your last submission"
                            : "No file chosen"}
                      </p>
                      {docError ? (
                        <p className="mt-0.5 text-[11px] font-pmedium text-rose-600">
                          {docError}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {(file || existing) && (
                        <button
                          type="button"
                          title="Preview"
                          onClick={() =>
                            window.open(
                              file ? URL.createObjectURL(file) : existing.url,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Eye size={15} />
                        </button>
                      )}
                      {file && (
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => clearFile(d.key)}
                          className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                        >
                          <X size={15} />
                        </button>
                      )}
                      <input
                        ref={(el) => {
                          inputRefs.current[d.key] = el;
                        }}
                        type="file"
                        hidden
                        accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
                        onChange={(e) => handleFile(d.key, e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => inputRefs.current[d.key]?.click()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#2563EB]/30 bg-white px-3 py-1.5 text-[10px] font-pmedium uppercase tracking-wider text-[#2563EB] hover:bg-blue-50"
                      >
                        <Upload size={12} />
                        {file || existing ? "Replace" : "Choose File"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <label className={labelClass}>
              Plan — you'll pay for this plan once your request is approved
            </label>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {TIER_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTier(t.value)}
                  className={`rounded-xl border px-2 py-3 text-center transition-colors ${
                    tier === t.value ? "border-[#2563EB] bg-blue-50" : "border-slate-200"
                  }`}
                >
                  <div className="font-pmedium text-slate-900">${t.price}</div>
                  <div className="text-[10px] font-pmedium text-slate-500">{t.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitMutation.isPending}
            onClick={handleSubmit}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-[12px] font-pmedium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitMutation.isPending
              ? "Submitting..."
              : previous
                ? "Resubmit for Review"
                : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyBusinessForm;
