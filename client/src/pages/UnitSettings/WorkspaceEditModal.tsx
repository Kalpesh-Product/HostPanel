import { FormEvent, useEffect, useRef, useState } from "react";
import { Country } from "country-state-city";
import { CheckCircle2, Loader2 } from "lucide-react";
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

  const selectClassName =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50 disabled:opacity-60";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">Edit Unit</p>
            <p className="mt-1 text-[12px] font-pmedium text-slate-500">
              Update the unit name, brand name, address, location, timezone, currency, and business verticals. Company name can't be changed here. Timezone and currency follow the selected country automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-[12px] font-pmedium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2">
            <span className={labelClassName}>
              Unit Name
            </span>
            <input
              value={form.workspaceName}
              onChange={(event) => onChange("workspaceName", event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
              required
              maxLength={120}
            />
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>Company Name</span>
            <input
              value={businessName || ""}
              disabled
              readOnly
              className="h-11 rounded-xl border border-slate-200 bg-slate-100 px-3.5 text-sm font-pmedium text-slate-500 outline-none cursor-not-allowed"
            />
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>
              Brand Name
            </span>
            <input
              value={form.brandName}
              onChange={(event) => onChange("brandName", event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
              maxLength={120}
            />
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>
              Country
            </span>
            <div className="relative">
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
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>
              State
            </span>
            <div className="relative">
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
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>
              City
            </span>
            <div className="relative">
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
          </label>

          <label className="grid gap-2 md:col-span-2">
            <span className={labelClassName}>
              Address
            </span>
            <input
              value={form.address}
              onChange={(event) => onChange("address", event.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50"
              maxLength={250}
            />
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>
              Timezone
            </span>
            <div className="relative">
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
          </label>

          <label className="grid gap-2">
            <span className={labelClassName}>
              Currency
            </span>
            <div className="relative">
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
          </label>

          <div ref={businessTypeDropdownRef} className="grid gap-2 md:col-span-2">
            <span className={labelClassName}>
              Type of Vertical
            </span>
            <button
              type="button"
              onClick={() => setIsBusinessTypeOpen((prev) => !prev)}
              disabled={isSaving}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm font-pmedium text-slate-900 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-50 disabled:opacity-60"
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
            <p className="text-[11px] text-slate-400">
              Business verticals can only be changed by the founder.
            </p>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-pmedium text-white shadow-sm transition hover:bg-primary/95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
