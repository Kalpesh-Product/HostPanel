import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageFrame from "../../../../components/Pages/PageFrame";
import { TEMPLATE_REGISTRY, DEFAULT_TEMPLATE_ID } from "./templates/templateRegistry";
import { buildDemoPreviewDraft } from "./templates/demoPreviewData";

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";
const SELECTED_TEMPLATE_STORAGE_KEY = "selectedThemeVariant";

// Shown once, right after "Create Website" is clicked, before the actual
// builder form. The choice made here is written to selectedThemeVariant in
// localStorage, consumed once by CreateWebsite.tsx, and from then on is
// permanent — there is no control to change it from inside the builder.
const SelectWebsiteTemplate = () => {
  const navigate = useNavigate();
  const location = useLocation();
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

  const builderBasePath = location.pathname.includes("/key-apps/website-builder")
    ? "/key-apps/website-builder"
    : "/dashboard/website-builder";

  const handlePreview = (templateId: string) => {
    const draft = buildDemoPreviewDraft(templateId);
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

  const handleContinue = () => {
    localStorage.setItem(SELECTED_TEMPLATE_STORAGE_KEY, selectedId);
    navigate(`${builderBasePath}/dynamic/create-website`);
  };

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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(TEMPLATE_REGISTRY)
              .filter((template) => !template.hidden)
              .map((template) => {
              const isSelected = selectedId === template.id;
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectTemplate(template.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
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
                    <div className="h-2 w-10 rounded-full" style={{ backgroundColor: template.swatch.accent }} />
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
