import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { contrastRatio, normalizeHex } from "./templates/emeraldTheme";
import { getThemeDefaults, resolveThemeColors } from "./templates/templateTheme";

const FIELDS: Array<{
  key: "bgColor" | "textColor" | "accentColor";
  label: string;
  help: string;
}> = [
  { key: "bgColor", label: "Background colour", help: "Main page background" },
  { key: "textColor", label: "Text colour", help: "Headings and body text" },
  {
    key: "accentColor",
    label: "Button / accent colour",
    help: "Buttons, links and highlights",
  },
];

const ColorRow = ({
  label,
  help,
  value,
  fallback,
  onCommit,
}: {
  label: string;
  help: string;
  value: string;
  fallback: string;
  onCommit: (hex: string) => void;
}) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-borderGray px-3 py-2">
      <input
        type="color"
        aria-label={label}
        value={normalizeHex(value) || fallback}
        onChange={(e) => onCommit(e.target.value)}
        className="h-9 w-12 cursor-pointer rounded border border-borderGray bg-transparent p-0.5"
      />
      <div className="min-w-[160px] flex-1">
        <p className="text-sm font-pmedium">{label}</p>
        <p className="text-xs text-slate-500">{help}</p>
      </div>
      <input
        type="text"
        value={text}
        placeholder={fallback}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => {
          const next = e.target.value.trim();
          setText(next);
          if (next === "") onCommit("");
          else if (normalizeHex(next)) onCommit(normalizeHex(next));
        }}
        className="w-28 rounded border border-borderGray px-2 py-1.5 text-sm font-mono"
      />
    </div>
  );
};

// Per-business colours for any template that supports them. Stored in the
// site's `styleConfig`; empty means "use the template's own default".
const ThemeColors = ({ control, templateId }: { control: any; templateId?: string }) => (
  <Controller
    name="styleConfig"
    control={control}
    defaultValue={{}}
    render={({ field }) => {
      const config = field.value || {};
      const defaults0 = getThemeDefaults(templateId);
      const { bg, text } = resolveThemeColors(templateId, config);
      const ratio = contrastRatio(text, bg);
      const accentPicked = normalizeHex(config.accentColor);
      const accentRatio = accentPicked ? contrastRatio(accentPicked, bg) : 21;
      const isCustom = FIELDS.some((f) => normalizeHex(config[f.key]));

      const setKey = (key: string, hex: string) => {
        const next = { ...config };
        if (hex) next[key] = hex;
        else delete next[key];
        field.onChange(next);
      };

      const defaults: Record<string, string> = {
        bgColor: defaults0.bg,
        textColor: defaults0.text,
        accentColor: defaults0.accent,
      };

      return (
        <div className="col-span-2 mb-2" data-tour="wb-editor-theme-colors">
          <div className="py-4 border-b-default border-borderGray flex items-center justify-between">
            <span className="text-subtitle font-pmedium">Theme Colours</span>
            {isCustom ? (
              <button
                type="button"
                onClick={() => field.onChange({})}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Reset to default
              </button>
            ) : (
              <span className="text-xs text-slate-400">Using template default</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
            {FIELDS.map((f) => (
              <ColorRow
                key={f.key}
                label={f.label}
                help={f.help}
                value={normalizeHex(config[f.key])}
                fallback={defaults[f.key]}
                onCommit={(hex) => setKey(f.key, hex)}
              />
            ))}
          </div>
          {ratio < 4.5 ? (
            <p className="px-4 pb-2 text-xs text-amber-700">
              Text may be hard to read on this background (contrast {ratio.toFixed(1)}:1). Pick colours
              that are further apart; 4.5:1 or higher is recommended.
            </p>
          ) : null}
          {accentRatio < 3 ? (
            <p className="px-4 pb-2 text-xs text-amber-700">
              The button / accent colour is close to the background (contrast {accentRatio.toFixed(1)}:1), so
              headings and buttons in that colour may be hard to see.
            </p>
          ) : null}
        </div>
      );
    }}
  />
);

export default ThemeColors;
