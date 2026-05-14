import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Check,
  CircleDollarSign,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/WONO_LOGO_Black_TP.png";
import Footer from "../../components/Footer";

type ModuleItem = {
  name: string;
  active: boolean;
};

type ModuleCategory = {
  category: string;
  items: ModuleItem[];
};

const Toggle: React.FC<{
  active: boolean;
  onChange?: () => void;
  disabled?: boolean;
}> = ({ active, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors shrink-0 ${
      active ? "bg-[#2d67f0]" : "bg-[#c6d1de]"
    } ${disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}
  >
    <span
      className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
        active ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const SetupModulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [showConfigure, setShowConfigure] = useState(true);
  const [modules, setModules] = useState<ModuleCategory[]>([
    {
      category: "STATIC WEBSITE",
      items: [
        { name: "Website builder", active: true },
        { name: "Website Leads", active: true },
      ],
    },
    {
      category: "ADMIN CONTROL PANEL",
      items: [
        { name: "Admin Dashboard", active: false },
        { name: "Nomad Listings", active: false },
        { name: "Access Control", active: false },
        { name: "Workspace Management", active: true },
      ],
    },
    {
      category: "VISITOR TRACKING SYSTEM",
      items: [
        { name: "Visitor Management", active: true },
        { name: "Visitor Reports", active: false },
      ],
    },
  ]);

  const toggleModule = (catIndex: number, itemIndex: number) => {
    setModules((prev) =>
      prev.map((cat, cIdx) =>
        cIdx !== catIndex
          ? cat
          : {
              ...cat,
              items: cat.items.map((item, iIdx) =>
                iIdx !== itemIndex ? item : { ...item, active: !item.active },
              ),
            },
      ),
    );
  };

  const activeCount = useMemo(
    () => modules.reduce((sum, cat) => sum + cat.items.filter((m) => m.active).length, 0),
    [modules],
  );

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
                <div className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center">
                    <Check size={16} strokeWidth={3} />
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#233552]">Workspace</span>
                  <span className="text-[11px] text-[#6d9bff] font-semibold">Done</span>
                </div>
              </div>

              <div className="hidden md:block flex-1 h-px bg-[#2d67f0] mx-4 md:mx-6" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dce9ff] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-[#2d67f0] text-white text-sm font-bold flex items-center justify-center">
                    2
                  </div>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#233552]">Set Up Modules</span>
                  <span className="text-[11px] text-[#6d9bff] font-semibold">
                    Current step
                  </span>
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

          <div className="mb-6 sm:mb-7">
            <h1 className="text-[26px] sm:text-[30px] md:text-[38px] font-bold text-[#111b33] mb-3 sm:mb-4">
              Set up your modules
            </h1>
            <p className="text-sm md:text-[15px] text-[#63738d] max-w-[540px]">
              Enable a department, open Configure, then toggle common, extra common,
              and core modules.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="rounded-3xl border border-[#2d67f0] bg-[#e8efff]">
              <div className="flex items-center justify-between p-3.5 md:px-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#2d67f0] text-white flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-bold text-[#111b33]">Basic</span>
                    <span className="text-[11px] text-[#6c7d96]">Current Plan</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowConfigure((prev) => !prev)}
                    className="h-7 px-3 rounded-xl border border-[#b9c9ee] bg-white text-[#2d67f0] text-[11px] sm:text-[12px] font-medium"
                  >
                    {showConfigure ? "Hide Configure" : "Show Configure"}
                  </button>
                  <Toggle active />
                </div>
              </div>

              {showConfigure && (
                <div className="bg-white mx-3 mb-3 p-3.5 rounded-2xl border border-[#e4e9f1]">
                  {modules.map((category, catIdx) => (
                    <div key={category.category} className={catIdx === 0 ? "" : "mt-5"}>
                      <h3 className="text-[11px] font-bold text-[#2d67f0] tracking-[0.14em] mb-2.5">
                        {category.category}
                      </h3>
                      <div className="space-y-1.5">
                        {category.items.map((item, itemIdx) => (
                          <div
                            key={item.name}
                            className="h-10 rounded-xl border border-[#edf1f6] bg-[#f8fafc] px-3 flex items-center justify-between"
                          >
                            <span className="text-[13px] text-[#334155] font-medium">
                              {item.name}
                            </span>
                            <Toggle
                              active={item.active}
                              onChange={() => toggleModule(catIdx, itemIdx)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[#d7dee9] bg-[#eef2f7] p-3.5 md:px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#dee5f0] text-[#6a7a92] flex items-center justify-center">
                  <Briefcase size={18} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#111b33]">Professional</span>
                  <span className="text-[11px] text-[#6c7d96]">Disabled</span>
                </div>
              </div>
              <Toggle active={false} disabled />
            </div>

            <div className="rounded-3xl border border-[#d7dee9] bg-[#eef2f7] p-3.5 md:px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#dee5f0] text-[#6a7a92] flex items-center justify-center">
                  <CircleDollarSign size={18} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-bold text-[#111b33]">Custom</span>
                  <span className="text-[11px] text-[#6c7d96]">Disabled</span>
                </div>
              </div>
              <Toggle active={false} disabled />
            </div>
          </div>

          <div className="mt-7 min-h-11 rounded-2xl sm:rounded-full border border-[#d6dde8] bg-[#eef2f7] px-4 py-2 flex items-center">
            <p className="text-[11px] sm:text-[12px] text-[#6f7f96]">
              Tip: Whatever is disabled here will not be available in the current plan.
              Active modules: {activeCount}
            </p>
          </div>

          <div className="pt-5 border-t border-[#e1e6ef] mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate("/create-workspace")}
              className="h-10 w-full sm:w-auto px-5 rounded-xl border border-[#d0d8e5] text-[#5b6b83] text-[14px] font-medium bg-transparent"
            >
              Back
            </button>
            <button
              type="button"
              className="h-10 w-full sm:w-auto px-7 rounded-xl bg-[#2d67f0] hover:bg-[#2558d5] transition-colors text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SetupModulesPage;
