import { FormEvent, useEffect, useRef, useState } from "react";
import { Country } from "country-state-city";
import { Building2, Globe2, Layers, Loader2, MapPin, Pencil, X } from "lucide-react";
import { getCities, getStates } from "../../utils/locationApi";
import { inferWorkspaceTimeZone } from "../../lib/workspaceLocalization";

export interface EditUnitForm {
  workspaceName: string;
  brandName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  timezone: string;
  currency: string;
  businessTypes: string[];
}

export const EMPTY_EDIT_FORM: EditUnitForm = {
  workspaceName: "",
  brandName: "",
  address: "",
  city: "",
  state: "",
  country: "",
  countryCode: "",
  timezone: "",
  currency: "",
  businessTypes: [],
};

export const ALL_BUSINESS_TYPES = [
  "Co-Working",
  "Co-Living",
  "Workation",
  "Cafe",
  "Hostels",
  "Meeting Rooms",
];

interface CountryTimeZoneOption {
  zoneName: string;
  gmtOffsetName?: string;
}

interface CountryOption {
  name: string;
  isoCode: string;
  currency: string;
  timezones: CountryTimeZoneOption[];
}

interface WorkspaceEditModalProps {
  form: EditUnitForm;
  businessName?: string;
  isSaving: boolean;
  onChange: <K extends keyof EditUnitForm>(field: K, value: EditUnitForm[K]) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}

