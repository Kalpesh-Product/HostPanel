import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { City, Country, State } from "country-state-city";
import { Autocomplete, TextField } from "@mui/material";
import Footer from "../../components/Footer";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import { toast } from "sonner";
import useAuth from "../../hooks/useAuth";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { readInviteOnboardingState } from "../../utils/inviteOnboarding";

interface CountryOption {
  name: string;
  isoCode: string;
  flag: string;
}

interface StateOption {
  name: string;
  isoCode: string;
}

interface CityOption {
  name: string;
}

const getFlagUrl = (isoCode: string) =>
  `https://flagcdn.com/w40/${String(isoCode || "").toLowerCase()}.png`;

const normalizeCountryName = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const countries = Country.getAllCountries();
  const byName = countries.find(
    (item) => item.name.toLowerCase() === raw.toLowerCase(),
  );
  if (byName) return byName.name;
  const byIso = countries.find(
    (item) => item.isoCode.toLowerCase() === raw.toLowerCase(),
  );
  return byIso?.name || raw;
};

const normalizeStateName = (countryName: string, value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw || !countryName) return "";
  const country = Country.getAllCountries().find(
    (item) => item.name.toLowerCase() === countryName.toLowerCase(),
  );
  if (!country?.isoCode) return raw;
  const statesOfCountry = State.getStatesOfCountry(country.isoCode);
  const byName = statesOfCountry.find(
    (item) => item.name.toLowerCase() === raw.toLowerCase(),
  );
  if (byName) return byName.name;
  const byIso = statesOfCountry.find(
    (item) => item.isoCode.toLowerCase() === raw.toLowerCase(),
  );
  return byIso?.name || raw;
};

