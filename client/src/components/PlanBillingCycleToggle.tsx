type Props = {
  value: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
  savePercent: number;
};

// Monthly / Annual segmented toggle matching the one on wono.co's pricing page.
const PlanBillingCycleToggle = ({ value, onChange, savePercent }: Props) => {
  const pillClass = (active: boolean) =>
    `flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all ${
      active ? "bg-white text-[#0f1b35] shadow" : "text-[#60708b] hover:text-[#0f1b35]"
    }`;

  return (
    <div className="mb-4 flex justify-center">
      <div className="inline-flex items-center rounded-full bg-[#e6ecf5] p-1">
        <button type="button" onClick={() => onChange("monthly")} className={pillClass(value === "monthly")}>
          Monthly
        </button>
        <button type="button" onClick={() => onChange("annual")} className={pillClass(value === "annual")}>
          Annual
          {savePercent > 0 && (
            <span className="rounded-full bg-[#dff5ea] px-2 py-0.5 text-[10px] font-bold text-[#16b26a]">
              Save up to {savePercent}%
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default PlanBillingCycleToggle;
