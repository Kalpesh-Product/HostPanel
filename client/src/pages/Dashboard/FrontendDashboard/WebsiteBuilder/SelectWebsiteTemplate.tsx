import React, { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageFrame from "../../../../components/Pages/PageFrame";
import {
  TEMPLATE_REGISTRY,
  DEFAULT_TEMPLATE_ID,
  getRecommendedTemplateIds,
} from "./templates/templateRegistry";
import { buildDemoPreviewDraft } from "./templates/demoPreviewData";
import {
  SERVICE_CHOICES,
  readSelectedServices,
  serviceNameToKind,
  writeSelectedServices,
} from "./templates/serviceChoices";
import { KIND_LABEL } from "./templates/verticalProfiles";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";
const SELECTED_TEMPLATE_STORAGE_KEY = "selectedThemeVariant";

// Shown once, right after "Create Website" is clicked, before the actual
// builder form. The choice made here is written to selectedThemeVariant in
// localStorage, consumed once by CreateWebsite.tsx, and from then on is
// permanent — there is no control to change it from inside the builder.
//
// The business also says which services it offers (multi-select). That drives the
// recommended templates, the sample content in "Preview", and which service pages
// the builder starts with.
const SelectWebsiteTemplate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [services, setServices] = useState<string[]>(readSelectedServices);
  // Seed from any in-progress selection so navigating away (e.g. browser
  // back) and returning to this page doesn't silently reset the pick back
  // to the default template.
  const [selectedId, setSelectedId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(SELECTED_TEMPLATE_STORAGE_KEY) || "";
      return stored && TEMPLATE_REGISTRY[stored] ? stored : DEFAULT_TEMPLATE_ID;
    } catch {
      return DEFAULT_TEMPLATE_ID;
    }
  });
  // Once the person clicks a card themselves, changing the services no longer moves the selection.
  const pickedManually = useRef(false);

  const kinds = useMemo(() => services.map(serviceNameToKind), [services]);
  const recommendedIds = useMemo(() => getRecommendedTemplateIds(kinds), [kinds]);

  const builderBasePath = location.pathname.includes("/key-apps/website-builder")
    ? "/key-apps/website-builder"
    : "/dashboard/website-builder";

  const handlePreview = (templateId: string) => {
    const draft = buildDemoPreviewDraft(templateId, services);
    localStorage.setItem(LIVE_PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    window.open("/website-preview", "_blank", "noopener,noreferrer");
  };

  const selectTemplate = (templateId: string) => {
    setSelectedId(templateId);
    try {
      localStorage.setItem(SELECTED_TEMPLATE_STORAGE_KEY, templateId);
    } catch {
      // ignore
    }
  };

  const toggleService = (name: string) => {
    const next = services.includes(name) ? services.filter((s) => s !== name) : [...services, name];
    setServices(next);
    writeSelectedServices(next);
    if (!pickedManually.current) {
      const nextRecommended = getRecommendedTemplateIds(next.map(serviceNameToKind));
      selectTemplate(nextRecommended[0] || DEFAULT_TEMPLATE_ID);
    }
  };

  const handleContinue = () => {
    localStorage.setItem(SELECTED_TEMPLATE_STORAGE_KEY, selectedId);
    writeSelectedServices(services);
    navigate(`${builderBasePath}/dynamic/create-website`);
  };

  const templates = Object.values(TEMPLATE_REGISTRY)
    .filter((template) => !template.hidden)
    .map((template, index) => ({ template, index }))
    .sort((a, b) => {
      const rank = (id: string) => {
        const at = recommendedIds.indexOf(id);
        return at === -1 ? recommendedIds.length : at;
      };
      return rank(a.template.id) - rank(b.template.id) || a.index - b.index;
    })
    .map(({ template }) => template);

  return (
    <div className="p-4 flex flex-col gap-4">
      <PageFrame>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-title font-pmedium text-primary uppercase">Choose a Template</h2>
            <p className="mt-1 text-xs text-slate-500">
              Pick the visual style for your website. Preview each one with sample content before deciding —
              once you continue, the template can't be changed later.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-sm font-semibold text-slate-800">What does your business offer?</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Select everything that applies. We'll recommend the best-fitting templates and start your website
              with those service pages. You can add more later.
            </p>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Services you offer">
              {SERVICE_CHOICES.map((choice) => {
                const active = services.includes(choice.name);
                return (
                  <button
                    key={choice.name}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleService(choice.name)}
                    className={`rounded-full border px-4 py-2 text-left text-xs font-semibold transition ${
                      active
                        ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {choice.name}
                    <span className={`ml-2 font-normal ${active ? "text-blue-100" : "text-slate-400"}`}>
                      {choice.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((template) => {
              const isSelected = selectedId === template.id;
              const matchedKind = template.recommendedFor?.find((kind) => kinds.includes(kind));
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    pickedManually.current = true;
                    selectTemplate(template.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pickedManually.current = true;
                      selectTemplate(template.id);
                    }
                  }}
                  className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    isSelected ? "border-[#2563EB] ring-2 ring-[#2563EB]" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* CSS swatch thumbnail — representative colors/type, not a real screenshot */}
                  <div
                    className="flex h-32 flex-col justify-between p-4"
                    style={{ backgroundColor: template.swatch.bg, color: template.swatch.fg, fontFamily: template.swatch.font }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-2 w-10 rounded-full" style={{ backgroundColor: template.swatch.accent }} />
                      {matchedKind ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
                          Recommended for your {KIND_LABEL[matchedKind]}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <div className="h-2 w-3/4 rounded-full bg-current opacity-70" />
                      <div className="mt-2 h-2 w-1/2 rounded-full bg-current opacity-40" />
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span className="text-sm font-semibold text-slate-800">
                      {template.name}
                      {isSelected ? (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-[#2563EB]">
                          Selected
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-slate-500">{template.description}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(template.id);
                      }}
                      className="mt-auto self-start text-xs font-semibold text-[#2563EB] underline underline-offset-2 hover:text-blue-700"
                    >
                      Preview with sample content →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Continue with {TEMPLATE_REGISTRY[selectedId]?.name || "this template"}
            </button>
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

export default SelectWebsiteTemplate;
