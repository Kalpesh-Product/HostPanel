import React from "react";
import { DEFAULT_TEMPLATE_ID, TEMPLATE_REGISTRY } from "./templates/templateRegistry";

export type TemplateAvailability = {
  templateId: string;
  enabled: boolean;
  visible: boolean;
  allowedPlans?: string[];
  allowedForPlan?: boolean;
  disabledReason?: string;
};

type TemplatePickerGridProps = {
  selectedId: string;
  currentId?: string;
  availability?: TemplateAvailability[];
  onSelect: (templateId: string) => void;
  onPreview: (templateId: string) => void;
};

const TemplatePickerGrid = ({
  selectedId,
  currentId = "",
  availability,
  onSelect,
  onPreview,
}: TemplatePickerGridProps) => {
  const availabilityMap = new Map(
    (availability || []).map((item) => [String(item.templateId || "").trim(), item]),
  );

  const visibleTemplates = Object.values(TEMPLATE_REGISTRY)
    .filter((template) => {
      const rule = availabilityMap.get(template.id);
      if (rule) return rule.visible !== false;
      return !template.hidden;
    })
    .map((template, originalIndex) => ({ template, originalIndex }))
    .sort((left, right) => {
      const getRank = (templateId: string) => {
        if (templateId === (currentId || DEFAULT_TEMPLATE_ID)) return 0;
        const rule = availabilityMap.get(templateId);
        if (rule?.enabled === false) return 3;
        if (rule?.allowedForPlan === false) return 2;
        return 1;
      };

      return getRank(left.template.id) - getRank(right.template.id) || left.originalIndex - right.originalIndex;
    })
    .map(({ template }) => template);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleTemplates
        .map((template) => {
          const rule = availabilityMap.get(template.id);
          const isCurrent = template.id === (currentId || DEFAULT_TEMPLATE_ID);
          const isSelected = selectedId === template.id;
          const isPlanLocked = rule?.allowedForPlan === false;
          const isComingSoon = rule?.enabled === false;
          const isDisabled = isCurrent || isComingSoon || isPlanLocked;
          const stateLabel = isCurrent
            ? "Current template"
            : isSelected
              ? "Selected"
              : isPlanLocked
                ? "Plan locked"
                : isComingSoon
                  ? "Coming soon"
                  : "";

          const cardStateClass = isCurrent
            ? "cursor-default border-emerald-500 ring-2 ring-emerald-100 shadow-sm"
            : isSelected
              ? "cursor-pointer border-[#2563EB] ring-2 ring-[#2563EB] shadow-md"
              : isPlanLocked
                ? "cursor-not-allowed border-rose-300 bg-rose-50/40 shadow-sm"
                : isComingSoon
                  ? "cursor-not-allowed border-amber-300 bg-amber-50/40 shadow-sm"
                  : "cursor-pointer border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";

          const badgeStateClass = isCurrent
            ? "bg-emerald-600 text-white ring-2 ring-white/70"
            : isSelected
              ? "bg-[#2563EB] text-white ring-2 ring-white/70"
              : isPlanLocked
                ? "bg-rose-600 text-white ring-2 ring-white/70"
                : isComingSoon
                  ? "bg-amber-500 text-white ring-2 ring-white/70"
                : "bg-white/90 text-slate-700";

          return (
            <div
              key={template.id}
              role="button"
              tabIndex={isDisabled ? -1 : 0}
              aria-disabled={isDisabled}
              aria-pressed={isSelected}
              onClick={() => {
                if (!isDisabled) onSelect(template.id);
              }}
              onKeyDown={(event) => {
                if (!isDisabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelect(template.id);
                }
              }}
              className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white transition-all duration-200 ${cardStateClass}`}
            >
              <div
                className="flex h-32 flex-col justify-between p-4"
                style={{
                  backgroundColor: template.swatch.bg,
                  color: template.swatch.fg,
                  fontFamily: template.swatch.font,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="h-2 w-10 rounded-full"
                    style={{ backgroundColor: template.swatch.accent }}
                  />
                  {stateLabel ? (
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-pmedium uppercase tracking-wide shadow-sm ${badgeStateClass}`}>
                      {stateLabel}
                    </span>
                  ) : null}
                </div>
                <div>
                  <div className="h-2 w-3/4 rounded-full bg-current opacity-70" />
                  <div className="mt-2 h-2 w-1/2 rounded-full bg-current opacity-40" />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-800">{template.name}</span>
                  {isCurrent ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500 ring-4 ring-emerald-100" aria-label="Current template" />
                  ) : null}
                </div>
                <span className="text-xs leading-5 text-slate-500">{template.description}</span>
                {isComingSoon ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    {rule?.disabledReason && rule.disabledReason !== "Coming soon"
                      ? `Coming soon — ${rule.disabledReason}`
                      : "Coming soon — not available yet"}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreview(template.id);
                  }}
                  className="mt-auto self-start text-xs font-semibold text-[#2563EB] underline underline-offset-2 transition-colors hover:text-blue-700"
                >
                  Preview with sample content →
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default TemplatePickerGrid;
