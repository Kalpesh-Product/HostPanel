import React, { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import Footer from "../components/Footer";
import logo from "../assets/WONO_LOGO_Black_TP.png";
import { toast } from "sonner";
import { getCities, getCountries, getStates } from "../utils/locationApi";

const CreateWorkspacePage: React.FC = () => {
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [businessTypes, setBusinessTypes] = useState<string[]>([]);
  const [isBusinessTypeOpen, setIsBusinessTypeOpen] = useState(false);

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

  useEffect(() => {
    let active = true;
    const loadCountries = async () => {
      try {
        setIsCountriesLoading(true);
        const result = await getCountries();
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
        setStateName("");
        setCities([]);
        setCity("");
        const result = await getStates(country);
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
  }, [country]);

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
        setCity("");
        const result = await getCities(country, stateName);
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
  }, [country, stateName]);

  return (
    <div className="min-h-screen bg-[#f4f4f4] text-[#0f172a] font-['Poppins'] flex flex-col">
      <div className="shadow-md bg-white/80 backdrop-blur-md">
        <div className="max-w-[80rem] mx-auto px-6 lg:px-0">
          <div className="flex justify-between items-center py-3">
            <a href="https://wono.co">
              <img src={logo} alt="wono" className="w-36 h-10" />
            </a>
            <button
              type="button"
              onClick={() => (window.location.href = "https://nomad.wono.co")}
              className="relative pb-1 transition-all duration-300 group font-bold bg-transparent uppercase border-none"
            >
              Become a nomad
              <span className="absolute left-0 w-0 bottom-0 block h-[2px] bg-blue-500 transition-all duration-300 group-hover:w-full" />
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 md:pt-12 pb-12">
        <div className="w-full max-w-[900px] mx-auto">
          <div className="mb-10">
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#8da0bd] uppercase mb-4">
            Progress
          </p>
          <div className="flex items-center w-full">
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

            <div className="flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-[#c8cfda] bg-transparent text-[#c8cfda] text-sm font-bold flex items-center justify-center">
                2
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-[#233552]">Set Up Modules</span>
                <span className="text-[11px] text-[#9aa8bc] font-semibold">Next</span>
              </div>
            </div>

            <div className="flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

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

          <div className="text-center mb-7">
            <h1 className="text-[30px] md:text-[38px] font-bold text-[#111b33] mb-4">
              Create your workspace
            </h1>
          <p className="text-sm md:text-[15px] text-[#63738d]">
            Start with the main identity of your workspace. You can still refine and
            expand it after setup.
          </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
              <div className="flex flex-col">
                <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  placeholder="Enter Unique workspace name"
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
                  className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] placeholder:text-[#9aa6b9] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff]"
                />
              </div>
            </div>
            <p className="text-[13px] text-[#63738d] mt-3">
              This is the main name your members will see throughout the platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
            <div className="flex flex-col">
              <label className="text-[10px] md:text-xs font-bold tracking-[0.16em] uppercase text-[#3d4d67] mb-2">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isCountriesLoading}
                className="w-full h-[42px] rounded-xl border border-[#d2d9e5] bg-[#f2f4f8] px-3.5 text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#bcd0ff] disabled:bg-[#eef1f5] disabled:text-[#8d99ad]"
              >
                <option value="">
                  {isCountriesLoading ? "Loading countries..." : "Select country"}
                </option>
                {countries.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
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
                  <option key={item} value={item}>
                    {item}
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
                  <option key={item} value={item}>
                    {item}
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
              className="h-10 px-7 rounded-xl bg-[#8aa9ef] hover:bg-[#7d9de8] transition-colors text-white text-[13px] font-semibold inline-flex items-center gap-2"
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
