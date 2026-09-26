import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageFrame from "../../../../components/Pages/PageFrame";
import useAxiosPrivate from "../../../../hooks/useAxiosPrivate";
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

const LIVE_PREVIEW_DRAFT_STORAGE_KEY = "website_builder_live_preview_draft";
const SELECTED_TEMPLATE_STORAGE_KEY = "selectedThemeVariant";

// Shown once, right after "Create Website" is clicked, before the actual
// builder form. The choice made here is written to selectedThemeVariant in
// localStorage, consumed once by CreateWebsite.tsx, and from then on is
// permanent — there is no control to change it from inside the builder.
//
// The business first names its MAIN business (single choice), then optionally the
// other services it offers. The main business decides which template is recommended
// and comes first in the sample content; the full list (main first) is stored and
// seeds the builder's service pages.
export const TemplatePicker = ({ onClose }: { onClose?: () => void }) => {
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

  // services[0] is the main business, the rest are the extras.
  const main = services[0] || "";
  const extras = services.slice(1);
  const mainKind = main ? serviceNameToKind(main) : null;
  const kinds = useMemo(() => services.map(serviceNameToKind), [services]);

  // Templates the admin has hidden or switched off (Master Panel > website templates). If the
  // lookup fails, every template stays available.
  const axios = useAxiosPrivate();
  const [availability, setAvailability] = useState<Record<string, { enabled: boolean; visible: boolean; disabledReason: string }>>({});
  useEffect(() => {
    let active = true;
    axios
      .get("/api/editor/template-change/availability")
      .then((response: any) => {
        if (!active) return;
        const next: Record<string, { enabled: boolean; visible: boolean; disabledReason: string }> = {};
        (response?.data?.templates || []).forEach((row: any) => {
          next[String(row?.templateId || "").trim().toLowerCase()] = {
            enabled: row?.enabled === true,
            visible: row?.visible !== false,
            disabledReason: String(row?.disabledReason || "").trim() || "Coming soon",
          };
        });
        setAvailability(next);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [axios]);
  const isHidden = (id: string) => availability[id]?.visible === false;
  const isPickable = (id: string) => !isHidden(id) && availability[id]?.enabled !== false;

  const recommendedIds = useMemo(
    () => getRecommendedTemplateIds(kinds).filter((id) => !isHidden(id) && availability[id]?.enabled !== false),
    [kinds, availability],
  );

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

  const applyServices = (next: string[]) => {
    setServices(next);
    writeSelectedServices(next);
    if (!pickedManually.current) {
      const nextRecommended = getRecommendedTemplateIds(next.map(serviceNameToKind)).filter(isPickable);
      selectTemplate(nextRecommended[0] || DEFAULT_TEMPLATE_ID);
    }
  };

  const chooseMain = (name: string) => {
    // The new main business leaves the extras list; the previous one is dropped.
    applyServices([name, ...extras.filter((s) => s !== name)]);
  };

  const toggleExtra = (name: string) => {
    if (!main || name === main) return;
    applyServices([main, ...(extras.includes(name) ? extras.filter((s) => s !== name) : [...extras, name])]);
  };

  const handleContinue = () => {
    localStorage.setItem(SELECTED_TEMPLATE_STORAGE_KEY, selectedId);
    writeSelectedServices(services);
    navigate(`${builderBasePath}/dynamic/create-website`);
  };

  useEffect(() => {
    if (!Object.keys(availability).length || isPickable(selectedId)) return;
    const fallback = recommendedIds[0] || (isPickable(DEFAULT_TEMPLATE_ID) ? DEFAULT_TEMPLATE_ID : Object.values(TEMPLATE_REGISTRY).find((template) => !template.hidden && isPickable(template.id))?.id);
    if (fallback) selectTemplate(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availability]);

  const templates = Object.values(TEMPLATE_REGISTRY)
    .filter((template) => !template.hidden && !isHidden(template.id))
    .map((template, index) => ({ template, index }))
    .sort((a, b) => {
      const rank = (id: string) => {
        const at = recommendedIds.indexOf(id);
        return at === -1 ? recommendedIds.length : at;
      };
      return rank(a.template.id) - rank(b.template.id) || a.index - b.index;
    })
    .map(({ template }) => template);

  // As a popup (onClose given) Escape closes it and the page behind stops scrolling.
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <>
          <div className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-800">1. What is your main business?</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Choose the one that matters most. We'll recommend the template built for it and lead your website with it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Main business">
                {SERVICE_CHOICES.map((choice) => {
                  const active = main === choice.name;
                  return (
                    <button
                      key={choice.name}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => chooseMain(choice.name)}
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

            <div className={main ? "" : "opacity-50"}>
              <p className="text-sm font-semibold text-slate-800">
                2. Anything else you offer? <span className="font-normal text-slate-400">(optional)</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                Each one gets its own service page. Every template can show them, and you can add more later.
              </p>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Other services you offer">
                {SERVICE_CHOICES.filter((choice) => choice.name !== main).map((choice) => {
                  const active = extras.includes(choice.name);
                  return (
                    <button
                      key={choice.name}
                      type="button"
                      aria-pressed={active}
                      disabled={!main}
                      onClick={() => toggleExtra(choice.name)}
                      className={`rounded-full border px-4 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed ${
                        active
                          ? "border-[#2563EB] bg-[#2563EB] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {choice.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((template) => {
              const isSelected = selectedId === template.id;
              const switchedOff = availability[template.id]?.enabled === false;
              const matchedKind = mainKind && template.recommendedFor?.includes(mainKind) ? mainKind : null;
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  aria-disabled={switchedOff}
                  onClick={() => {
                    if (switchedOff) return;
                    pickedManually.current = true;
                    selectTemplate(template.id);
                  }}
                  onKeyDown={(e) => {
                    if (switchedOff) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pickedManually.current = true;
                      selectTemplate(template.id);
                    }
                  }}
                  className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    switchedOff ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  } ${isSelected ? "border-[#2563EB] ring-2 ring-[#2563EB]" : "border-slate-200 hover:border-slate-300"}`}
                >
                  {/* CSS swatch thumbnail — representative colors/type, not a real screenshot */}
                  <div
                    className="flex h-32 flex-col justify-between p-4"
                    style={{ backgroundColor: template.swatch.bg, color: template.swatch.fg, fontFamily: template.swatch.font }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-2 w-10 rounded-full" style={{ backgroundColor: template.swatch.accent }} />
                      {switchedOff ? (
                        <span className="rounded-full bg-slate-700 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
                          {availability[template.id]?.disabledReason || "Coming soon"}
                        </span>
                      ) : matchedKind ? (
                        <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-white shadow-sm">
                          Recommended for your {main}
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
    </>
  );
  const ctaLabel = TEMPLATE_REGISTRY[selectedId]?.name || "this template";

  if (onClose) {
    return (
      <div
        className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="select-template-title"
          className="flex h-full w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 id="select-template-title" className="text-title font-pmedium text-primary uppercase">Choose a Template</h2>
              <p className="mt-1 text-xs text-slate-500">
                Pick the visual style for your website. Preview each one with sample content before deciding —
                once you get started, the template can't be changed later.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              ×
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">{content}</div>
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!isPickable(selectedId)}
              className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Get started with {ctaLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          {content}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!isPickable(selectedId)}
              className="rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue with {ctaLabel}
            </button>
          </div>
        </div>
      </PageFrame>
    </div>
  );
};

/** The full-page version, kept for direct links to /select-template. */
const SelectWebsiteTemplate = () => <TemplatePicker />;

export default SelectWebsiteTemplate;
