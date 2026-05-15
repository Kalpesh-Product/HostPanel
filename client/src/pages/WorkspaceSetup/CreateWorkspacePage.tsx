import React, { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { City, Country, State } from "country-state-city";
import { Autocomplete, TextField } from "@mui/material";
import Footer from "../../components/Footer";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import { toast } from "sonner";
import useAuth from "../../hooks/useAuth";
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

const CreateWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);

  const [country, setCountry] = useState(
    location.state?.workspaceDetails?.country || "",
  );
  const [stateName, setStateName] = useState(
    location.state?.workspaceDetails?.state || "",
  );
  const [city, setCity] = useState(location.state?.workspaceDetails?.city || "");
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
      ? location.state.workspaceDetails.businessTypes
      : [],
  );
  const [isBusinessTypeOpen, setIsBusinessTypeOpen] = useState(false);
  const selectedPlanFromInviteOrState =
    location.state?.selectedPlan || activeInviteOnboarding?.selectedPlan || "basic";
  const selectedCountryOption =
    countries.find((item) => item.name === country) || null;
  const selectedStateOption =
    states.find((item) => item.name === stateName) || null;

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
  ].every(Boolean) && businessTypes.length > 0;

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
        if (country !== initialWorkspaceDetails.country) {
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
  }, [country, initialWorkspaceDetails.country, selectedCountryOption?.isoCode]);

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
        if (stateName !== initialWorkspaceDetails.state) {
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
    initialWorkspaceDetails.state,
    selectedCountryOption?.isoCode,
    selectedStateOption?.isoCode,
  ]);

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#0f172a] font-['Poppins'] flex flex-col">
      <div className="shadow-md bg-white/80 backdrop-blur-md">
        <div className="max-w-[80rem] mx-auto px-4 sm:px-6 lg:px-0">
          <div className="flex justify-between items-center py-3 gap-3">
            <a href="https://wono.co">
              <img src={logo} alt="wono" className="w-28 sm:w-36 h-auto" />
            </a>
            <button
              type="button"
              onClick={() => (window.location.href = "https://nomad.wono.co")}
              className="relative pb-1 transition-all duration-300 group font-bold bg-transparent uppercase border-none text-[11px] sm:text-[13px] whitespace-nowrap"
            >
              Become a nomad
              <span className="absolute left-0 w-0 bottom-0 block h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-full" />
            </button>
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
                <span className="text-sm font-bold text-[#233552]">Workspace</span>
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
                <span className="text-sm font-bold text-[#233552]">Set Up Modules</span>
                <span className="text-[11px] text-[#9aa8bc] font-semibold">Next</span>
              </div>
            </div>

            <div className="hidden md:block flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#c8cfda] bg-transparent text-[#c8cfda] text-sm font-bold flex items-center justify-center">
                3
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
              Create your workspace
            </h1>
          <p className="text-sm md:text-[15px] text-[#63738d]">
            Start with the main identity of your workspace. You can still refine and
            expand it after setup.
          </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isWorkspaceFormComplete) {
                return;
              }
              navigate("/create-workspace/modules", {
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
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                  Business Name
                </label>
                <input
                  type="text"
                  placeholder="Enter business name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={Boolean(activeInviteOnboarding?.businessName)}
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
                  disabled={isCountriesLoading}
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
                      },
                      "& .MuiOutlinedInput-input": {
                        padding: "4px 8px",
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
                disabled={!country || isStatesLoading}
                className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:bg-[#eef1f5] disabled:text-[#8d99ad]"
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
                disabled={!country || !stateName || isCitiesLoading}
                className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:bg-[#eef1f5] disabled:text-[#8d99ad]"
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
                Business Type
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsBusinessTypeOpen((prev) => !prev)}
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
                      {allBusinessTypes.map((type) => (
                        <label
                          key={type}
                          className="inline-flex items-center gap-2 text-[13px] text-[#334155] cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={businessTypes.includes(type)}
                            onChange={() => toggleBusinessType(type)}
                            className="h-3.5 w-3.5 accent-[#7d9de8]"
                          />
                          <span>{type}</span>
                        </label>
                      ))}
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
