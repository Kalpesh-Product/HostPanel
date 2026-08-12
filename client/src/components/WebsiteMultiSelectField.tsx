import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// Multi-select checkbox dropdown styled to match WebsiteFormField (label
// above a bordered box) instead of MUI's Select-with-floating-label, which
// visually didn't line up with the rest of a form's plain labeled fields.
interface WebsiteMultiSelectFieldProps {
  label?: string;
  value?: string[];
  onChange: (value: string[]) => void;
  options: string[];
  disabled?: boolean;
  placeholder?: string;
  helperText?: ReactNode;
}

const WebsiteMultiSelectField = ({
  label,
  value = [],
  onChange,
  options,
  disabled,
  placeholder = "Select...",
  helperText,
}: WebsiteMultiSelectFieldProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div ref={containerRef} className="relative flex min-w-0 flex-1 flex-col">
      {label ? (
        <label className="text-[10px] font-pmedium text-slate-500 uppercase tracking-widest">
          {label}
        </label>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200/60 bg-white px-3.5 py-2.5 text-left text-[13px] font-pmedium text-[#0F172A] outline-none transition-all focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={`truncate ${value.length ? "text-[#0F172A]" : "text-slate-400"}`}>
          {value.length ? value.join(", ") : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && !disabled ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[12px] font-pmedium text-slate-400">
              No options available.
            </p>
          ) : (
            options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-pmedium text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => toggleOption(option)}
                  className="h-4 w-4 rounded border-slate-300 accent-[#2563EB]"
                />
                {option}
              </label>
            ))
          )}
        </div>
      ) : null}
      {helperText ? (
        <span className="mt-1 text-[10px] font-medium text-slate-400">{helperText}</span>
      ) : null}
    </div>
  );
};

export default WebsiteMultiSelectField;