export default function WorkspaceEditModal({
  form,
  businessName,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: WorkspaceEditModalProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isCountriesLoading, setIsCountriesLoading] = useState(false);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [isBusinessTypeOpen, setIsBusinessTypeOpen] = useState(false);
  const businessTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const timezoneTouchedRef = useRef(false);

  const selectedCountryOption =
    countries.find((item) => item.name === form.country) || null;
  const timezoneOptions = Array.from(
    new Map(
      (selectedCountryOption?.timezones || [])
        .filter((item) => item?.zoneName)
        .map((item) => [item.zoneName, item]),
    ).values(),
  );
  const currencyOptions = Array.from(
    new Set(countries.map((item) => item.currency).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const inputClassName =
    "w-full px-3 py-2 bg-white border border-slate-200/60 rounded-lg text-[12px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] placeholder:text-slate-400 disabled:bg-slate-50 disabled:cursor-not-allowed";

  const selectClassName = `${inputClassName} cursor-pointer`;

  const labelClassName =
    "text-[10px] font-pmedium text-slate-500 uppercase tracking-widest";

  const inferNextTimezone = (
    record: CountryOption,
    stateName: string,
    cityName: string,
  ) => {
    const availableZones = record.timezones
      .map((item) => item.zoneName)
      .filter(Boolean);
    const inferred = inferWorkspaceTimeZone({
      countryCode: record.isoCode,
      countryName: record.name,
      stateName,
      cityName,
      availableTimeZones: availableZones,
    });
    return availableZones.includes(inferred)
      ? inferred
      : availableZones[0] || "UTC";
  };

  useEffect(() => {
    let active = true;
    const loadCountries = async () => {
      try {
        setIsCountriesLoading(true);
        const result = Country.getAllCountries()
          .map((item) => ({
            name: item.name,
            isoCode: item.isoCode,
            currency: String(item.currency || "").trim().toUpperCase(),
            timezones: Array.isArray(item.timezones)
              ? item.timezones.map((entry) => ({
                  zoneName: String(entry.zoneName || "").trim(),
                  gmtOffsetName: String(entry.gmtOffsetName || "").trim(),
                }))
              : [],
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (active) setCountries(result);
      } catch {
        if (active) setCountries([]);
      } finally {
        if (active) setIsCountriesLoading(false);
      }
    };
    loadCountries();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadStates = async () => {
      if (!form.country) {
        setStates([]);
        return;
      }
      try {
        setIsStatesLoading(true);
        const result = await getStates(form.country);
        if (active) setStates(result);
      } catch {
        if (active) setStates([]);
      } finally {
        if (active) setIsStatesLoading(false);
      }
    };
    loadStates();
    return () => {
      active = false;
    };
  }, [form.country]);

  useEffect(() => {
    let active = true;
    const loadCities = async () => {
      if (!form.country || !form.state) {
        setCities([]);
        return;
      }
      try {
        setIsCitiesLoading(true);
        const result = await getCities(form.country, form.state);
        if (active) setCities(result);
      } catch {
        if (active) setCities([]);
      } finally {
        if (active) setIsCitiesLoading(false);
      }
    };
    loadCities();
    return () => {
      active = false;
    };
  }, [form.country, form.state]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        businessTypeDropdownRef.current &&
        !businessTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBusinessTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountryChange = (countryName: string) => {
    onChange("country", countryName);
    onChange("state", "");
    onChange("city", "");
    const record = countries.find((item) => item.name === countryName);
    onChange("countryCode", record?.isoCode || "");
    onChange("currency", record?.currency || "");
    timezoneTouchedRef.current = false;
    onChange("timezone", record ? inferNextTimezone(record, "", "") : "");
  };

  const handleStateChange = (nextState: string) => {
    onChange("state", nextState);
    onChange("city", "");
    const record = countries.find((item) => item.name === form.country);
    if (record && !timezoneTouchedRef.current) {
      onChange("timezone", inferNextTimezone(record, nextState, ""));
    }
  };

  const handleCityChange = (nextCity: string) => {
    onChange("city", nextCity);
    const record = countries.find((item) => item.name === form.country);
    if (record && !timezoneTouchedRef.current) {
      onChange("timezone", inferNextTimezone(record, form.state, nextCity));
    }
  };

  const toggleBusinessType = (type: string) => {
    onChange(
      "businessTypes",
      form.businessTypes.includes(type)
        ? form.businessTypes.filter((item) => item !== type)
        : [...form.businessTypes, type],
    );
  };

  const businessTypeLabel =
    form.businessTypes.length > 0
      ? form.businessTypes.join(", ")
      : "Select your Business Types";

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[95vh] rounded-t-[32px] sm:rounded-[32px] shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:shadow-[0_16px_40px_rgba(15,23,42,0.12)] border-t sm:border border-white/80 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
        <div className="p-5 sm:p-6 md:p-8 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Pencil size={18} />
            </div>
            <div>
              <h3 className="text-[15px] font-pmedium text-slate-900">Edit Unit</h3>
              <p className="text-[12px] text-slate-500">Company name can't be changed here. Timezone and currency follow the selected country.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-4 [&::-webkit-scrollbar]:hidden bg-slate-50/30">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Building2 size={16} /></span>
              <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Unit Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClassName}>Unit Name <span className="text-red-400">*</span></label>
                <input
                  value={form.workspaceName}
                  onChange={(event) => onChange("workspaceName", event.target.value)}
                  className={inputClassName}
                  required
                  maxLength={120}
                  placeholder="e.g. Bandra Coworking Hub"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClassName}>Company Name</label>
                <input
                  value={businessName || ""}
                  disabled
                  readOnly
                  className={`${inputClassName} bg-slate-50 text-slate-500 cursor-not-allowed`}
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className={labelClassName}>Brand Name</label>
                <input
                  value={form.brandName}
                  onChange={(event) => onChange("brandName", event.target.value)}
                  className={inputClassName}
                  maxLength={120}
                  placeholder="Public-facing brand name"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><MapPin size={16} /></span>
              <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Location</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClassName}>Country</label>
                <select
                  value={form.country}
                  onChange={(event) => handleCountryChange(event.target.value)}
                  disabled={isSaving}
                  className={selectClassName}
                >
                  <option value="">
                    {isCountriesLoading ? "Loading countries..." : "Select country"}
                  </option>
                  {countries.map((item) => (
                    <option key={item.isoCode} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClassName}>State</label>
                <select
                  value={form.state}
                  onChange={(event) => handleStateChange(event.target.value)}
                  disabled={!form.country || isStatesLoading || isSaving}
                  className={selectClassName}
                >
                  <option value="">
                    {!form.country
                      ? "Select country first"
                      : isStatesLoading
                      ? "Loading states..."
                      : "Select state"}
                  </option>
                  {states.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClassName}>City</label>
                <select
                  value={form.city}
                  onChange={(event) => handleCityChange(event.target.value)}
                  disabled={!form.country || !form.state || isCitiesLoading || isSaving}
                  className={selectClassName}
                >
                  <option value="">
                    {!form.country || !form.state
                      ? "Select country and state first"
                      : isCitiesLoading
                      ? "Loading cities..."
                      : "Select city"}
                  </option>
                  {cities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClassName}>Address</label>
                <input
                  value={form.address}
                  onChange={(event) => onChange("address", event.target.value)}
                  className={inputClassName}
                  maxLength={250}
                  placeholder="Street, building, floor"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Globe2 size={16} /></span>
              <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Locale</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClassName}>Timezone</label>
                <select
                  value={form.timezone}
                  onChange={(event) => {
                    timezoneTouchedRef.current = true;
                    onChange("timezone", event.target.value);
                  }}
                  disabled={!form.country || isSaving}
                  className={selectClassName}
                >
                  <option value="">Select timezone</option>
                  {timezoneOptions.map((item) => (
                    <option key={item.zoneName} value={item.zoneName}>
                      {item.zoneName}
                      {item.gmtOffsetName ? ` (${item.gmtOffsetName})` : ""}
                    </option>
                  ))}
                  {!timezoneOptions.length && form.country ? (
                    <option value="UTC">UTC</option>
                  ) : null}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClassName}>Currency</label>
                <select
                  value={form.currency}
                  onChange={(event) => onChange("currency", event.target.value)}
                  disabled={!form.country || isSaving}
                  className={selectClassName}
                >
                  <option value="">Select currency</option>
                  {currencyOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <h4 className="flex items-center gap-2.5 border-b border-slate-200/80 pb-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0"><Layers size={16} /></span>
              <span className="text-[12px] font-pmedium text-primary uppercase tracking-[0.16em]">Business</span>
            </h4>
            <div ref={businessTypeDropdownRef} className="flex flex-col gap-1">
              <label className={labelClassName}>Type of Vertical</label>
              <button
                type="button"
                onClick={() => setIsBusinessTypeOpen((prev) => !prev)}
                disabled={isSaving}
                className={`${inputClassName} text-left`}
              >
                <span className="truncate">{businessTypeLabel}</span>
              </button>
              {isBusinessTypeOpen ? (
                <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3 shadow-lg max-h-52 overflow-auto">
                  <div className="grid grid-cols-1 gap-y-2">
                    {ALL_BUSINESS_TYPES.map((type) => (
                      <label
                        key={type}
                        className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px] text-[#334155]"
                      >
                        <input
                          type="checkbox"
                          checked={form.businessTypes.includes(type)}
                          onChange={() => toggleBusinessType(type)}
                          className="h-3.5 w-3.5 accent-[#7d9de8]"
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <p className="mt-1 text-[11px] text-slate-400">
                Business verticals can only be changed by the founder.
              </p>
            </div>
          </div>

          <div className="pt-4 sm:pt-6 flex gap-3 border-t border-slate-200/60 flex-col-reverse sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-pmedium hover:bg-slate-50 transition-all text-[10px] uppercase disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#2563EB] text-white rounded-2xl font-pmedium text-[10px] shadow-sm hover:bg-blue-700 active:scale-95 transition-all uppercase flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Pencil size={13} />}
              {isSaving ? "SAVING..." : "UPDATE UNIT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
