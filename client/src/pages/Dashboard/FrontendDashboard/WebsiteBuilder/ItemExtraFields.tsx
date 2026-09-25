// @ts-nocheck
import { useEffect, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import WebsiteFormField from "../../../../components/WebsiteFormField";
import { DESCRIPTION_LIMITS, getOfferingFields } from "./templates/offeringFields";

// Comma-separated list input that stores string[] in the form. Keeps the raw text
// locally so typing "a, " doesn't get collapsed while the user is mid-entry.
export const ListInput = ({ field, label, placeholder }) => {
  const joined = Array.isArray(field.value) ? field.value.join(", ") : String(field.value || "");
  const [text, setText] = useState(joined);
  // Re-sync when the form value is replaced from outside (e.g. hydration/reset),
  // but not while the user is typing (their text already parses to the same list).
  useEffect(() => {
    const parsed = text.split(/[\n,]/).map((part) => part.trim()).filter(Boolean).join(", ");
    if (parsed !== joined) setText(joined);
  }, [joined]);
  return (
    <WebsiteFormField
      label={label}
      placeholder={placeholder}
      value={text}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        field.onChange(
          next
            .split(/[\n,]/)
            .map((part) => part.trim())
            .filter(Boolean),
        );
      }}
    />
  );
};

// Pick-from-suggestions list stored as string[]: tap a suggestion to add it, or type your
// own and press Enter. Selected items show as removable chips.
export const ChipPicker = ({ field, label, suggestions = [], placeholder = "Add your own" }) => {
  const value = Array.isArray(field.value) ? field.value.map(String) : [];
  const [text, setText] = useState("");
  const has = (item) => value.some((entry) => entry.toLowerCase() === item.toLowerCase());
  const add = (raw) => {
    const item = String(raw || "").trim().replace(/,$/, "").trim();
    if (!item || has(item)) return;
    field.onChange([...value, item]);
  };
  const remove = (item) => field.onChange(value.filter((entry) => entry !== item));
  const open = suggestions.filter((item) => !has(item));
  return (
    <div className="md:col-span-2">
      <span className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">{label}</span>
      <div className="mt-1 rounded-xl border border-slate-200/60 bg-white p-3">
        {value.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {value.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-[#2563EB] px-3 py-1 text-xs font-semibold text-white">
                {item}
                <button type="button" aria-label={"Remove " + item} onClick={() => remove(item)} className="leading-none opacity-80 hover:opacity-100">
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="mb-3 text-xs text-slate-400">Nothing selected yet.</p>
        )}
        {open.length ? (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] text-slate-500">Tap to add</p>
            <div className="flex flex-wrap gap-2">
              {open.map((item) => (
                <button key={item} type="button" onClick={() => add(item)} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[#2563EB] hover:text-[#2563EB]">
                  + {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="flex gap-2">
          <input
            value={text}
            placeholder={placeholder}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add(text);
                setText("");
              }
            }}
            className="min-w-0 flex-1 rounded-lg border border-slate-200/60 px-3 py-2 text-[13px] outline-none focus:border-[#2563EB]"
          />
          <button
            type="button"
            onClick={() => {
              add(text);
              setText("");
            }}
            className="rounded-lg border border-slate-200 px-4 text-xs font-semibold text-slate-700 hover:border-[#2563EB] hover:text-[#2563EB]"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// Description with a length limit and a live counter. Spans the full row so there's room to write.
export const OfferingDescription = ({ control, register, name, kind = "offering", label = "Description", rows = 4 }) => {
  const limit = kind === "menu" ? DESCRIPTION_LIMITS.menu : DESCRIPTION_LIMITS.offering;
  const value = useWatch({ control, name });
  const length = String(value || "").length;
  return (
    <div className="md:col-span-2">
      <WebsiteFormField
        label={label}
        multiline
        minRows={rows}
        maxLength={limit}
        registration={register(name)}
        helperText={length + "/" + limit + " characters" + (length > limit * 0.9 ? " — nearly full" : "")}
      />
    </div>
  );
};

export const CheckboxField = ({ field, label }) => (
  <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-[13px] font-pmedium text-slate-700">
    <input
      type="checkbox"
      checked={field.value === true || field.value === "true"}
      onChange={(event) => field.onChange(event.target.checked)}
      className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
    />
    {label}
  </label>
);

// Renders the optional vertical-specific fields for one offering item inside a
// collapsed section, so the existing forms stay short for people who don't need it.
const ItemExtraFields = ({ control, register, name, kind }) => (
  <details className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/40 px-4 py-3">
    <summary className="cursor-pointer select-none text-[12px] font-pmedium text-slate-600">
      More details — badges, tags &amp; specifics (optional)
    </summary>
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      {getOfferingFields(kind).map((def) => {
        const path = `${name}.${def.key}`;
        if (def.type === "boolean") {
          return (
            <Controller
              key={def.key}
              name={path}
              control={control}
              render={({ field }) => <CheckboxField field={field} label={def.label} />}
            />
          );
        }
        if (def.type === "list") {
          return (
            <Controller
              key={def.key}
              name={path}
              control={control}
              render={({ field }) => (
                <ChipPicker field={field} label={def.label} placeholder={def.placeholder} suggestions={def.suggestions || []} />
              )}
            />
          );
        }
        if (def.type === "select") {
          return (
            <WebsiteFormField key={def.key} label={def.label} select registration={register(path)}>
              <option value="">Not specified</option>
              {def.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </WebsiteFormField>
          );
        }
        return (
          <WebsiteFormField
            key={def.key}
            label={def.label}
            type={def.type}
            placeholder={def.placeholder}
            registration={register(path, def.type === "number" ? { valueAsNumber: true } : undefined)}
          />
        );
      })}
    </div>
  </details>
);

export default ItemExtraFields;
