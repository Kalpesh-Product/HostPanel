// @ts-nocheck
import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import WebsiteFormField from "../../../../components/WebsiteFormField";
import { CheckboxField } from "./ItemExtraFields";
import { TEMPLATE_CONTENT, emptyTemplateContent } from "./templates/templateContent";

// Wording, photo picks and steps for the newer templates. Everything here is optional: an empty
// box means "use the template's own wording", which is shown greyed as the placeholder. The
// result is stored on the site as `templateContent` (see templates/templateContent.ts).

const urlOf = (item) => (typeof item === "string" ? item : item?.url || "");

// Only photos that are already saved (they have a real address) can be picked; a picture that was
// just chosen from the computer becomes pickable after the next save.
const savedPhotos = (lists) => {
  const seen = new Set();
  lists.forEach((list) =>
    (Array.isArray(list) ? list : []).forEach((item) => {
      const url = urlOf(item);
      if (/^https?:\/\//i.test(url) && item?.enabled !== false) seen.add(url);
    }),
  );
  return Array.from(seen);
};

const PhotoPicker = ({ value, photos, onChange, label }) => (
  <div className="rounded-lg border border-borderGray px-3 py-3">
    <p className="mb-2 text-sm font-pmedium">{label}</p>
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("")}
        aria-pressed={!value}
        className={`rounded-lg border px-3 py-2 text-xs font-pmedium ${
          !value ? "border-[#2563EB] bg-blue-50 text-[#2563EB]" : "border-borderGray text-slate-600 hover:border-slate-400"
        }`}
      >
        Automatic
      </button>
      {photos.map((url) => (
        <button
          key={url}
          type="button"
          onClick={() => onChange(url)}
          aria-label="Use this photo"
          aria-pressed={value === url}
          className={`h-12 w-[72px] overflow-hidden rounded-lg border-2 ${value === url ? "border-[#2563EB]" : "border-transparent hover:border-slate-300"}`}
        >
          <img src={url} alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
    {!photos.length ? <p className="mt-2 text-xs text-slate-500">Add photos to your gallery and save, then choose from them here.</p> : null}
  </div>
);

const StepsEditor = ({ def, steps, photos, onChange }) => {
  const update = (index, patch) => onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  return (
    <div className="rounded-xl border border-borderGray p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-pmedium">{def.label}</span>
        {steps.length ? (
          <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-[#2563EB] hover:underline">
            Use the standard steps
          </button>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-slate-500">{def.hint}</p>
      {!steps.length ? (
        <ol className="mb-3 list-decimal space-y-1 pl-5 text-xs text-slate-500">
          {def.defaults.map((step) => (
            <li key={step.title}>
              <strong className="font-pmedium text-slate-600">{step.title}.</strong> {step.body}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex flex-col gap-3">
        {steps.map((step, index) => (
          <div key={index} className="rounded-lg border border-borderGray p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-pmedium text-slate-500">Step {index + 1}</span>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-slate-500 disabled:opacity-30">
                  Move up
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} className="text-slate-500 disabled:opacity-30">
                  Move down
                </button>
                <button type="button" onClick={() => onChange(steps.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700">
                  Remove
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <WebsiteFormField label="Title" placeholder="e.g. Book a visit" maxLength={80} value={step.title} onChange={(e) => update(index, { title: e.target.value })} />
              <WebsiteFormField label="Short description" placeholder="One or two sentences" multiline minRows={2} maxLength={300} value={step.body} onChange={(e) => update(index, { body: e.target.value })} />
              {def.withImage ? <PhotoPicker label="Photo" value={step.image} photos={photos} onChange={(url) => update(index, { image: url })} /> : null}
            </div>
          </div>
        ))}
      </div>
      {steps.length < def.max ? (
        <button
          type="button"
          onClick={() => onChange([...steps, { title: "", body: "", image: "" }])}
          className="mt-3 text-sm font-semibold text-[#2563EB] hover:underline"
        >
          + Add a step
        </button>
      ) : null}
    </div>
  );
};

const TemplateContentPanel = ({ control, templateId }) => {
  const def = TEMPLATE_CONTENT[String(templateId || "").trim()];
  const [open, setOpen] = useState(false);
  const [gallery, heroImages, aboutPageImages] = useWatch({ control, name: ["gallery", "heroImages", "aboutPageImages"] });
  const photos = savedPhotos([gallery, heroImages, aboutPageImages]);
  if (!def) return null;

  const groups = Array.from(new Set(def.slots.map((slot) => slot.group)));

  return (
    <Controller
      name="templateContent"
      control={control}
      defaultValue={emptyTemplateContent()}
      render={({ field }) => {
        const value = { ...emptyTemplateContent(), ...(field.value || {}) };
        const set = (patch) => field.onChange({ ...value, ...patch });
        const setCopy = (key, text) => set({ copy: { ...value.copy, [key]: text } });
        const setImage = (key, url) => set({ images: { ...value.images, [key]: url } });
        const edited =
          Object.values(value.copy).filter((text) => String(text || "").trim()).length +
          Object.values(value.images).filter(Boolean).length +
          value.steps.length;

        return (
          <div className="col-span-2 mb-2" data-tour="wb-editor-template-content">
            <div className="py-4 border-b-default border-borderGray flex flex-wrap items-center justify-between gap-2">
              <span className="text-subtitle font-pmedium">Text &amp; Photos for this template</span>
              <div className="flex items-center gap-4">
                {edited ? (
                  <button type="button" onClick={() => field.onChange(emptyTemplateContent())} className="text-xs font-semibold text-[#2563EB] hover:underline">
                    Reset all to default
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Using template wording</span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  className="rounded-lg border border-borderGray px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-400"
                >
                  {open ? "Hide" : edited ? `Edit (${edited} changed)` : "Edit"}
                </button>
              </div>
            </div>

            {open ? (
              <div className="flex flex-col gap-5 p-4">
                <p className="text-xs text-slate-500">
                  Change the headings, lines and photos this template uses. Leave a box empty to keep the wording shown inside it.
                </p>

                {def.switches.length ? (
                  <div className="rounded-xl border border-borderGray p-4">
                    <p className="mb-2 text-sm font-pmedium">Sections</p>
                    <div className="flex flex-col gap-1">
                      {def.switches.map((item) => (
                        <Controller
                          key={item.key}
                          name={`sectionOverrides.${item.key}`}
                          control={control}
                          render={({ field: toggle }) => (
                            <CheckboxField field={{ value: toggle.value !== false, onChange: (checked) => toggle.onChange(checked) }} label={item.label} />
                          )}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {groups.map((group) => (
                  <div key={group} className="rounded-xl border border-borderGray p-4">
                    <p className="mb-3 text-sm font-pmedium">{group}</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {def.slots
                        .filter((slot) => slot.group === group)
                        .map((slot) =>
                          slot.type === "image" ? (
                            <PhotoPicker key={slot.key} label={slot.label} value={value.images[slot.key] || ""} photos={photos} onChange={(url) => setImage(slot.key, url)} />
                          ) : (
                            <WebsiteFormField
                              key={slot.key}
                              label={slot.label}
                              placeholder={slot.placeholder}
                              helperText={slot.hint}
                              value={value.copy[slot.key] || ""}
                              onChange={(e) => setCopy(slot.key, e.target.value)}
                              maxLength={300}
                            />
                          ),
                        )}
                    </div>
                  </div>
                ))}

                {def.steps ? <StepsEditor def={def.steps} steps={value.steps} photos={photos} onChange={(steps) => set({ steps })} /> : null}
              </div>
            ) : null}
          </div>
        );
      }}
    />
  );
};

export default TemplateContentPanel;