const normalizeBusinessTypes = (values: unknown): string[] => {
  const input = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  const aliasMap: Record<string, string> = {
    coworking: "Co-Working",
    "co-working": "Co-Working",
    "co working": "Co-Working",
    "co-working space": "Co-Working",
    "coworking space": "Co-Working",
    coliving: "Co-Living",
    "co-living": "Co-Living",
    "co living": "Co-Living",
    workation: "Workation",
    cafe: "Cafe",
    hostels: "Hostels",
    hostel: "Hostels",
    "hostel stay": "Hostels",
    "meeting room": "Meeting Rooms",
    "meeting rooms": "Meeting Rooms",
    meetings: "Meeting Rooms",
  };

  const normalized = input
    .map((item) => {
      const original = String(item || "").trim();
      const lower = original.toLowerCase();
      if (aliasMap[lower]) return aliasMap[lower];
      if (lower.includes("cowork")) return "Co-Working";
      if (lower.includes("co-work")) return "Co-Working";
      if (lower.includes("co liv") || lower.includes("coliv")) return "Co-Living";
      if (lower.includes("workation")) return "Workation";
      if (lower.includes("cafe")) return "Cafe";
      if (lower.includes("hostel")) return "Hostels";
      if (lower.includes("meeting")) return "Meeting Rooms";
      return original;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const CreateWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const initialWorkspaceDetails = location.state?.workspaceDetails || {};
  const authUserEmail = String(
    ((auth.user as { email?: string } | null)?.email || ""),
  );
  const inviteOnboarding = readInviteOnboardingState();
  const activeInviteOnboarding =
    inviteOnboarding?.email &&
    inviteOnboarding.email === authUserEmail
      ? inviteOnboarding
      : null;
  const normalizedInviteCountry = normalizeCountryName(
    activeInviteOnboarding?.country || "",
  );
  const normalizedInviteState = normalizeStateName(
    normalizedInviteCountry,
    activeInviteOnboarding?.state || "",
  );
  const normalizedInviteBusinessTypes = normalizeBusinessTypes(
    activeInviteOnboarding?.businessTypes || [],
  );
  const initialCountryValue = String(
    location.state?.workspaceDetails?.country || normalizedInviteCountry || "",
  ).trim();
  const initialStateValue = String(
    location.state?.workspaceDetails?.state || normalizedInviteState || "",
  ).trim();
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);

  const [country, setCountry] = useState(
    location.state?.workspaceDetails?.country || normalizedInviteCountry || "",
  );
  const [stateName, setStateName] = useState(
    location.state?.workspaceDetails?.state || normalizedInviteState || "",
  );
  const [city, setCity] = useState(
    location.state?.workspaceDetails?.city || activeInviteOnboarding?.city || "",
  );
  const [address, setAddress] = useState(
    location.state?.workspaceDetails?.address || "",
  );
  const [workspaceName, setWorkspaceName] = useState(
    location.state?.workspaceDetails?.workspaceName || "",
  );
  const [businessName, setBusinessName] = useState(
    location.state?.workspaceDetails?.businessName ||
      activeInviteOnboarding?.businessName ||
      "",
  );
  const [brandName, setBrandName] = useState(
    location.state?.workspaceDetails?.brandName || "",
  );
  const [businessTypes, setBusinessTypes] = useState<string[]>(
    Array.isArray(location.state?.workspaceDetails?.businessTypes)
      ? normalizeBusinessTypes(location.state.workspaceDetails.businessTypes)
      : Array.isArray(normalizedInviteBusinessTypes)
      ? normalizedInviteBusinessTypes
      : [],
  );
  const [isBusinessTypeOpen, setIsBusinessTypeOpen] = useState(false);
  const businessTypeDropdownRef = useRef<HTMLDivElement | null>(null);
  const [usedVerticals, setUsedVerticals] = useState<string[]>([]);
  const [workspaceNameStatus, setWorkspaceNameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [workspaceNameMessage, setWorkspaceNameMessage] = useState("");
  const selectedPlanFromInviteOrState =
    location.state?.selectedPlan || activeInviteOnboarding?.selectedPlan || "basic";
  const isAdditionalWorkspaceMode = Boolean(location.state?.additionalWorkspaceMode);
  const selectedCountryOption =
    countries.find((item) => item.name === country) || null;
  const selectedStateOption =
    states.find((item) => item.name === stateName) || null;
  const hasLockedInviteCountry = Boolean(normalizedInviteCountry);
  const hasLockedInviteState = Boolean(
    normalizedInviteState &&
      states.some((item) => item.name.toLowerCase() === normalizedInviteState.toLowerCase()),
  );
  const hasLockedInviteCity = Boolean(
    activeInviteOnboarding?.city &&
      cities.some(
        (item) =>
          item.name.toLowerCase() ===
          String(activeInviteOnboarding.city || "").trim().toLowerCase(),
      ),
  );
  const hasLockedInviteBusinessTypes = Boolean(
    activeInviteOnboarding?.businessTypes?.length &&
      businessTypes.length,
  );
  const isCompanyNameLocked = Boolean(
    activeInviteOnboarding?.businessName ||
      (isAdditionalWorkspaceMode && businessName.trim()),
  );
  const isBrandNameLocked = Boolean(
    isAdditionalWorkspaceMode && brandName.trim(),
  );

  const [isCountriesLoading, setIsCountriesLoading] = useState(false);
  const [isStatesLoading, setIsStatesLoading] = useState(false);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const allBusinessTypes = [
    "Co-Working",
    "Co-Living",
    "Workation",
    "Cafe",
    "Hostels",
    "Meeting Rooms",
  ];

  const toggleBusinessType = (type: string) => {
    if (isAdditionalWorkspaceMode && usedVerticals.includes(type) && !businessTypes.includes(type)) {
      return;
    }
    setBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((item) => item !== type) : [...prev, type],
    );
  };

  const businessTypeLabel =
    businessTypes.length > 0
      ? businessTypes.join(", ")
      : "Select your Business Types";

  const isWorkspaceFormComplete = [
    workspaceName.trim(),
    businessName.trim(),
    brandName.trim(),
    country.trim(),
    stateName.trim(),
    city.trim(),
    address.trim(),
  ].every(Boolean) &&
    businessTypes.length > 0 &&
    workspaceNameStatus !== "taken" &&
    workspaceNameStatus !== "checking";

  useEffect(() => {
    let active = true;
    const loadCountries = async () => {
      try {
        setIsCountriesLoading(true);
        const result = Country.getAllCountries()
          .map((item) => ({
          name: item.name,
          isoCode: item.isoCode,
          flag: item.flag,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (active) setCountries(result);
      } catch (error: unknown) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Failed to load countries.",
          );
        }
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
    if (!country) {
      setStates([]);
      setStateName("");
      setCities([]);
      setCity("");
      return;
    }

    const loadStates = async () => {
      try {
        setIsStatesLoading(true);
        setStates([]);
        if (country !== initialCountryValue) {
          setStateName("");
          setCities([]);
          setCity("");
        }
        const result = State.getStatesOfCountry(selectedCountryOption?.isoCode || "")
          .map((item) => ({
            name: item.name,
            isoCode: item.isoCode,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (active) setStates(result);
      } catch (error: unknown) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Failed to load states.");
        }
      } finally {
        if (active) setIsStatesLoading(false);
      }
    };
    loadStates();

    return () => {
      active = false;
    };
  }, [country, initialCountryValue, selectedCountryOption?.isoCode]);

  useEffect(() => {
    let active = true;
    if (!country || !stateName) {
      setCities([]);
      setCity("");
      return;
    }

    const loadCities = async () => {
      try {
        setIsCitiesLoading(true);
        setCities([]);
        if (stateName !== initialStateValue) {
          setCity("");
        }
        const result = City.getCitiesOfState(
          selectedCountryOption?.isoCode || "",
          selectedStateOption?.isoCode || "",
        )
          .map((item) => ({
            name: item.name,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        if (active) setCities(result);
      } catch (error: unknown) {
        if (active) {
          toast.error(error instanceof Error ? error.message : "Failed to load cities.");
        }
      } finally {
        if (active) setIsCitiesLoading(false);
      }
    };
    loadCities();

    return () => {
      active = false;
    };
  }, [
    country,
    stateName,
    initialStateValue,
    selectedCountryOption?.isoCode,
    selectedStateOption?.isoCode,
  ]);

  useEffect(() => {
    if (!isAdditionalWorkspaceMode) {
      setUsedVerticals([]);
      return;
    }
    let active = true;
    const loadUsedVerticals = async () => {
      try {
        const response = await axiosPrivate.get("/api/workspaces/management");
        const workspaces = Array.isArray(response?.data?.data?.workspaces)
          ? response.data.data.workspaces
          : [];
        const verticals = new Set<string>();
        for (const workspace of workspaces) {
          const values = String(workspace?.businessType || "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
          for (const value of values) {
            verticals.add(value);
          }
        }
        if (active) {
          setUsedVerticals(Array.from(verticals));
        }
      } catch {
        if (active) setUsedVerticals([]);
      }
    };
    void loadUsedVerticals();
    return () => {
      active = false;
    };
  }, [axiosPrivate, isAdditionalWorkspaceMode]);

  useEffect(() => {
    const normalized = workspaceName.trim();
    if (!normalized) {
      setWorkspaceNameStatus("idle");
      setWorkspaceNameMessage("");
      return;
    }
    setWorkspaceNameStatus("checking");
    const timeoutId = setTimeout(async () => {
      try {
        const response = await axiosPrivate.get("/api/workspaces/validate-name", {
          params: { workspaceName: normalized },
        });
        const apiAvailable = response?.data?.data?.available;
        const rootAvailable = response?.data?.available;
        const available =
          typeof apiAvailable === "boolean"
            ? apiAvailable
            : typeof rootAvailable === "boolean"
            ? rootAvailable
            : null;
        if (available === null) {
          setWorkspaceNameStatus("idle");
          setWorkspaceNameMessage(
            "Could not confirm name availability right now. We'll re-check on continue.",
          );
          return;
        }
        setWorkspaceNameStatus(available ? "available" : "taken");
        setWorkspaceNameMessage(
          available ? "Workspace name is available." : "Workspace name already taken.",
        );
      } catch (error: unknown) {
        const message = (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message;
        setWorkspaceNameStatus("idle");
        setWorkspaceNameMessage(
          message || "Unable to validate workspace name right now. We'll re-check on continue.",
        );
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [axiosPrivate, workspaceName]);

  useEffect(() => {
    if (!isBusinessTypeOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        businessTypeDropdownRef.current &&
        !businessTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBusinessTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isBusinessTypeOpen]);

  return (
    <div className="min-h-screen bg-white text-[#0f172a] font-['Poppins'] flex flex-col">
      <div className="shadow-md bg-white/80 backdrop-blur-md">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-0">
          <div className="flex items-center py-3">
            <a href="https://wono.co">
              <img src={logo} alt="wono" className="w-28 sm:w-36 h-auto" />
            </a>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12">
        <div className="w-full max-w-[900px] mx-auto">
          <div className="mb-8 sm:mb-10">
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#8da0bd] uppercase mb-4">
            Progress
          </p>
          <div className="flex flex-col md:flex-row md:items-center w-full gap-4 md:gap-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#dce9ff] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#2d67f0] text-white text-sm font-bold flex items-center justify-center">
                  1
                </div>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-[#233552]">Business Location</span>
                <span className="text-[11px] text-[#6d9bff] font-semibold">
                  Current step
                </span>
              </div>
            </div>

            <div className="hidden md:block flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#c8cfda] bg-transparent text-[#c8cfda] text-sm font-bold flex items-center justify-center">
                2
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-[#233552]">Finalize Setup</span>
                <span className="text-[11px] text-[#9aa8bc] font-semibold">Next</span>
              </div>
            </div>

          </div>
        </div>

          <div className="text-center mb-6 sm:mb-7">
            <h1 className="text-[26px] sm:text-[30px] md:text-[38px] font-bold text-[#111b33] mb-3 sm:mb-4">
              CREATE NEW BUSINESS LOCATION
            </h1>
          <p className="text-sm md:text-[15px] text-[#63738d]">
            Start with the main identity of your business location. You can still refine and
            expand it after setup.
          </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isWorkspaceFormComplete) {
                if (workspaceNameStatus === "taken") {
                  toast.error("Workspace name already taken.");
                }
                return;
              }
              navigate("/create-workspace/finalize", {
                state: {
                  workspaceDetails: {
                    workspaceName,
                    businessName,
                    brandName,
                    country,
                    state: stateName,
                    city,
                    address,
                    businessTypes,
                  },
                  selectedPlan: selectedPlanFromInviteOrState,
                  additionalWorkspaceMode: isAdditionalWorkspaceMode,
                },
              });
            }}
            className="space-y-4"
          >
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
              <div className="flex flex-col">
                <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Unique workspace name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] placeholder:text-[#9aa6b9] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
                />
                {workspaceNameStatus !== "idle" ? (
                  <p
                    className={`mt-1 text-[11px] font-semibold ${
                      workspaceNameStatus === "available" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {workspaceNameStatus === "checking" ? "Checking workspace name..." : workspaceNameMessage}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="Enter company name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isCompanyNameLocked}
                  className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] placeholder:text-[#9aa6b9] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  placeholder="Enter brand name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  disabled={isBrandNameLocked}
                  className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] placeholder:text-[#9aa6b9] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
                />
              </div>
            </div>
            <p className="text-[13px] text-[#63738d] mt-3">
              This is the main name your members will see throughout the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <div className="flex flex-col md:col-span-2">
              <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                Address
              </label>
              <input
                type="text"
                placeholder="Enter your address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] placeholder:text-[#9aa6b9] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                Country
              </label>
              <Autocomplete
                  options={countries}
                  value={selectedCountryOption}
                  onChange={(_, newValue) => setCountry(newValue?.name || "")}
                disabled={isCountriesLoading || hasLockedInviteCountry}
                  getOptionLabel={(option) => option.name}
                  isOptionEqualToValue={(option, value) => option.isoCode === value.isoCode}
                  noOptionsText="No countries found"
                  sx={{
                    "& .MuiAutocomplete-paper": {
                      marginTop: "6px",
                      borderRadius: "8px",
                      boxShadow: "0 8px 32px rgba(15, 23, 42, 0.15)",
                    },
                    "& .MuiAutocomplete-endAdornment": {
                      right: "10px",
                      gap: "2px",
                    },
                    "& .MuiAutocomplete-clearIndicator, & .MuiAutocomplete-popupIndicator": {
                      padding: "4px",
                    },
                    "& .MuiAutocomplete-listbox": {
                      padding: "8px 0px",
                    },
                    "& .MuiAutocomplete-option": {
                      minHeight: "44px !important",
                      padding: "8px 16px 8px 24px !important",
                      borderRadius: "12px",
                      // 1. THIS ADDS THE VERTICAL GAP BETWEEN ROWS
                      marginBottom: "8px !important", 
                    },
                    "& .MuiAutocomplete-option:last-of-type": {
                      marginBottom: "0 !important",
                    },
                  }}
                    renderOption={(props, option) => (
                      <li
                        {...props}
                        key={option.isoCode}
                        // 2. ADDED ${props.className} SO THE MARGIN-BOTTOM ABOVE ACTUALLY APPLIES
                        className={`${props.className} flex items-center gap-4 text-[13px] text-[#334155]`}
                      >
                        <img
                          src={getFlagUrl(option.isoCode)}
                          alt={`${option.name} flag`}
                          className="h-4 w-6 shrink-0 rounded-[3px] object-cover shadow-sm"
                          loading="lazy"
                        />
                        <span className="leading-none tracking-[0.01em]">{option.name}</span>
                      </li>
                    )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={isCountriesLoading ? "Loading countries..." : "Select country"}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        minHeight: "32px",
                        height: "42px",
                        borderRadius: "12px",
                        backgroundColor: "#f2f4f8",
                        fontSize: "10px",
                        color: "#334155",
                        paddingLeft: "6px",
                        paddingRight: "8px",
                        alignItems: "center",
                        "& fieldset": {
                          borderColor: "#d2d9e5",
                        },
                        "&:hover fieldset": {
                          borderColor: "#d2d9e5",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "#bcd0ff",
                          boxShadow: "0 0 0 2px rgba(188, 208, 255, 0.45)",
                        },
                        "&.Mui-disabled": {
                          opacity: 1,
                        },
                      },
                      "& .MuiOutlinedInput-input": {
                        padding: "4px 8px",
                      },
                      "& .MuiInputBase-input.Mui-disabled": {
                        WebkitTextFillColor: "#334155 !important",
                        color: "#334155",
                        opacity: 1,
                        fontWeight: 500,
                      },
                      "& .MuiAutocomplete-input": {
                        minWidth: "36px",
                      },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: selectedCountryOption ? (
                        <div className="flex items-center gap-2 pl-1">
                          <img
                            src={getFlagUrl(selectedCountryOption.isoCode)}
                            alt={`${selectedCountryOption.name} flag`}
                            className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm"
                          />
                          {params.InputProps.startAdornment}
                        </div>
                      ) : (
                        params.InputProps.startAdornment
                      ),
                    }}
                  />
                )}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                State
              </label>
              <select
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                disabled={!country || isStatesLoading || hasLockedInviteState}
                className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:bg-[#eef1f5] disabled:text-[#334155] disabled:font-medium disabled:opacity-100"
              >
                <option value="">
                  {!country
                    ? "Select country first"
                    : isStatesLoading
                    ? "Loading states..."
                    : "Select state"}
                </option>
                {states.map((item) => (
                  <option key={item.isoCode} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <div className="flex flex-col">
              <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                City
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={
                  !country || !stateName || isCitiesLoading || hasLockedInviteCity
                }
                className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:bg-[#eef1f5] disabled:text-[#334155] disabled:font-medium disabled:opacity-100"
              >
                <option value="">
                  {!country || !stateName
                    ? "Select country and state first"
                    : isCitiesLoading
                    ? "Loading cities..."
                    : "Select city"}
                </option>
                {cities.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                Type of Vertical
              </label>
              <div ref={businessTypeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (hasLockedInviteBusinessTypes) return;
                    setIsBusinessTypeOpen((prev) => !prev);
                  }}
                  disabled={hasLockedInviteBusinessTypes}
                  className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-[#334155] text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
                >
                  <span className={businessTypes.length ? "text-[#334155]" : "text-[#8d99ad]"}>
                    {businessTypeLabel}
                  </span>
                  <ChevronDown size={16} className="text-[#8d99ad]" />
                </button>

                {isBusinessTypeOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-[#d2d9e5] bg-white shadow-lg p-3 max-h-52 overflow-auto">
                    <div className="grid grid-cols-1 gap-y-2">
                      {allBusinessTypes.map((type) => {
                        const isLockedVertical =
                          isAdditionalWorkspaceMode &&
                          usedVerticals.includes(type) &&
                          !businessTypes.includes(type);
                        return (
                          <label
                            key={type}
                            className={`inline-flex items-center gap-2 text-[13px] ${
                              isLockedVertical ? "text-[#9aa6b9]" : "text-[#334155] cursor-pointer"
                            } select-none`}
                          >
                            <input
                              type="checkbox"
                              checked={businessTypes.includes(type)}
                              disabled={isLockedVertical}
                              onChange={() => toggleBusinessType(type)}
                              className="h-3.5 w-3.5 accent-[#7d9de8]"
                            />
                            <span>{type}{isLockedVertical ? " (already used)" : ""}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-[#e1e6ef] mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-[13px] text-[#63738d]">
              You can update these details later from workspace settings.
            </p>
            <button
              type="submit"
              disabled={!isWorkspaceFormComplete}
              className="h-10 w-full sm:w-auto px-7 rounded-xl bg-[#2d67f0] hover:bg-[#2558d5] disabled:bg-[#c8d5f1] disabled:text-white/80 disabled:cursor-not-allowed transition-colors text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CreateWorkspacePage;
